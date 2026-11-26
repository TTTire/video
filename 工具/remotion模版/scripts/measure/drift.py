"""量一条视频从第 a 帧到第 b 帧，整个画面挪了多少、放大了多少（很慢的推镜、手持漂移这类）。
做法是绕画面中心穷举位移和倍数，看哪一组把第 a 帧摆到第 b 帧上差最小。画面里有东西自己在动（卡片升降、字滑进来）时会被当成噪声，
所以挑两帧都在静止段的时候量。帧号是时间轴上的（见 _common.timeline_index）。
用法：python3 scripts/measure/drift.py <视频> <帧a> <帧b> [--区域 x,y,w,h] [--位移 6] [--倍数 1,1.005,1.01]
      给 --区域 时只比这一块，绕这块自己的中心放大（坐标按视频自己的像素写）。
如 python3 scripts/measure/drift.py 参考/参考视频.mp4 40 64 --区域 240,320,360,130
"""
import argparse
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import parse_rect, probe_size, timeline_index  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description='量两帧之间整个画面挪了多少、放大了多少。')
    ap.add_argument('video')
    ap.add_argument('a', type=int, help='第几帧（时间轴上的）')
    ap.add_argument('b', type=int, help='和第几帧比')
    ap.add_argument('--区域', dest='rect', help='只比这一块：x,y,w,h')
    ap.add_argument('--位移', dest='shift', type=int, default=6, help='每个方向最多找几像素，默认 6')
    ap.add_argument('--倍数', dest='scales', default='1,0.992,1.008,0.984,1.016,0.976,1.024', help='试哪几个倍数，逗号分开')
    args = ap.parse_args()

    vw, vh = probe_size(args.video)
    ox, oy, w, h = parse_rect(args.rect, '')['rect'] if args.rect else (0, 0, vw, vh)
    w, h = w - w % 2, h - h % 2  # 裁成奇数宽高时有的像素格式会直接报错
    if ox + w > vw or oy + h > vh:
        raise SystemExit(f'{args.video} 是 {vw}×{vh}，窗口 {args.rect} 超出去了')
    ti = timeline_index(args.video)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', args.video, '-vf',
                          f"select=eq({ti}\\,{args.a})+eq({ti}\\,{args.b}),crop={w}:{h}:{ox}:{oy}", '-fps_mode', 'passthrough',
                          '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    if len(raw) < 2 * w * h:
        raise SystemExit(f'{args.video} 里取不到时间轴上的第 {args.a}、{args.b} 帧')
    first, second = np.frombuffer(raw[: 2 * w * h], np.uint8).reshape(2, h, w).astype(np.float32)
    # 画面里留 16 像素的边不比：挪动以后边上是对不上的
    ys, xs = np.mgrid[16:h - 16, 16:w - 16].astype(np.float32)
    cx, cy = ox + w / 2, oy + h / 2  # 倍数是绕这块的中心算的，坐标用整幅画面的
    px0, py0 = xs + ox, ys + oy
    best = None
    for s in (float(v) for v in args.scales.split(',')):
        for dx in range(-args.shift, args.shift + 1):
            for dy in range(-args.shift, args.shift + 1):
                # 第 b 帧里的点 (x, y)，在第 a 帧里是 (cx + (x − dx − cx) / s, …)
                px = cx + (px0 - dx - cx) / s - ox
                py = cy + (py0 - dy - cy) / s - oy
                inside = (px >= 0) & (px < w - 1) & (py >= 0) & (py < h - 1)
                sample = first[np.clip(py, 0, h - 1.01).astype(int), np.clip(px, 0, w - 1.01).astype(int)]
                err = float(np.abs(sample - second[16:h - 16, 16:w - 16])[inside].mean()) + (1 - float(inside.mean())) * 40
                if best is None or err < best[0]:
                    best = (err, s, dx, dy)
    still = float(np.abs(first - second)[16:h - 16, 16:w - 16].mean())
    span = args.b - args.a
    print(f'第 {args.a} → {args.b} 帧（{span} 帧）：整个画面挪了 ({best[2]:+d}, {best[3]:+d}) 像素，'
          f'放大到 {best[1]:.3f} 倍；对上以后还剩 {best[0]:.2f} 的差（不许挪的话是 {still:.2f}）。'
          f'折成每帧：挪 ({best[2] / span:+.2f}, {best[3] / span:+.2f})，{100 * (best[1] - 1) / span:+.3f}%')


if __name__ == '__main__':
    main()
