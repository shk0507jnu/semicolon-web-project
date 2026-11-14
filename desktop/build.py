"""Build the single-file Windows preview from a fresh demo seed, never a local DB."""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STAGING = ROOT / '.build' / 'desktop'


def run(command, **kwargs):
    subprocess.run(command, check=True, **kwargs)


def build(one_dir=False):
    STAGING.mkdir(parents=True, exist_ok=True)
    env = {**os.environ, 'VITE_DATA_SOURCE': 'api', 'VITE_DESKTOP_PREVIEW': 'true'}
    run(['node', 'node_modules/vite/bin/vite.js', 'build', '--outDir', str(STAGING / 'web'), '--emptyOutDir'],
        cwd=ROOT / 'frontend', env=env)
    # Keep the original UI font available without an Internet connection.
    assets = STAGING / 'web' / 'assets'
    font = assets / 'NotoSansKR.ttf'
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf', font)
    urllib.request.urlretrieve('https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt', assets / 'NotoSansKR-OFL.txt')
    index = STAGING / 'web' / 'index.html'
    html = re.sub(r'<link\s[^>]*href="https://fonts\.(?:googleapis|gstatic)\.com[^>]*>', '', index.read_text(encoding='utf-8'))
    html = html.replace('</head>', '<style>@font-face{font-family:"Noto Sans KR";font-style:normal;font-weight:100 900;font-display:swap;src:url("/assets/NotoSansKR.ttf") format("truetype")}</style></head>')
    index.write_text(html, encoding='utf-8')
    with tempfile.TemporaryDirectory(prefix='shiftlink-seed-', dir=ROOT / '.build') as temporary:
        seed = Path(temporary) / 'seed.db'
        run([sys.executable, str(ROOT / 'backend' / 'calendar_api' / 'setup_local.py'), '--demo'],
            env={**os.environ, 'CALENDAR_DB': str(seed)})
        shutil.copyfile(seed, STAGING / 'seed.db')
    run([sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--windowed',
         '--onedir' if one_dir else '--onefile', '--name', 'ShiftLink',
         '--distpath', str(ROOT / 'release'), '--workpath', str(ROOT / '.build' / 'pyinstaller'),
         '--specpath', str(ROOT / '.build'), '--paths', str(ROOT / 'backend' / 'calendar_api'),
         '--add-data', f'{STAGING / "web"};web', '--add-data', f'{STAGING / "seed.db"};.',
         '--hidden-import', 'uvicorn.logging', '--hidden-import', 'uvicorn.loops.asyncio',
         '--hidden-import', 'uvicorn.protocols.http.h11_impl', '--hidden-import', 'uvicorn.lifespan.on',
         '--copy-metadata', 'fastapi', '--copy-metadata', 'starlette',
         str(ROOT / 'desktop' / 'launcher.py')], cwd=ROOT)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--onedir', action='store_true')
    build(parser.parse_args().onedir)
