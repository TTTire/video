"""量帧小工具共用的部分：把图片或视频读成数组、按颜色取掩码、找连续段。自己不单独运行。"""
import json
import re
import subprocess

import numpy as np

IMAGE_EXT = ('png', 'jpg', 'jpeg', 'webp')

# edges() 返回值的顺序，以及各指标在输出里叫什么
METRICS_CN = {'left': '左', 'right': '右', 'top': '顶', 'bottom': '底', 'count': '像素'}


def is_image(path):
    return path.lower().rsplit('.', 1)[-1] in IMAGE_EXT


def probe_size(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
        capture_output=True, text=True, check=True).stdout.strip()
    w, h = out.split(',')[:2]
    return int(w), int(h)


def video_length(path):
    """视频在时间轴上一共多少帧（开头空出来的那几帧也算在内）。容器没记帧数时按时长×帧率估。"""
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
         'stream=nb_frames,r_frame_rate,start_time:format=duration', '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    s = info['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    lead = round(float(s.get('start_time') or 0) * int(num) / int(den))  # 开头空了几帧，见 lead_frames()
    if s.get('nb_frames') not in (None, 'N/A'):
        return int(s['nb_frames']) + lead
    return int(round(float(info['format']['duration']) * int(num) / int(den)))


def video_fps(path):
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', path],
        capture_output=True, text=True, check=True).stdout
    m = re.search(r'(\d+)\s*/\s*(\d+)', out)
    if not m:
        raise SystemExit(f'读不出 {path} 的帧率')
    return int(m.group(1)) / int(m.group(2))


def timeline_index(path):
    """ffmpeg 表达式：当前帧在时间轴上是第几帧（时间戳 × 帧率，四舍五入）。给 select 用，里面的逗号已经转义好可以直接拼：
    select=eq(<这个>\\,12)。
    不要用 select 自带的 n：那是“第几个解出来的帧”，视频这一轨不是从 0 秒开始时（录屏、剪辑软件导出的常这样），它比时间轴上的帧号小。
    05 的参考开头空了 5 帧：用 n 取“第 12 帧”其实是时间轴上的第 17 帧，并排一比，参考永远比成片快 5 帧。"""
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'default=noprint_wrappers=1:nokey=1', path],
        capture_output=True, text=True, check=True).stdout
    m = re.search(r'(\d+)\s*/\s*(\d+)', out)
    if not m:
        raise SystemExit(f'读不出 {path} 的帧率')
    num, den = int(m.group(1)), int(m.group(2))
    return f'floor(t*{num}/{den}+0.5)' if den != 1 else f'floor(t*{num}+0.5)'


def lead_frames(path):
    """这一轨视频从时间轴的第几帧才开始（前面是空的）。一般都是 0。"""
    s = json.loads(subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=start_time,r_frame_rate', '-of', 'json', path],
        capture_output=True, text=True, check=True).stdout)['streams'][0]
    if s.get('start_time') in (None, 'N/A'):
        return 0
    num, den = (int(v) for v in s['r_frame_rate'].split('/'))
    return int(round(float(s['start_time']) * num / den))


def read_frame(path, n=0):
    """读时间轴上的第 n 帧，返回 (高, 宽, 3) 的 uint8 数组（帧号怎么算见 timeline_index）。path 是图片就忽略帧号。"""
    w, h = probe_size(path)
    cmd = ['ffmpeg', '-v', 'error', '-i', path]
    if not is_image(path):
        cmd += ['-vf', f'select=eq({timeline_index(path)}\\,{n})', '-fps_mode', 'passthrough', '-frames:v', '1']
    raw = subprocess.run(cmd + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    if len(raw) < w * h * 3:
        raise SystemExit(f'{path} 里没有时间轴上的第 {n} 帧')
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)


