"""生成鱼眼（桶形）镜头用的位移贴图：public/lens/band-0.png 到 band-4.png，一共五张。库里的 src/shared/Lens.tsx 靠它们把画面扭弯，
模版不用自己跑这个脚本，只有想改镜头的弯曲规律或者分段时才重跑一次。
用法：python3 scripts/make_lens_map.py [--边长 640] [--高次 0.4] [--段 0.07,0.24,0.24,0.24,0.21] [--铺 2]
每张贴图是一张正方形的、不透明的 png，记的是一个圆盘：圆心到边缘算半径 1，位移大小是 (1 - 高次) × 半径³ + 高次 × 半径⁵
（圆心不挪，越靠边弯得越厉害，边缘上是 1）。Lens 把它铺在以镜头中心为圆心、正好碰到画面最远一角的圆上。
  红通道 = 中灰 + 沿半径往外的方向的横分量 × 这一段的位移（占满本段的多少，0 到 1）
  绿通道 = 中灰 + 同一个方向的竖分量 × 这一段的位移
为什么要分段：贴图只有 8 位，一次置换的精度是最大位移的 1/255，一次挪四百像素就有 1.6 像素的台阶，直边上看得出一格一格。
所以按“累计位移占总位移的比例”切成几段（默认 7%、31%、55%、79%、100%），每段一小份：里圈那段只有总位移的 7%，
精度就够了；每段在自己的半径范围里长到头就饱和不动，所以首尾相接地串起来，各段的位移正好加成整份。
Lens 里五段串着用，每段的 scale 是 2 × 本段占比 × strength。--段 给的是每段占总位移多少，加起来要是 1。

为什么要铺两倍大（--铺）：置换层里的内容一直伸到画面外几百像素（镜头要把外面的内容拉进来），而 Chrome 做置换时，
落在贴图圆以外的内容靠不住——量过：只铺到画面最远一角时，力度 420 的话，内容坐标超过约 2100 的那一条就采错了，
画面最右边 22 像素像被撕开。所以贴图的圆铺成 reach 的两倍，把置换层里所有内容都罩进去；圆里 1/铺 以外全是饱和值
（每个点都是它那个方向的满额位移），所以弯曲规律只由 1/铺 以内的部分决定，和铺多大无关。lensMath.ts 的 LENS_SPREAD 要和它一致。
中灰只能记成 128，比一半高出 1 / 510，Lens 会把这一点整体偏移抵掉。
要用 python3 的 numpy 和 ffmpeg。
"""
import argparse
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PARTS = (0.07, 0.24, 0.24, 0.24, 0.21)


def main():
    ap = argparse.ArgumentParser(description='生成鱼眼镜头的位移贴图。')
    ap.add_argument('--边长', dest='side', type=int, default=640, help='每张贴图每边多少像素，默认 640')
    ap.add_argument('--高次', dest='hi', type=float, default=0.4, help='位移里半径五次方那部分占多少（0 到 1），默认 0.4。越大越靠边才弯')
    ap.add_argument('--段', dest='parts', default=','.join(str(p) for p in DEFAULT_PARTS), help='每一段占总位移多少，用逗号隔开，加起来要是 1')
    ap.add_argument('--铺', dest='spread', type=float, default=2.0, help='贴图的圆铺成 reach 的几倍，默认 2。原因见文件头')
    a = ap.parse_args()
    parts = [float(v) for v in a.parts.split(',')]
    if min(parts) <= 0 or abs(sum(parts) - 1) > 1e-6:
        raise SystemExit('--段 每一段都要是正数，加起来要是 1')
    n = a.side
    c = (np.arange(n) + 0.5) / n * 2 - 1  # 每个像素中心落在 -1 到 1 的哪里
    x, y = np.meshgrid(c, c)  # 第 0 行是 y ≈ -1：和画面坐标一样，y 轴朝下
    rho = np.hypot(x, y)
    # 圆铺成 spread 倍大：算数值时先把半径乘回去，所以 1/spread 以内和原来一模一样，以外全是最边上那个数（饱和）
    inside = np.clip(rho * a.spread, 0, 1)
    full = (1 - a.hi) * inside ** 3 + a.hi * inside ** 5  # 整份位移：位移涨满的那个半径上是 1
    with np.errstate(invalid='ignore', divide='ignore'):
        ux, uy = np.where(rho > 0, x / rho, 0.0), np.where(rho > 0, y / rho, 0.0)  # 往外的单位方向，圆心上随便取
    out_dir = os.path.join(ROOT, 'public', 'lens')
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):  # 旧的（不分段的 barrel.png、段数变了以后多出来的）不留
        if f.endswith('.png') and (f == 'barrel.png' or int(f[5:-4]) >= len(parts)):
            os.remove(os.path.join(out_dir, f))
    total = 0
    print(f'{os.path.relpath(out_dir, ROOT)}/，{n}×{n}，高次 {a.hi}：')
    for k, part in enumerate(parts):
        # 这一段只管累计位移从 total 到 total + part 这一段：在它的半径范围里长上去，出了范围就饱和
        share = (np.clip(full, total, total + part) - total) / part
        to8 = lambda v: np.clip(np.rint(127.5 + 127.5 * v), 0, 255).astype(np.uint8)  # noqa: E731  中灰记成 128
        rgba = np.dstack([to8(ux * share), to8(uy * share), np.full((n, n), 128, np.uint8), np.full((n, n), 255, np.uint8)])
        out = os.path.join(out_dir, f'band-{k}.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{n}x{n}', '-i', '-',
                        '-frames:v', '1', '-update', '1', out], input=rgba.tobytes(), check=True)
        # 这一段管到多远：累计位移刚好到 total + part 时的半径（占 Lens 里 reach 的多少），以及它的台阶有多大（占 strength 的多少）
        reach_to = 1.0 if k == len(parts) - 1 else float(rho[full <= total + part].max() * a.spread)
        print(f'  band-{k}.png  占 {part:.2f}，管到 reach 的半径 {reach_to:.2f}（再往外饱和），台阶 {2 * part / 255 * 100:.2f}% × strength（strength 420 时 {2 * part / 255 * 420:.2f} 像素），{os.path.getsize(out) / 1e3:.0f}KB')
        total += part
    print('Lens 里 scale = 2 × 占比 × strength。改了 --段 或 --铺 的话，记得把 lensMath.ts 的 LENS_BANDS、LENS_SPREAD 改成一样的')


main()
