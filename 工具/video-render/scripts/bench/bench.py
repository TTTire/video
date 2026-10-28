"""渲染方式小范围对比测试（只测视频，全部 --muted）。
用法（在 工具/video-render 下）：python3 scripts/bench/bench.py <方式> [起帧] [止帧]
方式：A A8 Apng B C D P{进程}x{并发} S{进程}x{并发}；环境变量 GL=egl|vulkan|swiftshader 换后端
先打包：npx remotion bundle src/index.ts --out-dir out/bench/bundle
结果追加到 out/bench/results.jsonl，产物在 out/bench/<方式>/
"""
import json, os, subprocess, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BENCH = f"{ROOT}/out/bench"
BUNDLE = f"{BENCH}/bundle"
COMP = os.environ.get("COMP", "Ep8Photo")
method = sys.argv[1]
start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
end = int(sys.argv[3]) if len(sys.argv) > 3 else 899
total = end - start + 1
GL = os.environ.get("GL")
TAG = method + (f"-{GL}" if GL else "") + ("-shell" if os.environ.get("BROWSER") else "")
outdir = f"{BENCH}/{TAG}"
subprocess.run(["rm", "-rf", outdir])
os.makedirs(outdir)

# ---- 内存采样：统计本脚本所有子孙进程（node + Chrome）的 RSS 总和 ----
peak = {"mb": 0}
stop = threading.Event()

def sampler():
    me = os.getpid()
    while not stop.is_set():
        rows = subprocess.run(["ps", "-A", "-o", "pid=,ppid=,rss="], capture_output=True, text=True).stdout.split("\n")
        kids, rss = {}, {}
        for r in rows:
            p = r.split()
            if len(p) == 3:
                kids.setdefault(int(p[1]), []).append(int(p[0]))
                rss[int(p[0])] = int(p[2])
        todo, s = [me], 0
        while todo:
            x = todo.pop()
            for c in kids.get(x, []):
                s += rss.get(c, 0)
                todo.append(c)
        peak["mb"] = max(peak["mb"], s / 1024)
        time.sleep(1)

def render(a, b, out, conc=None, extra=()):
    cmd = ["npx", "remotion", "render", BUNDLE, COMP, out, "--muted", "--log=error"]
    if not any(x.startswith("--frames=") for x in extra):
        cmd.append(f"--frames={a}-{b}")
    if not out.endswith("/"):
        cmd += ["--codec=h264", "--crf=18"]
    if conc:
        cmd.append(f"--concurrency={conc}")
    cmd += list(extra)
    if GL:
        cmd.append(f"--gl={GL}")
    if os.environ.get("BROWSER"):
        cmd.append(f"--browser-executable={os.environ['BROWSER']}")
    t = time.time()
    limit = max(120, (b - a + 1) / 2)          # 超时：按每秒至少 2 帧算，最少 2 分钟
    for attempt in range(3):
        try:
            r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=limit)
            if r.returncode == 0:
                return time.time() - t
            print(r.stderr[-800:])
            detail["fail"] = detail.get("fail", 0) + 1
        except subprocess.TimeoutExpired:
            detail["hang"] = detail.get("hang", 0) + 1
            subprocess.run(["pkill", "-f", out])   # 卡死的那个 remotion 进程
        print(f"retry {a}-{b} #{attempt + 1}", flush=True)
    raise SystemExit(f"render failed: {a}-{b}")

def split(n):
    step = total // n
    edges = [start + i * step for i in range(n)] + [end + 1]
    return [(edges[i], edges[i + 1] - 1) for i in range(n)]

def concat(parts, out):
    lst = f"{outdir}/list.txt"
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    t = time.time()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out], check=True)
    return time.time() - t

threading.Thread(target=sampler, daemon=True).start()
t0 = time.time()
detail = {}
final = f"{outdir}/final.mp4"

if method == "A":      # 现状：单进程整段，默认并发
    detail["render"] = render(start, end, final)
elif method == "Apng":  # 单进程整段，截图改 png
    detail["render"] = render(start, end, final, extra=["--image-format=png"])
elif method == "A8":   # 单进程整段，并发拉满 8
    detail["render"] = render(start, end, final, conc=8)
