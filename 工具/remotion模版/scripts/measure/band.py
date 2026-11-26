"""逐帧量一条有颜色的带（比如高亮的卡片）在画面上的倾角和位置：带的中线有多斜、落在某一列（默认 x=60）上有多高、有多厚。
带 --对比 就把另一条视频（自己的成片）用同一个量法再量一遍，两边并排打印、给出差值。
用法：python3 scripts/measure/band.py <视频> <起> <止> <步> [--列 60] [--色 mint|red|yellow] [--对比 另一条视频]
      如 python3 scripts/measure/band.py 参考/参考视频.mp4 0 239 8 --对比 out/02-…/默认.mp4
--色 默认 mint（薄荷色：绿比红、蓝都高，底又不暗）。只量每一帧里最像那种颜色的那一大块，所以画面里同时有两块就不准。
要裁原尺寸的图来看细节，窗口定在哪可以拿这里量出的高度当基准，接着用 crops.py。
"""
import argparse
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import color_mask, read_frame  # noqa: E402


def band_mask(img, kind):
    if kind != 'mint':
        return color_mask(img, kind)
    rgb = img.astype(np.int16)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r + g + b) // 3
    return (g - r > 7) & (g - b > 3) & (lum > 150)


def measure(video, f, kind, column):
    """返回 (倾角°, 中线在这一列的高度, 厚度)；这一帧里看不到带就返回 None。"""
    img = read_frame(video, f)
    mask = band_mask(img, kind)
    count = mask.sum(axis=0)  # 每一列有多少个这种颜色的像素
    if count.size == 0 or count.max() < 8:
        return None
    cols = np.where(count > count.max() * 0.55)[0]
    ys = np.array([np.where(mask[:, c])[0].mean() for c in cols])
    # 去掉离中线太远的列（圆角、被别的颜色盖住的地方），再拟合两次
    slope, base = np.polyfit(cols, ys, 1)
    keep = np.abs(ys - (slope * cols + base)) < 12
    if keep.sum() < 6:
        return None
    cols, ys = cols[keep], ys[keep]
    slope, base = np.polyfit(cols, ys, 1)
    # 厚度取中间三分之一列的中位数，免得某一列被带里的进度条之类的带偏
    third = len(cols) // 3
    mid = cols[third:max(third + 1, 2 * third)]
    thick = float(np.median(count[mid])) / math.cos(math.atan(slope))
    return math.degrees(math.atan(slope)), slope * column + base, thick


def main():
    ap = argparse.ArgumentParser(description='逐帧量一条有颜色的带的倾角和位置，可以和自己的成片并排比。')
    ap.add_argument('video')
    ap.add_argument('start', type=int)
    ap.add_argument('end', type=int)
    ap.add_argument('step', type=int)
    ap.add_argument('--列', dest='column', type=int, default=60, help='量中线落在哪一列上的高度，默认 60')
    ap.add_argument('--色', dest='kind', default='mint', choices=['mint', 'red', 'yellow'], help='带是什么颜色，默认 mint')
    ap.add_argument('--对比', dest='other', help='自己的成片；给了就两边并排打印')
    a = ap.parse_args()

    def show(m):
        return '看不到' if m is None else f'{m[0]:>6.1f}  {m[1]:>6.0f}  {m[2]:>4.0f}'

    print(f'帧   参考：倾角°  在x={a.column}的高度  厚度' + ('' if not a.other else '     我的：倾角°  高度  厚度     高度差  倾角差'))
    for f in range(a.start, a.end + 1, a.step):
        ref = measure(a.video, f, a.kind, a.column)
        if not a.other:
            print(f'{f:>4}  {show(ref)}')
            continue
        mine = measure(a.other, f, a.kind, a.column)
        if ref is None or mine is None:
            print(f'{f:>4}  {show(ref)}     {show(mine)}')
            continue
        print(f'{f:>4}  {show(ref)}     {show(mine)}   {mine[1] - ref[1]:>+7.0f}  {mine[0] - ref[0]:>+6.1f}')


main()
