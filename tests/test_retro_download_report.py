"""Offline tests for the private, read-only SQLite report."""
import argparse
import datetime as dt
import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path
import unittest
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('report',ROOT/'ops'/'retro-download-report.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
TZ=ZoneInfo('America/Sao_Paulo')
NOW=dt.datetime(2026,11,14,0,12,tzinfo=TZ)

class Tests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)
        self.db=self.root/'counters.sqlite3'
        c=sqlite3.connect(self.db)
        c.executescript('''
        CREATE TABLE totals(day TEXT,version TEXT,platform TEXT,started INTEGER,complete INTEGER,partial INTEGER,bytes INTEGER);
        CREATE TABLE source_totals(day TEXT,version TEXT,platform TEXT,source TEXT,started INTEGER,complete INTEGER,partial INTEGER,bytes INTEGER);
        CREATE TABLE visits(day TEXT,requests INTEGER);
        CREATE TABLE app_usage(day TEXT,platform TEXT,version TEXT,event TEXT,requests INTEGER);
        CREATE TABLE offsets(source TEXT,position INTEGER);
        ''')
        c.execute('INSERT INTO totals VALUES (?,?,?,?,?,?,?)',('2026-11-13','0.3.21','android',3,2,1,90000))
        c.execute('INSERT INTO totals VALUES (?,?,?,?,?,?,?)',('2026-11-13','0.3.21','windows',2,2,0,200000))
        c.execute('INSERT INTO totals VALUES (?,?,?,?,?,?,?)',('2026-11-01','0.3.19','android',8,8,0,800000))
        c.execute('INSERT INTO source_totals VALUES (?,?,?,?,?,?,?,?)',('2026-11-13','0.3.21','android','apps',3,2,1,90000))
        c.execute('INSERT INTO visits VALUES (?,?)',('2026-11-13',27))
        c.execute('INSERT INTO app_usage VALUES (?,?,?,?,?)',('2026-11-13','android','0.3.21','launch',2))
        c.commit()
        c.close()
        self.args=argparse.Namespace(day=None,days=2,since=None)

    def test_persistent_aggregate_not_generic_docker_log(self):
        data=m.report(self.db,self.root,self.args,NOW)
        self.assertEqual(data['source'],'persistent_sqlite_read_only')
        self.assertEqual(data['downloads']['started'],5)
        self.assertEqual(data['downloads']['complete'],4)
        self.assertEqual(data['platforms']['android']['partial'],1)
        self.assertEqual(data['sources']['apps']['complete'],2)
        self.assertEqual(data['portal_page_requests'],27)
        self.assertEqual(data['opt_in_app_launch_events'],2)
        self.assertEqual(data['days'][0]['day'],'2026-11-13')
        self.assertEqual(len(data['versions']),2)
        self.assertEqual(data['health']['backup_snapshots_found'],0)
        self.assertNotIn('username',json.dumps(data))

    def test_readonly_no_mutation_or_db_creation(self):
        before=self.db.read_bytes()
        m.report(self.db,self.root,self.args,NOW)
        self.assertEqual(before,self.db.read_bytes())
        with self.assertRaises(FileNotFoundError):
            m.report(self.root/'absent.sqlite3',self.root,self.args,NOW)
        self.assertFalse((self.root/'absent.sqlite3').exists())

    def test_periods_are_honestly_labeled(self):
        data=m.report(self.db,self.root,argparse.Namespace(day=None,days=None,since='24h'),NOW)
        self.assertFalse(data['period']['exact_for_requested_window'])
        self.assertEqual(data['period']['first_calendar_day'],'2026-11-13')
        self.assertTrue(any('dias-calendário' in x for x in data['warnings']))
        exact=m.report(self.db,self.root,argparse.Namespace(day='2026-11-13',days=None,since=None),NOW)
        self.assertTrue(exact['period']['exact_for_requested_window'])
        self.assertEqual(exact['downloads']['complete'],4)
        with self.assertRaises(ValueError):
            m.period_for(argparse.Namespace(day=None,days=366,since=None),NOW)

    def test_offsets_lag_and_backups(self):
        file=self.root/'downloads.log'
        file.write_bytes(b'1234567890')
        st=file.stat()
        c=sqlite3.connect(self.db)
        c.execute('INSERT INTO offsets VALUES (?,?)',(f'{st.st_dev}:{st.st_ino}',4))
        c.commit()
        c.close()
        backup_dir=self.root/'backups'
        backup_dir.mkdir()
        (backup_dir/'retro-metrics-2026-11-13.sqlite3').write_bytes(b'test')
        data=m.report(self.db,self.root,self.args,NOW)
        self.assertEqual(data['health']['unprocessed_log_bytes']['downloads.log'],6)
        self.assertEqual(data['health']['backup_snapshots_found'],1)

    def test_no_user_identifiers_from_sources(self):
        c=sqlite3.connect(self.db)
        c.execute('INSERT INTO source_totals VALUES (?,?,?,?,?,?,?,?)',
                  ('2026-11-13','0.3.21','android','private_email@example.com',50,50,0,5000))
        c.commit()
        c.close()
        data=m.report(self.db,self.root,self.args,NOW)
        self.assertNotIn('private_email@example.com',json.dumps(data))
        self.assertEqual(data['sources']['apps']['started'],3)

if __name__=='__main__':
    unittest.main()
