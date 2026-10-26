"""样式实验室出图：把 src/stylelab/Lab.tsx 的每一帧渲成一张 1920×1080 的 jpg，再拼成一张对比图。
在 工具/video-render 下运行：
  python scripts/lab.py all        出全部方案 + 拼图 → out/stylelab/*.jpg
  python scripts/lab.py 3          只出第 3 个方案
"""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'out', 'stylelab')
os.makedirs(OUT, exist_ok=True)

NAMES = {
    0: '字号刻度', 1: 'card-solid', 2: 'card-paper', 3: 'card-notch',
    4: 'card-tab', 5: 'card-stack', 6: 'stagger', 7: 'textfx', 8: 'combo',
}
arg = sys.argv[1] if len(sys.argv) > 1 else 'all'
frames = sorted(NAMES) if arg == 'all' else [int(arg)]

for f in frames:
    path = os.path.join(OUT, f'{f:02d}-{NAMES[f]}.jpg')
    cmd = ['npx', 'remotion', 'still', 'src/index.ts', 'StyleLab', path, f'--frame={f}', '--jpeg-quality=92']
    r = subprocess.call(cmd, cwd=ROOT, shell=(os.name == 'nt'))
    print(('OK   ' if r == 0 else 'FAIL ') + path)
    if r != 0:
        sys.exit(r)

print(f'\n共 {len(frames)} 张 → {OUT}')
