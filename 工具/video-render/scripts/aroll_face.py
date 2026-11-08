"""出镜层跟脸：逐帧找 A-roll 里的脸 → 脸轨 src/<epN>/aroll-face.json，小圆 / 半屏卡按它把人对到中间。
用法（在 工具/video-render 下）：python3 scripts/aroll_face.py <epN>

为什么要它：分几条录、中间挪过位置，粗剪拼起来人在画面里的位置就不一样（AI04 实测：脸的横向位置在 0.43–0.54 之间来回跳），
固定一个 face 只能对准其中几段，别的段小圆里人偏到一边（260 圆里最多偏 72 px）。
怎么跟：
- 跳剪那一帧脸突然换了位置 → 取景跟着同一帧硬切（画面本来就在跳，看不出来）
- 同一条里人慢慢挪出 ±36 px（1080p，约画面宽 2%）→ 1 秒慢进慢出平移重新对中；没挪出去就不动——像摄影师补机位，不跟着说话的晃动走
- x = 脸框中心，y = 两眼连线（photo.json 的 bubbleFaceAt 就是两眼在圆里从上往下的位置）
- 本期 photo.json 的 aroll 写了 "faceTrack": false 就不跟（老期都写了，重渲不变样）
render.py / render_seq.py 渲出镜层合成前自动调 ensure()：没有脸轨、或代理换过（文件大小对不上）就先跑这个，约 1 分钟。
跑完会重写 src/photo/faces.ts（按 src/*/aroll-face.json 生成的 import 表，register.tsx 从这里取脸轨）。

依赖：pip install opencv-python-headless（Mac 用 pip3）。模型 assets/models/face_detection_yunet_2023mar.onnx（OpenCV Zoo YuNet，MIT，232 KB）。
"""
import glob, json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = f"{ROOT}/assets/models/face_detection_yunet_2023mar.onnx"
FPS = 30
DET_W = 480       # 检测分辨率（宽）。正常半身机位脸约占画面宽 11%，480 宽时约 50 px，YuNet 的框和眼睛点都稳
JUMP = 0.012      # 相邻两帧脸挪了画面宽的 1.2% 以上 = 跳剪换位。AI04 逐帧实测：说话晃动单帧最多 0.9%，换位的跳剪 1.2%–9.3%
TOL_PX = 36       # 同一条里挪出 ±36 px（1080p）才重新对中：260 圆里约 14 px，看不出偏
SMOOTH = 31       # 判断挪没挪之前先做 1 秒滑动中位数，点头、说话的晃动不算
MIN_HOLD = 60     # 一个取景至少停 2 秒
PAN = 30          # 重新对中的平移 1 秒（慢进慢出在 aroll.tsx 里做）
NOTE = "aroll_face.py 生成。keys = [帧, x, y]，x 脸框中心、y 两眼连线，都是 A-roll 画面的比例；相邻两个关键帧之间慢进慢出，帧号只差 1 的是跳剪处硬切"


def comp_of(ep):
    if ep.lower().startswith("ep"): return "Ep" + ep[2:].upper()
    if ep.lower().startswith("ai"): return "Ai" + ep[2:]
    return ep


def track_path(ep):
    return f"{ROOT}/src/{ep}/aroll-face.json"


def aroll_of(ep):
    return json.load(open(f"{ROOT}/src/{ep}/photo.json", encoding="utf-8")).get("aroll")


def fmt(f):
    s = f / FPS
    return f"{int(s // 60):02d}:{s % 60:04.1f}"