def video_frames(path, start=0, end=None, step=1):
    """逐帧读视频，只在 start 到 end 之间每隔 step 帧让出一对 (帧号, 数组)。帧号是时间轴上的：开头空出来的几帧用第一帧补上，
    所以和 read_frame、timeline_index 是同一套帧号。"""
    w, h = probe_size(path)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    f = 0
    while True:
        buf = p.stdout.read(w * h * 3)
        if len(buf) < w * h * 3 or (end is not None and f > end):
            break
        if f >= start and (f - start) % step == 0:
            yield f, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        f += 1
    p.stdout.close()
    p.wait()


def color_mask(img, kind):
    """按颜色类别取布尔掩码。kind 是下面之一：
    dark   近黑且不带色散的颜色，量深色字用（色散出来的蓝边红边不算）
    ink    任何深色像素
    red    红色，量红色文字用；mp4 里的细笔画会被压缩冲淡，所以阈值放得比较宽
    yellow 黄色高亮块
    lum<N  平均亮度低于 N
    """
    r = img[..., 0].astype(np.int16)
    g = img[..., 1].astype(np.int16)
    b = img[..., 2].astype(np.int16)
    if kind == 'dark':
        return (r < 95) & (g < 95) & (b < 105) & (np.abs(r - b) < 45)
    if kind == 'ink':
        return (r + g + b) < 330
    if kind == 'red':
        return (r > 140) & ((r - np.maximum(g, b)) > 70)
    if kind == 'yellow':
        return (r > 180) & (g > 130) & (b < 110)
    if kind.startswith('lum<'):
        return (r + g + b) < 3 * float(kind[4:])
    raise SystemExit(f'看不懂的颜色类别：{kind}')


def runs(mask, gap=0):
    """一维布尔序列里为真的连续段，间隔不超过 gap 的并成一段。返回 [(起, 止)]，含头含尾。"""
    idx = np.flatnonzero(mask)
    out = []
    if idx.size == 0:
        return out
    s = e = idx[0]
    for i in idx[1:]:
        if i - e > gap:
            out.append((int(s), int(e)))
            s = i
        e = i
    out.append((int(s), int(e)))
    return out


def boxes(mask, gap_x=0, gap_y=0):
    """二维掩码里的块：先按列切成几段，再在每段里按行切。返回 [(左, 右, 顶, 底)]，坐标相对掩码左上角。"""
    out = []
    for x0, x1 in runs(mask.any(axis=0), gap_x):
        for y0, y1 in runs(mask[:, x0:x1 + 1].any(axis=1), gap_y):
            out.append((x0, x1, y0, y1))
    return out


def edges(mask, at_least=1):
    """掩码的 左 右 顶 底 像素数；像素数不到 at_least 就当这里什么都没有，返回 None。"""
    n = int(mask.sum())
    if n < at_least:
        return None
    xs = np.flatnonzero(mask.any(axis=0))
    ys = np.flatnonzero(mask.any(axis=1))
    return int(xs[0]), int(xs[-1]), int(ys[0]), int(ys[-1]), n


def parse_rect(text, fallback_name):
    """解析「名字:x,y,w,h」，名字和冒号可以省略。「x,y,w,h」要以数字开头，用来区分有没有名字。"""
    name, _, rest = text.partition(':')
    if not rest or not rest[0].isdigit():
        name, rest = fallback_name, text
    try:
        x, y, w, h = (int(v) for v in rest.split(','))
    except ValueError:
        raise SystemExit(f'区域要写成 名字:x,y,w,h，收到的是「{text}」')
    return {'name': name, 'rect': (x, y, w, h)}


def crop(img, rect):
    x, y, w, h = rect
    return img[y:y + h, x:x + w]


def fmt_box(e, ox=0, oy=0):
    """把 edges() 的结果写成一行。ox、oy 是区域在画面里的偏移，加回去才是画面坐标。"""
    if e is None:
        return '无'
    return f'左{e[0] + ox} 右{e[1] + ox} 顶{e[2] + oy} 底{e[3] + oy}（宽{e[1] - e[0] + 1} 高{e[3] - e[2] + 1} 像素{e[4]}）'
