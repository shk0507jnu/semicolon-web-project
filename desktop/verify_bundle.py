"""Check the packaged app from an unrelated working directory and a minimal PATH."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def verify(executable):
    executable = executable.resolve()
    with tempfile.TemporaryDirectory(prefix='실행 확인 ', dir=ROOT / '.build') as temporary:
        work = Path(temporary)
        env = dict(os.environ)
        env['PATH'] = str(Path(os.environ['SystemRoot']) / 'System32')
        env.pop('PYTHONPATH', None)
        env.pop('PYTHONHOME', None)
        for run in (1, 2):
            report = work / f'report-{run}.json'
            result = subprocess.run([str(executable), '--self-test', '--data-dir', str(work / '내 데이터'),
                                     '--report', str(report)], cwd=work, env=env, timeout=90)
            assert report.exists(), f'No report; executable exited with {result.returncode}'
            data = json.loads(report.read_text(encoding='utf-8'))
            assert result.returncode == 0 and data['ok'], data
            assert data['frozen'] and data['persistentRuns'] == run, data
            print(json.dumps(data, ensure_ascii=False))
        print('PASS: standalone startup, bundled assets, SQLite, restart persistence, clean shutdown')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('executable', type=Path)
    verify(parser.parse_args().executable)