def detect(path):
    """逐帧 YuNet，返回 (xs, ys, 宽, 高)：每帧最大那张脸的框中心 x、两眼连线 y（画面比例），没找到是 nan。"""
    import numpy as np
    try:
        import cv2
    except ImportError:
        sys.exit("跟脸要 OpenCV：python -m pip install opencv-python-headless（Mac 用 pip3）。"
                 "这期不跟脸就在 photo.json 的 aroll 里写 \"faceTrack\": false")
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,nb_frames",
                                      "-of", "json", path], capture_output=True, text=True, check=True).stdout)["streams"][0]
    w, h, total = info["width"], info["height"], int(info.get("nb_frames") or 0)
    W, H = DET_W, round(DET_W * h / w / 2) * 2
    cv2.utils.logging.setLogLevel(cv2.utils.logging.LOG_LEVEL_ERROR)   # OpenCV 5 的新推理引擎建检测器时打一行 "Targets are not supported" 的 WARN，无害
    # 模型按字节读进去：cv2 直接读路径在 Windows 中文路径（E:\视频脚本）下会失败
    det = cv2.FaceDetectorYN.create("onnx", np.fromfile(MODEL, np.uint8), np.zeros(0, np.uint8), (W, H), 0.6, 0.3, 50)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-an", "-vf", f"scale={W}:{H}:flags=area",
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE, bufsize=W * H * 3 * 4)
    xs, ys, size, t0, shown = [], [], W * H * 3, time.time(), 0
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size: break
        _, faces = det.detect(np.frombuffer(buf, np.uint8).reshape(H, W, 3))
        if faces is None or len(faces) == 0:
            xs.append(np.nan); ys.append(np.nan)
        else:
            r = max(faces, key=lambda r: r[2] * r[3])   # 一行 = 框 x y w h、右眼 xy、左眼 xy、鼻尖、两个嘴角、置信度
            xs.append((r[0] + r[2] / 2) / W); ys.append((r[5] + r[7]) / 2 / H)
        if total and len(xs) * 5 // total > shown:
            shown = len(xs) * 5 // total
            print(f"  {len(xs) * 100 // total}%  {time.time() - t0:.0f} 秒", flush=True)
    if p.wait() != 0: sys.exit(f"ffmpeg 解码 {path} 失败")
    return np.array(xs), np.array(ys), w, h


