"""Private Retro dashboard: offline rendering, privacy, permissions and accessibility."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('retro_dashboard',ROOT/'ops'/'retro-dashboard-private.py')
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

BASE={
 'source':'persistent_sqlite_read_only',
 'generated_at':'2026-11-13T22:51:00-03:00',
 'period':{'first_calendar_day':'2026-08-16','last_calendar_day':'2026-11-13'},
 'downloads':{'started':5,'complete':4,'partial':1,'bytes':250_000_000},
 'platforms':{
  'android':{'started':3,'complete':2,'partial':1,'bytes':8_000_000},
  'windows':{'started':2,'complete':2,'partial':0,'bytes':242_000_000}
 },
 'sources':{
  'home':{'started':1,'complete':1,'partial':0,'bytes':4000},
  'apps':{'started':1,'complete':1,'partial':0,'bytes':4000},
  'other':{'started':3,'complete':2,'partial':1,'bytes':9000}
 },
 'versions':[
  {'day':'2026-11-13','version':'0.3.21','platform':'android','started':3,'complete':2,'partial':1,'bytes':8000000},
  {'day':'2026-11-13','version':'0.3.21','platform':'windows','started':2,'complete':2,'partial':0,'bytes':242000000}
 ],
 'days':[{'day':'2026-11-13','started':5,'complete':4,'partial':1,'bytes':250000000}],
 'portal_page_requests':27,
 'opt_in_app_launch_events':2,
 'app_launches_by_platform':{'android':2,'windows':0},
 'health':{
  'database_last_modified_utc':'2026-11-14T01:51:00+00:00',
  'unprocessed_log_bytes':{'downloads.log':165,'visits.log':38,'app-usage.log':0},
  'backup_snapshots_found':1,'latest_backup':'retro-metrics-2026-11-13.sqlite3'
 },
 'warnings':['HTTP requests are not people']
}

class DashboardTests(unittest.TestCase):
 def test_offline_private_and_filters(self):
  page=mod.render(BASE)
  self.assertIn('lang="pt-BR"',page)
  self.assertIn("connect-src 'none'",page)
  self.assertIn('noindex,nofollow,noarchive',page)
  self.assertIn('Retro Analytics',page)
  self.assertIn('data-days="7"',page)
  self.assertIn('data-days="30"',page)
  self.assertIn('data-days="90"',page)
  self.assertIn('data-platform="android"',page)
  self.assertIn('data-platform="windows"',page)
  self.assertIn('Exportar CSV',page)
  self.assertNotIn('https://www.',page)
  self.assertNotIn('http://',page)
  self.assertNotIn('fetch(',page)
  self.assertNotIn('<iframe',page)
  self.assertNotIn('google-analytics',page.lower())

 def test_json_is_escaped_and_no_tracking_details(self):
  data=json.loads(json.dumps(BASE))
  data['versions'][0]['version']='</script><script>alert(1)</script>'
  page=mod.render(data)
  self.assertNotIn('</script><script>alert(1)</script>',page)
  self.assertIn(r'\u003c/script\u003e',page)
  self.assertIn('type="application/json"',page)
  self.assertEqual(page.count('</script>'),2)

 def test_platform_filter_displays_only_selected_series(self):
  # Ensure the local chart uses the selected metric for scaling and its segments,
  # so Android mode never shows Windows bars (and vice versa).
  js=mod.PAGE.split('<script>')[-1]
  self.assertIn("state.platform==='android'?b.android:state.platform==='windows'?b.windows:b.android+b.windows",js)
  self.assertIn("state.platform!=='windows' && b.android>0",js)
  self.assertIn("state.platform!=='android' && b.windows>0",js)
  self.assertIn("stack.style.height=visible>0?",js)
  self.assertIn("chart.setAttribute('aria-label'",js)

 def test_source_must_be_persistent_aggregates(self):
  with self.assertRaises(ValueError):
   mod.render({'source':'docker_logs','downloads':{'complete':2}})

 def test_atomic_private_write_permission_and_restriction(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)/'private'
   output=root/'retro-dashboard.html'
   mod.private_save(mod.render(BASE),output,root)
   self.assertTrue(output.is_file())
   self.assertEqual(os.stat(root).st_mode & 0o777,0o700)
   self.assertEqual(os.stat(output).st_mode & 0o777,0o600)
   first=output.read_text(encoding='utf-8')
   mod.private_save(mod.render(BASE),output,root)
   self.assertEqual(first,output.read_text(encoding='utf-8'))
   with self.assertRaises(ValueError):
    mod.private_save('x',Path(directory)/'outside.html',root)
   self.assertFalse((Path(directory)/'outside.html').exists())
   with self.assertRaises(ValueError):
    mod.private_save('x',root/'bad.json',root)
   if hasattr(os,'symlink'):
    link=Path(directory)/'link-to-private'
    link.symlink_to(root,target_is_directory=True)
    with self.assertRaises(ValueError):
     mod.private_save('x',link/'malicious.html',link)

if __name__=='__main__':
 unittest.main()
