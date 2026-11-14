#!/usr/bin/env python3
"""Read-only, private report from Retro's EXISTING persistent SQLite counters.

Never processes raw visitor logs or writes to the metrics database. Never treats
requests as installations or unique visitors. Day buckets use Sao Paulo time.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import sqlite3
import sys
from urllib.parse import quote
from zoneinfo import ZoneInfo

DEFAULT_DB = Path('/opt/proximaera-retro-downloads/metrics/counters.sqlite3')
TZ = ZoneInfo('America/Sao_Paulo')
FIELDS = ('started', 'complete', 'partial', 'bytes')
SOURCES = ('home', 'apps', 'other')
LOG_FILES = ('downloads.log', 'visits.log', 'app-usage.log')

def _metrics(row):
    return dict(zip(FIELDS, (int(x or 0) for x in row)))

def _sum(connection, table, start, end, other='', extra=()):
    # Only internal, constant SQL identifiers reach this function.
    assert table in ('totals', 'source_totals')
    sql = f'SELECT {", ".join("COALESCE(SUM("+c+"), 0)" for c in FIELDS)} FROM {table} WHERE day BETWEEN ? AND ?'
    return _metrics(connection.execute(sql + other, (start, end, *extra)).fetchone())

def period_for(args, now):
    today = now.date()
    if args.day:
        start = end = dt.date.fromisoformat(args.day)
        return start, end, 'calendar_day', True
    if args.days is not None:
        if not 1 <= args.days <= 365:
            raise ValueError('--days deve ficar entre 1 e 365')
        return today - dt.timedelta(days=args.days-1), today, f'{args.days}_calendar_days', True
    since = args.since or '24h'
    match = re.fullmatch(r'([1-9][0-9]{0,2})([hd])', since)
    if not match:
        raise ValueError('--since deve ter formato 24h ou 7d (1..999)')
    n = int(match.group(1))
    delta = dt.timedelta(hours=n) if match.group(2) == 'h' else dt.timedelta(days=n)
    # This includes calendar days intersecting the rolling period, which can
    # include events from extra hours on the first day. Mark as inexact.
    return (now-delta).date(), today, since, False

def _offset_lag(connection, metrics_dir):
    rows = dict(connection.execute('SELECT source,position FROM offsets'))
    pending = {}
    for filename in LOG_FILES:
        file = metrics_dir/filename
        try:
            st = file.stat()
            key = f'{st.st_dev}:{st.st_ino}'
            cursor = int(rows.get(key, 0))
            pending[filename] = max(0, st.st_size - cursor)
        except OSError:
            pending[filename] = None
    return pending

def report(db_path=DEFAULT_DB, metrics_dir=None, args=None, now=None):
    if args is None:
        args = argparse.Namespace(day=None, days=None, since='24h')
    now = now or dt.datetime.now(TZ)
    if now.tzinfo is None:
        raise ValueError('now deve ter fuso horário')
    now = now.astimezone(TZ)
    start, end, requested, exact = period_for(args, now)
    db_path = Path(db_path)
    if not db_path.is_file():
        raise FileNotFoundError('O banco persistente de métricas não foi encontrado')
    metrics_dir = Path(metrics_dir) if metrics_dir else db_path.parent
    uri = 'file:' + quote(str(db_path.resolve())) + '?mode=ro'
    connection = sqlite3.connect(uri, uri=True, timeout=10)
    try:
        connection.execute('PRAGMA query_only = ON')
        if connection.execute('PRAGMA quick_check').fetchone()[0] != 'ok':
            raise RuntimeError('Falha de integridade no banco SQLite')
        a, b = start.isoformat(), end.isoformat()
        total = _sum(connection, 'totals', a, b)
        platforms = {platform: _sum(connection,'totals', a,b,' AND platform=?',(platform,))
                     for platform in ('android', 'windows')}
        sources = {source: _sum(connection, 'source_totals', a,b,' AND source=?',(source,))
                   for source in SOURCES}
        versions = [dict(day=day, version=version, platform=platform,
                         **_metrics((started, complete, partial, size)))
                    for day, version, platform, started, complete, partial, size in connection.execute(
                        'SELECT day,version,platform,started,complete,partial,bytes FROM totals '
                        'WHERE day BETWEEN ? AND ? ORDER BY day DESC,version DESC,platform LIMIT 1000',(a,b))]
        days = [dict(day=day, **_metrics((started, complete, partial, size)))
                for day,started,complete,partial,size in connection.execute(
                    'SELECT day,SUM(started),SUM(complete),SUM(partial),SUM(bytes) FROM totals '
                    'WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day DESC',(a,b))]
        visits = connection.execute('SELECT COALESCE(SUM(requests),0) FROM visits '
                                    'WHERE day BETWEEN ? AND ?',(a,b)).fetchone()[0]
        app_launches = connection.execute('SELECT COALESCE(SUM(requests),0) FROM app_usage '
                                          'WHERE day BETWEEN ? AND ?',(a,b)).fetchone()[0]
        app_platforms = {platform:int(connection.execute(
            'SELECT COALESCE(SUM(requests),0) FROM app_usage WHERE day BETWEEN ? AND ? AND platform=?',
            (a,b,platform)).fetchone()[0]) for platform in ('android','windows')}
        pending = _offset_lag(connection,metrics_dir)
    finally:
        connection.close()
    backups_dir = metrics_dir/'backups'
    backup_names = sorted((p.name for p in backups_dir.glob('retro-metrics-????-??-??.sqlite3') if p.is_file()),reverse=True) if backups_dir.is_dir() else []
    stamp = dt.datetime.fromtimestamp(db_path.stat().st_mtime,dt.timezone.utc).isoformat(timespec='seconds')
    warnings = [
        'Transferências são respostas HTTP, não instalações nem pessoas únicas; podem incluir testes internos.',
        'Contagens começaram quando a coleta foi ativada; não representam todo o histórico do produto.'
    ]
    if not exact:
        warnings.append('O período solicitado foi aproximado por dias-calendário, podendo incluir horas extras no primeiro dia.')
    if any(v is None for v in pending.values()):
        warnings.append('Há arquivos de log ausentes; confira o coletor e a configuração do servidor.')
    if any((v or 0)>0 for v in pending.values()):
        warnings.append('Existem bytes de logs ainda não processados pelo coletor de cinco minutos.')
    return {
        'status':'ok', 'source':'persistent_sqlite_read_only',
        'generated_at':now.isoformat(timespec='seconds'),
        'period':{'requested':requested,'first_calendar_day':a,'last_calendar_day':b,
                  'timezone':'America/Sao_Paulo','exact_for_requested_window':exact},
        'downloads':total,'platforms':platforms,'sources':sources,
        'versions':versions,'days':days,
        'portal_page_requests':int(visits),
        'opt_in_app_launch_events':int(app_launches),'app_launches_by_platform':app_platforms,
        'health':{'database_last_modified_utc':stamp, 'unprocessed_log_bytes':pending,
                  'backup_snapshots_found':len(backup_names),
                  'latest_backup':backup_names[0] if backup_names else None},
        'warnings':warnings
    }

def main():
    p=argparse.ArgumentParser(description=__doc__)
    group=p.add_mutually_exclusive_group()
    group.add_argument('--since',help='Janela aproximada: 24h ou 7d, agrupada por dias')
    group.add_argument('--days',type=int,help='Últimos N dias-calendário, incluindo hoje')
    group.add_argument('--day',help='Dia de São Paulo no formato YYYY-MM-DD')
    p.add_argument('--database',type=Path,default=DEFAULT_DB,help='SQLite persistente (aberto somente em leitura)')
    p.add_argument('--log-dir',type=Path,help='Diretório dos logs, apenas para verificar a defasagem')
    args=p.parse_args()
    try:
        print(json.dumps(report(args.database,args.log_dir,args),ensure_ascii=False,indent=2))
    except (ValueError,OSError,sqlite3.Error,RuntimeError) as exc:
        print('ERRO: '+str(exc),file=sys.stderr)
        return 1
    return 0

if __name__=='__main__':
    sys.exit(main())