def runmed(a, k):
    import numpy as np
    k = min(k, len(a) if len(a) % 2 else len(a) - 1)
    if k < 3: return a.copy()
    pad = np.pad(a, k // 2, mode="edge")
    return np.median(np.lib.stride_tricks.sliding_window_view(pad, k), axis=1)


def find_cuts(x, y, aspect):
    """跳剪换位：中值去噪后相邻两帧脸挪了 > JUMP，而且前后 6 帧各自是稳的（是一步跳过去，不是人自己快速挪过去）。"""
    import numpy as np
    mx, my = runmed(x, 5), runmed(y, 5)
    d = np.hypot(np.diff(mx), np.diff(my) * aspect)
    cuts = []
    for i in np.where(d > JUMP)[0]:
        c = int(i) + 1
        step = np.hypot(np.median(mx[c:c + 6]) - np.median(mx[max(0, c - 6):c]), (np.median(my[c:c + 6]) - np.median(my[max(0, c - 6):c])) * aspect)
        if step > JUMP and d[i] > 0.6 * step and (not cuts or c - cuts[-1] > 3):
            cuts.append(c)
    return cuts


def holds_of(sx, sy, tx, ty):
    """一条之内切成若干个"停住的取景"：每段里 1 秒中位数的晃动不超出 ±tol，短于 2 秒的并给更近的邻段。返回 [起, 止) 列表。"""
    hs, a = [], 0
    lox = hix = sx[0]; loy = hiy = sy[0]
    for i in range(1, len(sx)):
        nlx, nhx, nly, nhy = min(lox, sx[i]), max(hix, sx[i]), min(loy, sy[i]), max(hiy, sy[i])
        if nhx - nlx > 2 * tx or nhy - nly > 2 * ty:
            hs.append([a, i]); a = i
            lox = hix = sx[i]; loy = hiy = sy[i]
        else:
            lox, hix, loy, hiy = nlx, nhx, nly, nhy
    hs.append([a, len(sx)])
    val = lambda h: ((sx[h[0]:h[1]].min() + sx[h[0]:h[1]].max()) / 2, (sy[h[0]:h[1]].min() + sy[h[0]:h[1]].max()) / 2)
    while len(hs) > 1:
        i = min(range(len(hs)), key=lambda j: hs[j][1] - hs[j][0])
        if hs[i][1] - hs[i][0] >= MIN_HOLD: break
        v = val(hs[i])
        j = min((j for j in (i - 1, i + 1) if 0 <= j < len(hs)), key=lambda j: abs(val(hs[j])[0] - v[0]) / tx + abs(val(hs[j])[1] - v[1]) / ty)
        lo = min(i, j)
        hs[lo:lo + 2] = [[hs[lo][0], hs[lo + 1][1]]]
    return [(a, b, *val([a, b])) for a, b in hs]


def keys_of(segments):
    """[[(起, 止, x, y), ...] 每条一组] → 关键帧 [帧, x, y]。一条之内相邻取景之间 PAN 帧平移；条与条之间相邻两帧硬切。"""
    keys = []
    for hs in segments:
        half = [min(PAN // 2, (p[1] - p[0]) // 2, (q[1] - q[0]) // 2) for p, q in zip(hs, hs[1:])]
        for j, (a, b, x, y) in enumerate(hs):
            s = a + (half[j - 1] if j else 0)
            e = b - 1 if j == len(hs) - 1 or not half[j] else b - half[j]
            for f in (s, e):
                if not keys or keys[-1][0] != f: keys.append([f, round(float(x), 4), round(float(y), 4)])
    return keys


def at(keys, f):
    """和 aroll.tsx 的 faceAt 同一套插值（供报告算偏差）。"""
    import bisect
    i = bisect.bisect_right([k[0] for k in keys], f) - 1
    if i < 0: return keys[0][1:]
    if i >= len(keys) - 1: return keys[-1][1:]
    a, b = keys[i], keys[i + 1]
    t = (f - a[0]) / (b[0] - a[0])
    k = 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2
    return a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k


def sync_module():
    """按 src/*/aroll-face.json 重写 src/photo/faces.ts（静态 import 表）。"""
    eps = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(f"{ROOT}/src/*/aroll-face.json"))
    lines = ["// 出镜层脸轨：scripts/aroll_face.py 按 src/*/aroll-face.json 生成，别手改", "import type {FaceKey} from './aroll';"]
    lines += [f"import {ep} from '../{ep}/aroll-face.json';" for ep in eps]
    lines += ["", "export const FACE_TRACKS: Record<string, FaceKey[]> = {"]
    lines += [f"  {comp_of(ep)}: {ep}.keys as FaceKey[]," for ep in eps]
    lines += ["};", ""]
    open(f"{ROOT}/src/photo/faces.ts", "w", encoding="utf-8", newline="\n").write("\n".join(lines))


def build(ep):
    import numpy as np
    ar = aroll_of(ep)
    if not ar: sys.exit(f"{ep} 的 photo.json 没有 aroll")
    src = f"{ROOT}/public/{ar['src']}"
    if not os.path.exists(src): sys.exit(f"没有 {src}：先按 SKILL.md 3b 转 1080p 静音代理")
    print(f"{ep} 跟脸：{ar['src']}")
    t0 = time.time()
    xs, ys, w, h = detect(src)
    n, aspect = len(xs), h / w
    found = ~np.isnan(xs)
    if found.sum() < n * 0.2: sys.exit(f"只有 {found.mean():.0%} 的帧找到脸，跟不了：检查代理是不是这期的 A-roll；不跟就写 \"faceTrack\": false")
    idx = np.arange(n)
    x, y = np.interp(idx, idx[found], xs[found]), np.interp(idx, idx[found], ys[found])   # 没找到脸的帧（转头、挡住）按前后补
    cuts = find_cuts(x, y, aspect)
    tx, ty = TOL_PX / 1920, TOL_PX / 1080   # 容差按 1080p 像素定，换成画面比例
    sx, sy = np.empty(n), np.empty(n)
    segments = []
    for a, b in zip([0] + cuts, cuts + [n]):
        sx[a:b], sy[a:b] = runmed(x[a:b], SMOOTH), runmed(y[a:b], SMOOTH)
        segments.append([(a + s, a + e, vx, vy) for s, e, vx, vy in holds_of(sx[a:b], sy[a:b], tx, ty)])
    keys = keys_of(segments)
    json_keys = ",\n".join("    " + json.dumps(k) for k in keys)
    head = json.dumps({"src": ar["src"], "bytes": os.path.getsize(src), "frames": n, "note": NOTE}, ensure_ascii=False)[:-1]
    open(track_path(ep), "w", encoding="utf-8", newline="\n").write(f"{head}, \"keys\": [\n{json_keys}\n]}}\n")
    sync_module()

    # ---- 报告 ----
    print(f"{n} 帧（{fmt(n)}），{found.mean():.1%} 的帧找到脸，用时 {time.time() - t0:.0f} 秒")
    pans = sum(len(s) - 1 for s in segments)
    print(f"跳剪换位 {len(cuts)} 处、同一条里重新对中 {pans} 处：")
    for i, s in enumerate(segments):
        for j, (a, b, vx, vy) in enumerate(s):
            how = "开头" if i == 0 and j == 0 else "跳剪" if j == 0 else "平移"
            print(f"  {fmt(a)}–{fmt(b)}  x {vx:.3f}  y {vy:.3f}  {how}")
    d0 = (ar.get("bubble") or {}).get("d", 260)
    view, face_at = ar.get("bubbleView", 0.62), ar.get("bubbleFaceAt", 0.32)
    k = d0 / (view * 1080) * 1920   # 画面比例 → 小圆里的像素
    tr = np.array([at(keys, f)[0] for f in range(n)])
    fx = (ar.get("face") or [0.5, 0.42])[0]
    print(f"小圆（直径 {d0}）里人偏离圆心（横向）：固定 face x={fx} 时最多 {np.abs(sx - fx).max() * k:.0f} px，"
          f"跟脸后最多 {np.abs(sx - tr).max() * k:.0f} px（95% 的时间 ≤ {np.percentile(np.abs(sx - tr), 95) * k:.0f} px）")
    # 人太靠边 / 太低时视频盖不满圆，aroll.tsx 会夹住不露黑边，这几段对不了中
    hw, top = view * 1080 / 2 / 1920, face_at * view
    for s in segments:
        for a, b, vx, vy in s:
            off = max(hw - vx, vx - (1 - hw), 0) * k + max(top - vy, vy - (1 - view + top), 0) * d0 / view
            if off > 6: print(f"  ⚠ {fmt(a)}–{fmt(b)} 人太靠边，小圆最多只能对到差 {off:.0f} px")
    print(f"→ {os.path.relpath(track_path(ep), ROOT)}")


def ensure(ep):
    """渲出镜层合成前调：本期要跟脸、脸轨没有或代理换过就先跑。返回 True = 刚重新生成（之前渲好的帧作废）。"""
    ar = aroll_of(ep)
    if not ar or ar.get("faceTrack") is False: return False
    src = f"{ROOT}/public/{ar['src']}"
    if not os.path.exists(src): return False   # 缺代理让 Remotion 自己报
    if os.path.exists(track_path(ep)):
        t = json.load(open(track_path(ep), encoding="utf-8"))
        if t.get("src") == ar["src"] and t.get("bytes") == os.path.getsize(src): return False
        print(f"{ep} 的 A-roll 代理换过（和脸轨记的文件大小对不上），重新跟脸")
    else:
        print(f"{ep} 还没有脸轨，先跟脸（约 1 分钟）")
    build(ep)
    return True


if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    build(sys.argv[1])
