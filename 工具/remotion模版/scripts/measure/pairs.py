"""把参考视频和自己的成片左右并排拼成对照图。每存一个模版都要出几张，放 out/<模版文件夹>/对照/ 里。
用法：python3 scripts/measure/pairs.py <参考视频> <自己的成片> --frames 3,9,40,50 [--crop x,y,w,h] [--宽 800] [--out 图片.jpg]
每一行是一帧：左边参考、右边自己的，按 --frames 给的顺序从上到下排。不填 --out 就存到成片旁边的 对照/ 里，
文件名带上帧号。两边按同样的帧号取帧，所以帧号要以参考为准（帧号是时间轴上的，见 _common.timeline_index）。
两边尺寸不同没关系，各缩到一样大；画幅比例不同（一个横屏一个竖屏）就不能用它。--crop 按参考的像素写，成片按比例换算。
"""
import argparse
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import parse_rect, probe_size, timeline_index  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description='把参考视频和自己的成片左右并排拼成对照图。')
    ap.add_argument('reference')
    ap.add_argument('mine')
    ap.add_argument('--frames', required=True, help='要拼哪些帧，如 3,9,40,50')
    ap.add_argument('--crop', help='只看画面的一块：x,y,w,h')
    ap.add_argument('--宽', dest='half', type=int, default=800, help='每一边多宽（像素），默认 800')
    ap.add_argument('--out', help='存成哪张图（jpg）')
    a = ap.parse_args()

    frames = [int(v) for v in a.frames.split(',') if v.strip()]
    if not frames:
        raise SystemExit('--frames 里没有帧号')
    sizes = [probe_size(p) if os.path.isfile(p) else None for p in (a.reference, a.mine)]
    for path, size in zip((a.reference, a.mine), sizes):
        if size is None:
            raise SystemExit(f'找不到文件：{path}')
    # 两边尺寸不一样没关系，各缩到一样大；画幅比例不同就没法一帧对一帧地并排
    (rw, rh), (mw, mh) = sizes
    base = parse_rect(a.crop, '')['rect'] if a.crop else (0, 0, rw, rh)
    height = int(round(a.half * base[3] / base[2]))  # 拼完以后每一边多高
    if not a.crop and abs(round(a.half * mh / mw) - height) > 2:  # 各缩到一样宽以后高矮差超过 2 像素
        raise SystemExit(f'两边画幅比例不同（{rw}×{rh} 和 {mw}×{mh}），没法一帧对一帧地并排。用 strip.py 分开铺，或者用 crops.py 各看各的')
    rects = [tuple(int(v * w / rw) - int(v * w / rw) % 2 for v in base) for w, _ in sizes]  # --crop 按参考的像素写，成片按比例换算
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(a.mine)), '对照',
                                '对照-第' + ','.join(map(str, frames)) + '帧.jpg')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    # 两边的帧号都按时间轴算（见 _common.timeline_index）；选出来以后重新编号时间戳，不然两条视频开头空得不一样时会把不同的帧拼到一行
    idx = [timeline_index(p) for p in (a.reference, a.mine)]

    # 两段视频各进来一次，每一帧各取一份、缩到同样大，左右拼成一行，再把各行上下叠起来
    parts, labels = [], []
    for i, f in enumerate(frames):
        for src, tag in ((0, 'a'), (1, 'b')):
            take = f"[{src}:v]select=eq({idx[src]}\\,{f}),setpts=N/TB/30"
            x, y, w, h = rects[src]
            if a.crop:
                take += f",crop={w}:{h}:{x}:{y}"
            parts.append(take + f",scale={a.half}:{height},setsar=1[{tag}{i}]")
        parts.append(f"[a{i}][b{i}]hstack[p{i}]")
        labels.append(f"[p{i}]")
    graph = ';'.join(parts) + f";{''.join(labels)}vstack=inputs={len(frames)}[out]"
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.reference, '-i', a.mine, '-filter_complex', graph,
                        '-map', '[out]', '-frames:v', '1', '-q:v', '3', out], check=True)
    except subprocess.CalledProcessError:
        raise SystemExit('拼图失败。多半是有一边的视频没有这么多帧：各自有多少帧可以用 ffprobe 查，或者用 frames.py 看一遍')
    print(f'{out}  从上到下依次是第 {"、".join(map(str, frames))} 帧，每行左边是参考、右边是自己的')


if __name__ == '__main__':
    main()
