"""逐帧量几块区域的位置和像素数。找每个动作的帧号、核对两条片子的节奏和轨迹都用它。
用法：python3 scripts/measure/track.py <视频> [--从 0] [--到 末帧] [--每 1] --区域 名字:x,y,w,h [--区域 …]
      [--色 dark] [--至少 3] [--指标 left,right,top,bottom,count]
      [--变化才列] [--容差 2] [--对比 视频] [--全部]
每帧一行：帧号、秒数，后面是每块区域的各种数（画面坐标）。某一帧的像素数不到「至少」就记作 -，表示这里还没有东西。
  只给一个视频：默认每帧都列；加 --变化才列 就只列和上一帧不同的行，动作发生在第几帧一眼能看出来。
  给了 --对比：两条片子逐帧并排（参考/我的），只列差超过「容差」的帧并在前面打 *；加 --全部 才每帧都列。
区域里混进别的东西（背景里的深色物、烧录字幕）会干扰，量哪一块就把它圈准一点。
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import METRICS_CN, color_mask, crop, edges, parse_rect, video_fps, video_frames, video_length  # noqa: E402


def measure(img, regions, metrics, at_least):
    """每块区域返回 {指标: 画面坐标}，或者 None（这里还没东西）。"""
    row = []
    for r in regions:
        x, y = r['rect'][0], r['rect'][1]
        e = edges(color_mask(crop(img, r['rect']), r['color']), at_least)
        if e is None:
            row.append(None)
        else:
            v = {k: e[i] for i, k in enumerate(METRICS_CN)}
            v['left'] += x
            v['right'] += x
            v['top'] += y
            v['bottom'] += y
            row.append({k: v[k] for k in metrics})
    return row


def differs(a, b, tol):
    """两行测量结果有没有超出容差的不同。"""
    for x, y in zip(a, b):
        if (x is None) != (y is None):
            return True
        if x and any(abs(x[k] - y[k]) > tol for k in x):
            return True
    return False


def cell(v, metrics):
    return '-'.join('-' if v is None else str(v[k]) for k in metrics)


def main():
    ap = argparse.ArgumentParser(description='逐帧量几块区域的位置和像素数。')
    ap.add_argument('video')
    ap.add_argument('--从', dest='start', type=int, default=0, help='从第几帧开始，默认 0')
    ap.add_argument('--到', dest='end', type=int, help='到第几帧为止，默认最后一帧')
    ap.add_argument('--每', dest='step', type=int, default=1, help='每隔几帧量一次')
    ap.add_argument('--区域', dest='regions', action='append', required=True, help='名字:x,y,w,h，可以写多个')
    ap.add_argument('--色', dest='color', default='dark', help='dark / ink / red / yellow / lum<N，默认 dark')
    ap.add_argument('--至少', dest='at_least', type=int, default=3, help='一块区域里至少要有几个像素才算有东西，默认 3')
    ap.add_argument('--指标', dest='metrics', default='left,right,top,bottom,count',
                    help='量哪些：left,right,top,bottom,count（默认全量）')
    ap.add_argument('--变化才列', dest='only_changes', action='store_true', help='只列和上一帧不同的行')
    ap.add_argument('--容差', dest='tol', type=int, default=2, help='差多少以内算没变，默认 2')
    ap.add_argument('--对比', dest='other', help='另一个视频（自己的成片），按同样的帧号逐帧比')
    ap.add_argument('--全部', dest='all', action='store_true', help='有 --对比 时也每帧都列')
    a = ap.parse_args()

    regions = []
    for i, t in enumerate(a.regions):
        r = parse_rect(t, f'区域{i + 1}')
        r['color'] = a.color
        regions.append(r)
    metrics = [m.strip() for m in a.metrics.split(',') if m.strip()]
    if any(m not in METRICS_CN for m in metrics):
        raise SystemExit('--指标 只认 ' + ','.join(METRICS_CN))
    end = a.end if a.end is not None else video_length(a.video) - 1
    fps = video_fps(a.video)

    print('每格依次是：' + '、'.join(METRICS_CN[m] for m in metrics) + '；有 --对比 时写成 参考/我的')
    print(f'{"":>2}{"帧":>4} {"秒":>6}  ' + '   '.join(r['name'] for r in regions))
    prev = None
    other = video_frames(a.other, a.start, end, a.step) if a.other else None
    for f, img in video_frames(a.video, a.start, end, a.step):
        row = measure(img, regions, metrics, a.at_least)
        if other:
            try:
                _, img2 = next(other)
            except StopIteration:
                break
            row2 = measure(img2, regions, metrics, a.at_least)
            flag = differs(row, row2, a.tol)
            if flag or a.all:
                cells = '   '.join(f'{cell(x, metrics)}/{cell(y, metrics)}' for x, y in zip(row, row2))
                print(f'{"*" if flag else " "}{f:>4} {f / fps:6.2f}  {cells}')
            continue
        if a.all or not a.only_changes or prev is None or differs(prev, row, a.tol):
            print(f' {f:>4} {f / fps:6.2f}  ' + '   '.join(cell(x, metrics) for x in row))
        prev = row


if __name__ == '__main__':
    main()
