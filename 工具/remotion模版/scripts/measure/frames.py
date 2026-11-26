"""把一段视频抽帧拼成总览图。拿到一段参考视频先跑它，看整段在讲什么、分几段、哪里有动作。
用法：python3 scripts/measure/frames.py <视频> [--every 2] [--from 0] [--to 239] [--crop x,y,w,h]
      [--cols 6] [--rows 5] [--tile 360] [--out 文件夹]
每页 cols×rows 格，从左到右、从上到下依次是第 from、from+every、… 帧（帧号从 0 数）。每页存成
sheet-<这页第一帧的帧号>.jpg，并打印每页对应哪些帧。不填 --out 时，库里模版的参考视频存到
out/<模版文件夹>/总览图/，别的视频存在视频旁边的 frames/。
"""
import argparse
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import lead_frames, parse_rect, timeline_index, video_length  # noqa: E402


def default_out(video):
    """默认存哪儿。视频是库里某个模版的参考视频（在 src/templates/<模版>/参考/ 下）时，存到 out/<模版>/总览图/，
    免得上百张图进到 git 和 Studio 的监视范围里；别的视频就存在视频旁边的 frames/。"""
    parts = os.path.abspath(video).split(os.sep)
    if 'templates' in parts:
        i = parts.index('templates')
        if i + 3 < len(parts) and parts[i + 2] == '参考':
            return os.path.join(os.sep.join(parts[:i - 1]), 'out', parts[i + 1], '总览图')
    return os.path.join(os.path.dirname(os.path.abspath(video)), 'frames')


def main():
    ap = argparse.ArgumentParser(description='把视频抽帧拼成总览图。')
    ap.add_argument('video')
    ap.add_argument('--every', type=int, default=2, help='每隔几帧取一帧，默认 2')
    ap.add_argument('--from', dest='start', type=int, default=0, help='从第几帧开始，默认 0')
    ap.add_argument('--to', dest='end', type=int, help='到第几帧为止，默认最后一帧')
    ap.add_argument('--crop', help='只看画面的一块：x,y,w,h')
    ap.add_argument('--cols', type=int, default=6, help='每页几列，默认 6')
    ap.add_argument('--rows', type=int, default=5, help='每页几行，默认 5')
    ap.add_argument('--tile', type=int, default=360, help='每格多宽（像素）')
    ap.add_argument('--out', help='输出文件夹')
    a = ap.parse_args()

    end = a.end if a.end is not None else video_length(a.video) - 1
    # 视频这一轨从时间轴的第 lead 帧才开始，前面那几帧是空的、没有图可取（大多是 0）。不挑掉的话格子会往后错位、帧号全标错
    lead = lead_frames(a.video)
    frames = [f for f in range(a.start, end + 1, a.every) if f >= lead]
    if not frames:
        raise SystemExit('这个范围里没有帧（帧号从 0 数，是时间轴上的）。')
    if a.start < lead:
        print(f'这一轨视频从时间轴的第 {lead} 帧才开始，前面是空的，总览图从第 {frames[0]} 帧起')
    out = a.out or default_out(a.video)
    os.makedirs(out, exist_ok=True)

    # 帧号按时间轴算（见 _common.timeline_index），别用 select 自带的 n
    ti = timeline_index(a.video)
    vf = f"select='between({ti}\\,{a.start}\\,{end})*not(mod({ti}-{a.start}\\,{a.every}))'"
    if a.crop:
        x, y, w, h = parse_rect(a.crop, '')['rect']
        vf += f',crop={w}:{h}:{x}:{y}'
    vf += f',scale={a.tile}:-2,tile={a.cols}x{a.rows}'
    # 先存成临时页，再按“这页第一帧的帧号”改名。最后一页不满的格子 tile 会补黑边。
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-i', a.video, '-vf', vf, '-fps_mode', 'vfr', '-q:v', '3',
         os.path.join(out, '_page-%03d.jpg')],
        check=True)
    pages = sorted(f for f in os.listdir(out) if re.fullmatch(r'_page-\d+\.jpg', f))
    per_page = a.cols * a.rows
    starts = list(range(0, len(frames), per_page))
    print(f'共 {len(frames)} 帧（第 {frames[0]} 到 {frames[-1]}，每隔 {a.every} 帧），每页 {a.cols}×{a.rows} 格，{out}/')
    for page, s in zip(pages, starts):
        last = frames[min(s + per_page, len(frames)) - 1]
        os.replace(os.path.join(out, page), os.path.join(out, f'sheet-{frames[s]:04d}.jpg'))
        print(f'  sheet-{frames[s]:04d}.jpg  第 {frames[s]} 到 {last} 帧')
    for page in pages[len(starts):]:  # 正常不会走到，留着兜底
        os.remove(os.path.join(out, page))


if __name__ == '__main__':
    main()
