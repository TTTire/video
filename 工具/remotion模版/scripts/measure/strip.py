"""把一段换场按单帧铺开：一条视频一行；给了两条（参考、自己的成片）就上下各一行、同一列是同一个帧号，每格左上角印着帧号。
只看总览图（隔几帧取一帧）查不出只错一两帧的毛病：换卡那一帧闪成半透明、丝带断了重来、两组东西叠在一起、结尾空一帧。
交付前把每个换场用它铺一遍，两条视频上下对着看。
用法：python3 scripts/measure/strip.py <视频> [<自己的成片>] --frames 268-276 [--crop x,y,w,h] [--宽 260] [--列 8] [--out 图片.jpg]
      --frames 也可以写成 104,106,250-256，每段后面可以带步长：250-270:2
帧号是时间轴上的（见 _common.timeline_index）。给了两条时 --crop 按第一条视频的像素写，第二条按画面比例换算。
不填 --out 时存到最后一条视频旁边的 对照/逐帧-第<起>-<止>帧.jpg。
"""
import argparse
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _common import parse_rect, probe_size, timeline_index, video_length  # noqa: E402

# 0–9 的 3×5 点阵，用来在每格左上角印帧号（本机的 ffmpeg 没带画字的库）
DIGITS = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '010', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
}


def parse_frames(text):
    """'104,106,250-256,300-320:2' → 帧号列表（去重、从小到大）。"""
    out = set()
    for part in text.split(','):
        part = part.strip()
        if not part:
            continue
        rng, _, step = part.partition(':')
        a, _, b = rng.partition('-')
        step = int(step or 1)
        if step < 1 or (b and int(b) < int(a)):
            raise SystemExit(f'看不懂 --frames 里的「{part}」')
        out.update(range(int(a), int(b or a) + 1, step))
    return sorted(out)


def grab(video, f, size, rect=None):
    """读时间轴上的第 f 帧（只取 rect 这一块也行），缩成 size = (高, 宽)。"""
    filters = [f'select=eq({timeline_index(video)}\\,{f})']
    if rect:
        x, y, w, h = rect
        filters.append(f'crop={w}:{h}:{x}:{y}')
    filters.append(f'scale={size[1]}:{size[0]}:flags=lanczos')  # 钉死大小：crop 遇到奇数宽会少给一列
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', ','.join(filters), '-fps_mode', 'passthrough', '-frames:v', '1',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    if len(raw) < size[0] * size[1] * 3:
        raise SystemExit(f'{os.path.basename(video)} 里没有时间轴上的第 {f} 帧（它一共 {video_length(video)} 帧）')
    return np.frombuffer(raw[: size[0] * size[1] * 3], np.uint8).reshape(size[0], size[1], 3).copy()


def stamp(tile, number, unit):
    """在左上角印帧号：压暗一小块，上面一行亮黄的点阵字。unit 是一个点阵点几像素。"""
    glyphs = [DIGITS[ch] for ch in str(number)]
    cols = sum(len(g[0]) + 1 for g in glyphs)
    top, left = unit * 2, unit * 2
    patch = tile[top - unit: top + 6 * unit, left - unit: left + cols * unit + unit]
    tile[top - unit: top + 6 * unit, left - unit: left + cols * unit + unit] = (patch * 0.3).astype(np.uint8)
    x = left
    for g in glyphs:
        for r, line in enumerate(g):
            for c, bit in enumerate(line):
                if bit == '1':
                    tile[top + r * unit: top + (r + 1) * unit, x + c * unit: x + (c + 1) * unit] = (255, 235, 60)
        x += (len(g[0]) + 1) * unit


def join(items, gap, color, axis):
    """把几块图拼起来（axis=1 横着拼，axis=0 竖着拼），中间留一道 gap 像素宽、color 颜色的缝。"""
    if len(items) == 1:
        return items[0]
    shape = list(items[0].shape)
    shape[axis] = gap
    filler = np.full(shape, color, np.uint8)
    return np.concatenate(sum([[i, filler] for i in items], [])[:-1], axis=axis)


