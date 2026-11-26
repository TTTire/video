"""量一张画面里几块区域的外框。校准版面用：参考帧和自己的成片用同一套区域并排量，直接看出差几个像素。
用法：python3 scripts/measure/boxes.py <图片或视频> [--frame N] --区域 名字:x,y,w,h [--区域 …]
      [--色 dark] [--间隙 列间,行间] [--不拆] [--对比 另一个图片或视频] [--对比帧 N]
给的是视频就必须带 --frame。每块区域先给整体外框；没加 --不拆 时再按间隙给出里头的各个小块：
默认每段连着的文字给一个框（--间隙 60,40），要逐个字量就用 --间隙 5,8。
给了 --对比 就两行并排，前一个叫“参考”、后一个叫“我的”，最后一行是差值（我的减参考，单位像素）。
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import METRICS_CN, boxes, color_mask, crop, edges, fmt_box, is_image, parse_rect, read_frame  # noqa: E402

METRICS = ('left', 'right', 'top', 'bottom')
MAX_PARTS = 80  # 小块超过这个数多半是间隙给小了，列出来没法看


def measure(img, regions, color, gap_x, gap_y):
    """每块区域返回 (整体外框或 None, 小块列表)。坐标都换算回画面坐标。"""
    out = []
    for r in regions:
        x, y = r['rect'][0], r['rect'][1]
        m = color_mask(crop(img, r['rect']), color)
        whole = edges(m)
        parts = [(u + x, v + x, s + y, t + y) for u, v, s, t in boxes(m, gap_x, gap_y)] if whole else []
        out.append((whole, parts))
    return out


def parts_line(parts):
    return '  '.join(f'{p[0]}-{p[1]}×{p[2]}-{p[3]}' for p in parts) or '无'


def main():
    ap = argparse.ArgumentParser(description='量一张画面里几块区域的外框。')
    ap.add_argument('source', help='图片，或者视频（视频要带 --frame）')
    ap.add_argument('--frame', type=int, help='是视频时量第几帧（视频必须给）')
    ap.add_argument('--区域', dest='regions', action='append', required=True, help='名字:x,y,w,h，可以写多个')
    ap.add_argument('--色', dest='color', default='dark', help='dark / ink / red / yellow / lum<N，默认 dark')
    ap.add_argument('--间隙', default='60,40', help='小块之间隔多少像素以内算同一块：列间,行间，默认 60,40')
    ap.add_argument('--不拆', action='store_true', help='只给整体外框，不拆小块')
    ap.add_argument('--对比', dest='other', help='另一个图片或视频（自己的成片）')
    ap.add_argument('--对比帧', dest='other_frame', type=int, help='对比对象是视频时量第几帧（是视频就必须给）')
    a = ap.parse_args()
    for path, n, what in ((a.source, a.frame, '--frame'), (a.other, a.other_frame, '--对比帧')):
        if path and not is_image(path) and n is None:
            raise SystemExit(f'{path} 是视频，要先用 {what} 说明量第几帧')

    regions = [parse_rect(t, f'区域{i + 1}') for i, t in enumerate(a.regions)]
    gap_x, gap_y = (int(v) for v in a.间隙.split(','))
    ref = measure(read_frame(a.source, a.frame), regions, a.color, gap_x, gap_y)
    mine = measure(read_frame(a.other, a.other_frame), regions, a.color, gap_x, gap_y) if a.other else None

    for i, r in enumerate(regions):
        x, y, w, h = r['rect']
        rv, r_parts = ref[i]
        mv = mine[i][0] if mine else None
        m_parts = mine[i][1] if mine else []
        print(f'■ {r["name"]}（画面里 x{x} y{y} 宽{w} 高{h}，颜色 {a.color}）')
        print('  参考' if mine else '  外框', fmt_box(rv, x, y))
        if mine:
            print('  我的', fmt_box(mv, x, y))
            if (rv is None) != (mv is None):
                print('  差  ', '一边有一边没有')
            elif rv is not None:
                print('  差  ', '  '.join(f'{METRICS_CN[k]}{mv[j] - rv[j]:+d}' for j, k in enumerate(METRICS)))
        if a.不拆 or not (m_parts or r_parts):
            continue
        if max(len(m_parts), len(r_parts)) > MAX_PARTS:
            n = max(len(m_parts), len(r_parts))
            print(f'  小块太多（{n} 块），把 --间隙 调大一点再看')
            continue
        if ref:
            print('  小块（左-右×顶-底，按间隙拆开）')
            print('    参考', parts_line(r_parts))
            print('    我的', parts_line(m_parts))
        else:
            print('  小块（左-右×顶-底，按间隙拆开）', parts_line(m_parts))


if __name__ == '__main__':
    main()
