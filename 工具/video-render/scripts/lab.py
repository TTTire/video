"""样式实验室出图：把 src/stylelab/Lab.tsx 的每一帧渲成一张 1920×1080 的 jpg，再拼成一张对比图。
在 工具/video-render 下运行：
  python scripts/lab.py all        出全部方案 + 拼图 → out/stylelab/*.jpg
  python scripts/lab.py 3          只出第 3 个方案
  python scripts/lab.py tactile    实物卡 + 数值动效验证台（src/stylelab/TactileLab.tsx），19 帧 → out/stylelab/tactile-*.jpg + 拼图
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
if arg == 'tactile':
    T = ['notch', 'paper', 'solid', 'tab-odometer', 'odometer-mid', 'photocard', 'photorow', 'photorow-mid', 'flap', 'flap-mid',
         'slam', 'slam-mid', 'rank', 'rank-mid', 'units', 'units-mid', 'fill', 'graph', 'graph-mid']
    paths = []
    for i, n in enumerate(T):
        path = os.path.join(OUT, f'tactile-{i:02d}-{n}.jpg')
        r = subprocess.call(['npx', 'remotion', 'still', 'src/index.ts', 'TactileLab', path, f'--frame={i}', '--jpeg-quality=90'], cwd=ROOT, shell=(os.name == 'nt'))
        print(('OK   ' if r == 0 else 'FAIL ') + path); paths.append(path)
        if r != 0: sys.exit(r)
    from PIL import Image
    ims = [Image.open(p).resize((640, 360)) for p in paths]
    cols = 4; rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (640 * cols, 360 * rows), 'black')
    for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * 640, (k // cols) * 360))
    sheet.save(os.path.join(OUT, 'tactile-sheet.jpg'), quality=88)
    print(f'\n拼图 → {OUT}/tactile-sheet.jpg'); sys.exit(0)
frames = sorted(NAMES) if arg == 'all' else [int(arg)]

for f in frames:
    path = os.path.join(OUT, f'{f:02d}-{NAMES[f]}.jpg')
    cmd = ['npx', 'remotion', 'still', 'src/index.ts', 'StyleLab', path, f'--frame={f}', '--jpeg-quality=92']
    r = subprocess.call(cmd, cwd=ROOT, shell=(os.name == 'nt'))
    print(('OK   ' if r == 0 else 'FAIL ') + path)
    if r != 0:
        sys.exit(r)

print(f'\n共 {len(frames)} 张 → {OUT}')
