"""Simula a rotina Bash EMBUTIDA no instalador PowerShell V5, sem SSH/VPS.

No checkout do repositório: python3 tests/test_retro_dashboard_installer_v5.py
Em execução isolada: RETRO_V5_SCRIPT=/caminho/arquivo.ps1 python3 ...
"""
from pathlib import Path
import hashlib
import os
import sqlite3
import stat
import subprocess
import tempfile
import unittest

HERE = Path(__file__).resolve()
SCRIPT = Path(os.environ.get('RETRO_V5_SCRIPT', HERE.parents[1] / 'ops' / 'Instalar_e_Abrir_Painel_Retro_v5.ps1'))


def extract_bash():
    source = SCRIPT.read_text(encoding='utf-8')
    assert "$remote = @'\n" in source and "\n'@" in source, 'PowerShell heredoc changed'
    shell = source.split("$remote = @'\n", 1)[1].split("\n'@", 1)[0] + '\n'
    p = subprocess.run(['bash', '-n'], input=shell, text=True, capture_output=True)
    assert p.returncode == 0, p.stderr
    return shell


def blob(path):
    b = Path(path).read_bytes()
    return hashlib.sha1(f'blob {len(b)}\0'.encode('ascii') + b).hexdigest()


class InstallerV5Tests(unittest.TestCase):
    def simulate(self, label, existing='absent', fail=False, check=False,
                 valid_db=True, bad_html=False, old_snapshot=False, symlink=False):
        with self.subTest(label=label), tempfile.TemporaryDirectory(prefix='pe-retro-v5-qa-') as folder:
            temp = Path(folder)
            root = temp / 'tools'
            root.mkdir()
            metrics = temp / 'retro-downloads' / 'metrics'
            metrics.mkdir(parents=True)
            db = metrics / 'counters.sqlite3'
            if valid_db:
                con = sqlite3.connect(db)
                con.execute('CREATE TABLE counters(x INTEGER)')
                con.execute('INSERT INTO counters(x) VALUES (1)')
                con.commit()
                con.close()
            else:
                db.write_text('invalid SQLite database', encoding='utf-8')
            report = root / 'retro-download-report.py'
            report.write_text('# Simulated read-only reporter\n', encoding='utf-8')
            old = root / 'approved.py'
            old.write_text('print("previous approved version")\n', encoding='utf-8')
            old_v4 = root / 'approved_v4.py'
            old_v4.write_text('print("previous approved V4 version")\n', encoding='utf-8')
            candidate = root / 'new.py'
            private = root / 'private-reports'
            if fail:
                candidate.write_text('raise RuntimeError("simulated generator failure")\n')
            else:
                candidate.write_text('''import argparse,json,os
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--days');parser.add_argument('--output')
a=parser.parse_args();p=Path(a.output)
data=json.dumps({'source':'persistent_sqlite_read_only','downloads':{'complete':4}})
page='<h1>Retro Analytics</h1><meta content="connect-src \\'none\\'">'+('<script id="data-json" type="application/json">'+data+'</script>')+'function csvField(value){} numeric:true'+'x'*3200
''' + ('page="CORRUPTED"\n' if bad_html else '') + '''p.write_text(page)
os.chmod(p,0o600)
''', encoding='utf-8')
            target = root / 'retro-dashboard-private.py'
            if existing == 'approved':
                target.write_bytes(old.read_bytes())
            if existing == 'approved_v4':
                target.write_bytes(old_v4.read_bytes())
            if existing == 'new':
                target.write_bytes(candidate.read_bytes())
            if existing == 'unknown':
                target.write_text('print("unapproved version")\n')
            if symlink:
                target.symlink_to(old)
            if old_snapshot:
                private.mkdir(mode=0o700)
                (private / 'retro-dashboard.html').write_text('KEEP-EXISTING-REPORT')

            source = extract_bash()
            source = source.replace('/opt/proximaera/tools', str(root))
            source = source.replace('/opt/proximaera-retro-downloads/metrics/counters.sqlite3', str(db))
            source = source.replace('new_blob=03f4ef418f5d35fe3368c4cacaace6e00254af91',
                                    'new_blob=' + blob(candidate))
            source = source.replace('approved_v2=a9336cfbccdf91c7b7b9edde35075ac45a0fcaac',
                                    'approved_v2=' + blob(old))
            source = source.replace('approved_v4=c2a627479cc627928313bd6b30b1abcecdb1d34e',
                                    'approved_v4=' + blob(old_v4))
            curl = 'curl --proto \'=https\' --proto-redir \'=https\' --tlsv1.2 --fail --location --silent --show-error --max-time 30 "$url" -o "$staging"'
            self.assertIn(curl, source)
            source = source.replace(curl, f'cp "{candidate}" "$staging"')
            shell = temp / 'run.sh'
            shell.write_text(source, encoding='utf-8')
            result = subprocess.run(['bash', str(shell), 'check' if check else 'apply'],
                                    text=True, capture_output=True, timeout=12)
            failure = fail or existing == 'unknown' or not valid_db or bad_html or symlink
            if failure:
                self.assertNotEqual(result.returncode, 0, (label, result.stdout, result.stderr))
            else:
                self.assertEqual(result.returncode, 0, (label, result.stdout, result.stderr))
            if check:
                self.assertFalse(target.exists())
                self.assertFalse(private.exists())
            elif failure:
                if existing == 'approved':
                    self.assertEqual(target.read_bytes(), old.read_bytes())
                elif existing == 'approved_v4':
                    self.assertEqual(target.read_bytes(), old_v4.read_bytes())
                elif existing == 'unknown':
                    self.assertEqual(target.read_text(), 'print("unapproved version")\n')
                elif symlink:
                    self.assertTrue(target.is_symlink())
                    self.assertEqual(target.resolve(), old.resolve())
                    self.assertEqual(old.read_text(), 'print("previous approved version")\n')
                elif existing == 'absent':
                    self.assertFalse(target.exists())
                if old_snapshot:
                    self.assertEqual((private / 'retro-dashboard.html').read_text(), 'KEEP-EXISTING-REPORT')
            else:
                self.assertEqual(target.read_bytes(), candidate.read_bytes())
                html = private / 'retro-dashboard.html'
                self.assertIn('Retro Analytics', html.read_text())
                self.assertEqual(stat.S_IMODE(html.stat().st_mode), 0o600)
                self.assertEqual(stat.S_IMODE(private.stat().st_mode), 0o700)
                if existing in ('approved','approved_v4'):
                    self.assertEqual(len(list((root / 'backups').glob('retro-dashboard-before-v5.*.py'))), 1)
            self.assertFalse(list(root.glob('.retro-dashboard-install.*.py')))
            if private.exists():
                self.assertFalse(list(private.glob('.retro-dashboard-candidate.*.html')))
            print('PASS', label)

    def test_preflight(self):
        self.simulate('Preflight no writes', check=True)

    def test_first_install(self):
        self.simulate('Fresh install')

    def test_approved_upgrade(self):
        self.simulate('Approved V2/V4 upgrade', existing='approved')

    def test_upgrade_from_v4(self):
        self.simulate('Approved V4 upgrade', existing='approved_v4')

    def test_rollback_v4_after_failure(self):
        self.simulate('Generator failure restores V4', existing='approved_v4', fail=True, old_snapshot=True)

    def test_already_installed(self):
        self.simulate('Already installed V5', existing='new')

    def test_unknown_protection(self):
        self.simulate('Unknown generator refused', existing='unknown')

    def test_rollback_after_failure(self):
        self.simulate('Generator fails and restores V2', existing='approved', fail=True, old_snapshot=True)

    def test_html_integrity_failure(self):
        self.simulate('Invalid HTML preserves snapshot', existing='approved', bad_html=True, old_snapshot=True)

    def test_unknown_generator_preserves_snapshot(self):
        self.simulate('Unknown generator does not touch panel', existing='unknown', old_snapshot=True)

    def test_preflight_invalid_database(self):
        self.simulate('Bad database preflight refused', check=True, valid_db=False)

    def test_invalid_sqlite(self):
        self.simulate('Invalid SQLite fails before install', valid_db=False)

    def test_symlink_rejected(self):
        self.simulate('Generator symlink rejected', symlink=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
