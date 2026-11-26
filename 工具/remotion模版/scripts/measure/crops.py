"""按原尺寸、不缩小，把几帧的同一块窗口裁出来摞在一起。要认字、比字的大小时用它，别在缩小的总览图里认。
给了第二条视频（自己的成片）时，每一帧先放参考、再放自己的，上下紧挨着，所以两边窗口一样，位置差一眼就看得出。
用法：python3 scripts/measure/crops.py <视频> <输出jpg> <x,y,w,h> <帧,帧,…>
      python3 scripts/measure/crops.py <参考视频> <自己的成片> <输出jpg> <x,y,w,h> <帧,帧,…>
      如 python3 scripts/measure/crops.py 参考/参考视频.mp4 out/02-…/默认.mp4 /tmp/比.jpg 0,500,1080,700 44,52,60
窗口定在哪：先看总览图（frames.py），或者拿 band.py 量出的高度当基准，往上往下各留几百像素。
图很宽很高时看图软件会把它缩小，那就少放几帧、窗口裁小一点。
"""
import argparse
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import parse_rect, read_frame  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description='按原尺寸裁几帧摞起来看细节。')
    ap.add_argument('videos', nargs='+', help='一条视频，或者“参考视频 自己的成片”两条')
    ap.add_argument('--out', required=True, help='存成哪张图（jpg）')
    ap.add_argument('--window', required=True, help='窗口 x,y,w,h（像素，以视频自己的大小为准）')
    ap.add_argument('--frames', required=True, help='要哪些帧，如 44,52,60')
    a = ap.parse_args()

    if len(a.videos) not in (1, 2):
        raise SystemExit('视频给一条，或者给两条（参考、自己的）')
    x, y, w, h = parse_rect(a.window, '')['rect']
    frames = [int(v) for v in a.frames.split(',') if v.strip()]
    if not frames:
        raise SystemExit('--frames 里没有帧号')
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)

    parts = []
    for f in frames:
        for video in a.videos:
            img = read_frame(video, f)
            if img.shape[0] < y + h or img.shape[1] < x + w:
                raise SystemExit(f'{os.path.basename(video)} 第 {f} 帧没有这么大，窗口 {a.window} 超出去了')
            parts.append(img[y:y + h, x:x + w])
    gap = 6
    height = h * len(parts) + gap * (len(parts) - 1)
    sheet = np.full((height, w, 3), 60, np.uint8)  # 帧和帧之间留一道深色缝
    for i, part in enumerate(parts):
        sheet[i * (h + gap):i * (h + gap) + h] = part
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{height}', '-i', '-',
                    '-frames:v', '1', '-q:v', '2', '-update', '1', a.out], input=sheet.tobytes(), check=True)
    order = '每一帧先参考、后自己的' if len(a.videos) == 2 else ''
    print(f'{a.out}  {w}×{height}，从上到下依次是第 {"、".join(map(str, frames))} 帧{order}')


main()