def main():
    ap = argparse.ArgumentParser(description='把一段换场按单帧铺开，每格印着帧号。')
    ap.add_argument('videos', nargs='+', help='一条视频，或者“参考视频 自己的成片”两条')
    ap.add_argument('--frames', required=True, help='要铺哪些帧，如 268-276 或 104,106,250-270:2')
    ap.add_argument('--crop', help='只看画面的一块：x,y,w,h（第一条视频的像素）')
    ap.add_argument('--宽', dest='tile', type=int, default=260, help='每格多宽（像素），默认 260')
    ap.add_argument('--列', dest='cols', type=int, default=8, help='一行最多几格，默认 8')
    ap.add_argument('--out', help='存成哪张图（jpg）')
    a = ap.parse_args()

    if len(a.videos) not in (1, 2):
        raise SystemExit('视频给一条，或者给两条（参考、自己的成片）')
    frames = parse_frames(a.frames)
    if not frames:
        raise SystemExit('--frames 里没有帧号')
    sizes = [probe_size(v) for v in a.videos]
    # 裁成奇数宽高时有的像素格式会直接报错，这里先裁成偶数
    base = parse_rect(a.crop, '')['rect'] if a.crop else (0, 0, *sizes[0])
    base = (base[0], base[1], base[2] - base[2] % 2, base[3] - base[3] % 2)
    rects = []
    for i, (w, h) in enumerate(sizes):
        k = w / sizes[0][0]  # 第二条视频按画面比例换算
        rect = base if not i else tuple(int(round(v * k)) for v in base)
        rect = (rect[0], rect[1], rect[2] - rect[2] % 2, rect[3] - rect[3] % 2)
        if rect[0] + rect[2] > w or rect[1] + rect[3] > h:
            raise SystemExit(f'{os.path.basename(a.videos[i])} 是 {w}×{h}，窗口 {a.crop} 超出去了')
        rects.append(rect)
    size = (max(2, int(round(a.tile * base[3] / base[2] / 2)) * 2), a.tile)
    unit = max(2, a.tile // 100)
    last = a.videos[-1]
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(last)), '对照', f'逐帧-第{frames[0]}-{frames[-1]}帧.jpg')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

    # 横着放不下的帧分到下一个“块”里；每个块里先铺第一条视频的一行，再铺第二条的
    rows = []
    for s in range(0, len(frames), a.cols):
        block = frames[s:s + a.cols]
        for video, rect in zip(a.videos, rects):
            tiles = []
            for f in block:
                tile = grab(video, f, size, rect)
                stamp(tile, f, unit)
                tiles.append(tile)
            width = a.cols if len(frames) > a.cols else len(block)  # 不满一行的块补空格，每一行才一样宽、能上下叠
            while len(tiles) < width:
                tiles.append(np.zeros((*size, 3), np.uint8))
            rows.append(join(tiles, 4, 190, axis=1))
    if len(a.videos) == 2:
        groups = [join(rows[i:i + 2], 10, 230, axis=0) for i in range(0, len(rows), 2)]  # 两条视频的两行是一组
        sheet = join(groups, 30, 30, axis=0)
    else:
        sheet = join(rows, 10, 230, axis=0)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{sheet.shape[1]}x{sheet.shape[0]}', '-i', '-',
                    '-frames:v', '1', '-q:v', '2', '-update', '1', out], input=sheet.tobytes(), check=True)
    who = '每组上面一行是第一条视频、下面一行是第二条；' if len(a.videos) == 2 else ''
    print(f'{out}  {sheet.shape[1]}×{sheet.shape[0]}，{who}每格左上角是帧号（时间轴上的）：' + '、'.join(map(str, frames)))


if __name__ == '__main__':
    main()
