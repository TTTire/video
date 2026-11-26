"""生成鱼眼（桶形）镜头用的位移贴图：public/lens/barrel.png。库里的 src/shared/Lens.tsx 靠它把画面扭弯，模版不用自己跑这个脚本，
只有想改镜头的弯曲规律时才重跑一次。
用法：python3 scripts/make_lens_map.py [--边长 1024] [--高次 0.4]
贴图是一张正方形的透明度不透明的 png，记的是一个圆盘：圆心到边缘算半径 1，每个点的
  红通道 = 中灰 + 沿半径往外的方向的横分量 × 这一点的位移大小
  绿通道 = 中灰 + 同一个方向的竖分量 × 位移大小
位移大小是 (1 - 高次) × 半径³ + 高次 × 半径⁵：圆心不挪，越靠边弯得越厉害。Lens 把它铺在以镜头中心为圆心、
正好碰到画面最远一角的圆上，再用 feDisplacementMap 的 scale 定“最远那一角挪多少像素”。
只有 8 位，所以位移的精度是 scale 的 1/255；Lens 会把中灰落在 128 上带来的那点整体偏移（scale / 510）抵掉。
要用 python3 的 numpy 和 ffmpeg。
"""
import argparse
import os
import subprocess

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser(description='生成鱼眼镜头的位移贴图。')
    ap.add_argument('--边长', dest='side', type=int, default=1024, help='贴图每边多少像素，默认 1024')
    ap.add_argument('--高次', dest='hi', type=float, default=0.4, help='位移里半径五次方那部分占多少（0 到 1），默认 0.4。越大越靠边才弯')
    a = ap.parse_args()
    n = a.side
    c = (np.arange(n) + 0.5) / n * 2 - 1  # 每个像素中心落在 -1 到 1 的哪里
    x, y = np.meshgrid(c, c)  # 第 0 行是 y ≈ -1：和画面坐标一样，y 轴朝下
    r2 = x * x + y * y
    k = (1 - a.hi) * r2 + a.hi * r2 * r2  # 位置向量乘上它，就是位移向量（大小是 (1-高次)r³ + 高次 r⁵）
    to8 = lambda v: np.clip(np.rint(127.5 + 127.5 * v), 0, 255).astype(np.uint8)  # noqa: E731  中灰记成 128
    rgba = np.dstack([to8(x * k), to8(y * k), np.full((n, n), 128, np.uint8), np.full((n, n), 255, np.uint8)])
    out_dir = os.path.join(ROOT, 'public', 'lens')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, 'barrel.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{n}x{n}', '-i', '-',
                    '-frames:v', '1', '-update', '1', out], input=rgba.tobytes(), check=True)
    print(f'{os.path.relpath(out, ROOT)}  {n}×{n}，{os.path.getsize(out) / 1e3:.0f}KB，高次 {a.hi}')
    print(f'红绿通道：0 到 255，圆心是 128；圆盘边缘（半径 1）上的位移是 Lens 里 scale 的一半')


main()