elif method == "B":    # 分 3 段串行，默认并发，-c copy 拼接
    parts = []
    for i, (a, b) in enumerate(split(3)):
        p = f"{outdir}/part{i}.mp4"
        detail[f"part{i}"] = render(a, b, p)
        parts.append(p)
    detail["concat"] = concat(parts, final)
elif method == "C":    # 分 4 段，2 个进程并行，各并发 4
    jobs = [(i, a, b, f"{outdir}/part{i}.mp4") for i, (a, b) in enumerate(split(4))]
    with ThreadPoolExecutor(2) as ex:
        for (i, _, _, _), d in zip(jobs, ex.map(lambda j: render(j[1], j[2], j[3], conc=4), jobs)):
            detail[f"part{i}"] = d
    detail["concat"] = concat([j[3] for j in jobs], final)
elif method.startswith("P"):  # P{进程数}x{每进程并发}，切成 进程数×2 段
    w, c = map(int, method[1:].split("x"))
    jobs = [(i, a, b, f"{outdir}/part{i}.mp4") for i, (a, b) in enumerate(split(w * 2))]
    with ThreadPoolExecutor(w) as ex:
        for (i, _, _, _), d in zip(jobs, ex.map(lambda j: render(j[1], j[2], j[3], conc=c), jobs)):
            detail[f"part{i}"] = d
    detail["concat"] = concat([j[3] for j in jobs], final)
elif method.startswith("S"):  # S{进程数}x{并发}：并行出图片序列 → 编码 → 查花屏 → 只重渲坏帧 → 再编码
    w, c = map(int, method[1:].split("x"))
    frames = f"{outdir}/frames/"
    seq = ["--sequence", "--image-format=jpeg", "--jpeg-quality=95"]
    jobs = split(w * 2)
    t = time.time()
    with ThreadPoolExecutor(w) as ex:
        list(ex.map(lambda j: render(j[0], j[1], frames, conc=c, extra=seq), jobs))
    detail["render"] = time.time() - t

    def encode():
        t = time.time()
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", "30", "-pattern_type", "glob", "-i", f"{frames}*.jpeg",
                        "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", final], check=True)
        detail["encode"] = detail.get("encode", 0) + time.time() - t

    def glitches():
        t = time.time()
        out = subprocess.check_output(["python3", os.path.join(os.path.dirname(os.path.abspath(__file__)), "glitch.py"), frames, str(start), "--all"], text=True)
        detail["detect"] = detail.get("detect", 0) + time.time() - t
        return [int(x) for x in out.split("BAD:")[1].split()] if "BAD:" in out else []

    for rnd in range(4):
        bad = glitches()
        detail[f"bad{rnd}"] = len(bad)
        if not bad:
            break
        t = time.time()
        tmp = f"{outdir}/fix{rnd}/"
        render(bad[0], bad[0], tmp, conc=c, extra=seq + [f"--frames={','.join(map(str, bad))}"])
        for f in os.listdir(tmp):
            os.replace(tmp + f, frames + f)
        detail[f"fix{rnd}"] = time.time() - t
    encode()
elif method == "D":    # 先出 jpeg 图片序列（逐帧可续渲），再 ffmpeg 编码
    frames = f"{outdir}/frames/"
    detail["render"] = render(start, end, frames, extra=["--sequence", "--image-format=jpeg", "--jpeg-quality=95"])
    t = time.time()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", "30", "-pattern_type", "glob", "-i", f"{frames}*.jpeg",
                    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", final], check=True)
    detail["encode"] = time.time() - t
else:
    sys.exit(__doc__)

wall = time.time() - t0
stop.set()
nb = int(subprocess.check_output(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
                                  "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", final]).decode().strip().strip(","))
res = {"method": TAG, "frames": total, "range": f"{start}-{end}", "wall_s": round(wall, 1),
       "fps": round(total / wall, 2), "peak_mem_mb": round(peak["mb"]), "out_frames": nb,
       "size_mb": round(os.path.getsize(final) / 1e6, 1), "detail": {k: round(v, 1) for k, v in detail.items()},
       "at": time.strftime("%Y-%m-%d %H:%M:%S")}
print(json.dumps(res, ensure_ascii=False))
open(f"{BENCH}/results.jsonl", "a").write(json.dumps(res, ensure_ascii=False) + "\n")
