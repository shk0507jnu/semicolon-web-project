"""Create a new local DB, or migrate an existing copy without resetting it."""
import argparse
from pathlib import Path
import runpy

from main import DB_PATH, connect, init_db

parser = argparse.ArgumentParser()
parser.add_argument('--demo', action='store_true', help='Add missing September 2026 sample shifts')
args = parser.parse_args()
if not Path(DB_PATH).exists():
    runpy.run_path(str(Path(__file__).with_name('build.py')))
init_db()
if args.demo:
    from seed_demo import seed
    conn = connect()
    try:
        print(f'Added demo shifts: {seed(conn)}')
    finally:
        conn.close()
print(f'Ready: {DB_PATH}')
