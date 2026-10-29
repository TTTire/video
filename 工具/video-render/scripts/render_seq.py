"""分段渲染：并行出图片序列 → 查花屏帧（兜底）→ 编码 → 合入音频。
比单进程整段渲染快、能断点续渲、单段卡死只重跑那一段。
背景和测试数据见 docs/渲染方式测试-2026-10-28.md。

花屏帧只在用本机 Chrome 时出现（USE_SYSTEM_CHROME=1）；默认的 chrome-headless-shell 零坏帧，
查花屏这一步基本是空跑（整期约 1 分钟），留着当兜底，可以用 --no-check 跳过。

用法（在 工具/video-render 下）：
  python3 scripts/render_seq.py <epN> [选项]
选项：
  --comp <合成 id>        默认由期号推出：ep8 → Ep8Photo，ai01 → Ai01Photo；带字幕核对版传 Ep8PhotoCheck
  --frames <a-b>          只渲一段（默认整片）
  --out <文件>            默认 out/<epN>-photo.mp4
  --audio-from <文件>     直接拷贝这个文件里的音轨（画面重出、音频不变时用）；不写就单独渲一次整轨音频
  --no-audio              只要画面
  --workers 2 --concurrency 2   并行进程数 × 每进程并发（实测 2×2 最稳，3×3 稍快但内存近 5 GB）
  --chunk 300             每个渲染任务的帧数（越小断点续渲越细）
  --fresh                 清掉之前的图片序列从头渲（改过 photo.json / 代码后必须加）
  --keep                  完成后保留图片序列（默认删除，整期约 4–5 GB）
  --no-check              跳过查花屏（确认用的是 headless shell 时可以省约 1 分钟）

断点续渲：中途崩了直接重跑同一条命令（不加 --fresh），已经出好的帧不会重出。
每个任务有超时，卡死自动杀掉重试，最多 3 次。
"""
import argparse, glob, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
JPEG_MB = 0.4  # 每帧 jpeg 约 0.37 MB


def comp_of(ep):
    if ep.lower().startswith("ep"):
        return "Ep" + ep[2:].upper()
    if ep.lower().startswith("ai"):
        return "Ai" + ep[2:]
    return ep


def log(msg):
    print(time.strftime("[%H:%M:%S] ") + msg, flush=True)


def run(cmd, timeout=None):
    """跑命令；超时就杀掉整个进程组（含 Chrome），返回 (成功, 输出尾部)。"""
    win = os.name == "nt"
    cmd = [shutil.which(cmd[0]) or cmd[0], *cmd[1:]]  # Windows 上 npx 实为 npx.cmd
    kw = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if win else {"start_new_session": True}
    p = subprocess.Popen(cmd, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                         encoding="utf-8", errors="replace", **kw)
    try:
        out, _ = p.communicate(timeout=timeout)
        return p.returncode == 0, (out or "")[-1500:]
    except subprocess.TimeoutExpired:
        if win:
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)], capture_output=True)
        else:
            os.killpg(p.pid, 9)
        p.communicate()
        return False, "超时，已杀掉"


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("ep")
    ap.add_argument("--comp")
    ap.add_argument("--frames")
    ap.add_argument("--out")
    ap.add_argument("--audio-from")
    ap.add_argument("--no-audio", action="store_true")
    ap.add_argument("--workers", type=int, default=2)
    ap.add_argument("--concurrency", type=int, default=2)
    ap.add_argument("--chunk", type=int, default=300)
    ap.add_argument("--fresh", action="store_true")
    ap.add_argument("--keep", action="store_true")
    ap.add_argument("--no-check", action="store_true")
    ap.add_argument("-h", "--help", action="store_true")
    a = ap.parse_args()
    if a.help:
        sys.exit(__doc__)

    ep = a.ep
    comp = a.comp or comp_of(ep) + "Photo"
    tl = json.load(open(f"{ROOT}/src/{ep}/timeline.json", encoding="utf-8"))
    first, last = (map(int, a.frames.split("-")) if a.frames else (0, tl["total"] - 1))
    out = os.path.abspath(a.out or f"{ROOT}/out/{ep}-photo.mp4")
    work = f"{ROOT}/out/{ep}-seq/{comp}"
    frames_dir = f"{work}/frames"
    bundle = f"{ROOT}/out/{ep}-seq/bundle"
    if a.fresh:
        shutil.rmtree(work, ignore_errors=True)
    os.makedirs(frames_dir, exist_ok=True)
    for d in glob.glob(f"{work}/*-*"):          # 上次中断留下的临时目录 / 比对用的图
        shutil.rmtree(d, ignore_errors=True)
    t0 = time.time()
    stats = {"comp": comp, "frames": f"{first}-{last}", "workers": a.workers, "concurrency": a.concurrency}

    # ---- 硬盘 ----
    need = (last - first + 1) * JPEG_MB / 1024
    free = shutil.disk_usage(ROOT).free / 1024 ** 3
    log(f"{comp} 帧 {first}-{last}（{(last - first + 1) / FPS:.0f} 秒），图片序列约需 {need:.1f} GB，剩余 {free:.1f} GB")
    if free < need + 2:
        sys.exit("硬盘不够，先清理再渲")

    # ---- 打包（3 秒；每次都重打，保证用的是最新代码）----
    ok, msg = run(["npx", "remotion", "bundle", "src/index.ts", "--out-dir", bundle, "--log=error"], timeout=300)
    if not ok:
        sys.exit("打包失败：" + msg)

    seq = ["--sequence", "--image-format=jpeg", "--jpeg-quality=95", "--muted", "--log=error",
           f"--concurrency={a.concurrency}", "--timeout=60000"]

    def frame_path(n):
        return f"{frames_dir}/{n:06d}.jpeg"

    def render_frames(spec, n_frames, tag, dest=None):
        """渲 spec（'a-b' 或 'a,b,c'）到临时目录，成功后统一改名成 6 位帧号挪进 frames/（或 dest）。"""
        dest = dest or frames_dir
        limit = max(180, n_frames / 2)
        for attempt in range(1, 4):
            tmp = tempfile.mkdtemp(prefix=f"{tag}-", dir=work)
            ok, msg = run(["npx", "remotion", "render", bundle, comp, tmp + "/", f"--frames={spec}", *seq], timeout=limit)
            if ok:
                for f in os.listdir(tmp):
                    m = re.search(r"(\d+)\.jpeg$", f)
                    if m:
                        os.replace(f"{tmp}/{f}", f"{dest}/{int(m.group(1)):06d}.jpeg")
                shutil.rmtree(tmp, ignore_errors=True)
                return
            shutil.rmtree(tmp, ignore_errors=True)
            stats["retries"] = stats.get("retries", 0) + 1
            log(f"  {tag} 第 {attempt} 次失败，重试：{msg.strip().splitlines()[-1] if msg.strip() else ''}")
        raise RuntimeError(f"{tag} 连续 3 次失败")

    # ---- 音频（和画面并行跑）----
    audio = None
    audio_thread = None
    if not a.no_audio and not a.audio_from:
        audio = f"{work}/audio.wav"

        def render_audio():
            for attempt in range(1, 4):
                ok, msg = run(["npx", "remotion", "render", bundle, comp, audio, "--codec=wav", f"--frames={first}-{last}",
                               "--log=error", "--timeout=120000"], timeout=max(600, (last - first + 1) / 10))
                if ok:
                    return
                log(f"  音频第 {attempt} 次失败，重试")
            raise RuntimeError("音频连续 3 次失败")

        audio_thread = ThreadPoolExecutor(1).submit(render_audio)

    # ---- 1. 并行出图片序列（跳过已有的帧）----
    missing = [n for n in range(first, last + 1) if not os.path.exists(frame_path(n))]
    jobs, run_start = [], None
    for i, n in enumerate(missing):
        if run_start is None:
            run_start = n
        nxt = missing[i + 1] if i + 1 < len(missing) else None
        if nxt != n + 1 or n - run_start + 1 >= a.chunk:
            jobs.append((run_start, n))
            run_start = None
    log(f"1/4 出图：缺 {len(missing)} 帧，{len(jobs)} 个任务，{a.workers} 进程 × 并发 {a.concurrency}")
    done = {"n": 0}
    lock = threading.Lock()

    def job(j):
        s, e = j
        render_frames(f"{s}-{e}", e - s + 1, f"f{s}")
        with lock:
            done["n"] += e - s + 1
            el = time.time() - t0
            log(f"  {done['n']}/{len(missing)} 帧  {done['n'] / el:.1f} fps")

    t = time.time()
    with ThreadPoolExecutor(a.workers) as ex:
        list(ex.map(job, jobs))
    stats["render_s"] = round(time.time() - t)

    # ---- 2. 查花屏（兜底）：可疑帧重渲比对，两次一致才算数 ----
    # 渲染是确定的：同一帧正常渲两次结果一样；花屏是随机的，两次不会一样。
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from glitch_check import _load_images, candidates, same

    t = time.time()
    nums = list(range(first, last + 1))
    sus = [] if a.no_check else candidates(_load_images([frame_path(n) for n in nums]), nums)
    if a.no_check:
        log("2/4 查花屏：已跳过（--no-check）")
    else:
        log(f"2/4 查花屏：可疑帧 {len(sus)}（含正常的快动作），重渲比对")
    stats["suspects"] = len(sus)
    stats["replaced"] = 0

    def render_batch(frames, tag):
        d = tempfile.mkdtemp(prefix=f"{tag}-", dir=work)
        for k in range(0, len(frames), 200):
            part = frames[k:k + 200]
            render_frames(",".join(map(str, part)), len(part), tag, dest=d)
        return d

    pending = sus
    prev = {}                                  # 帧号 → 上一轮重渲的图（和当前图不一致的那张）
    for rnd in range(5):
        if not pending:
            break
        d = render_batch(pending, f"v{rnd}")
        new_paths = [f"{d}/{n:06d}.jpeg" for n in pending]
        ok_cur = same([frame_path(n) for n in pending], new_paths)
        still = []
        for n, p, ok in zip(pending, new_paths, ok_cur):
            if ok:                             # 新图和当前图一致 → 当前图是对的
                continue
            if n in prev and same([prev[n]], [p])[0]:
                os.replace(p, frame_path(n))   # 新图和上一轮重渲的一致 → 当前图是坏的，换掉
                stats["replaced"] += 1
                continue
            keep = f"{work}/prev-{rnd}"
            os.makedirs(keep, exist_ok=True)
            os.replace(p, f"{keep}/{n:06d}.jpeg")
            prev[n] = f"{keep}/{n:06d}.jpeg"
            still.append(n)
        log(f"  第 {rnd + 1} 轮：比对 {len(pending)} 帧，还对不上 {len(still)} 帧，累计换掉 {stats['replaced']} 帧")
        pending = still
    if pending:
        log(f"  ⚠️ 5 轮后仍对不上：{pending}，请人工看一下")
        stats["unresolved"] = pending
    stats["fix_s"] = round(time.time() - t)

    # ---- 3. 编码 ----
    t = time.time()
    video = f"{work}/video.mp4"
    log("3/4 编码 h264 crf18")
    ok, msg = run(["ffmpeg", "-y", "-v", "error", "-framerate", str(FPS), "-start_number", str(first), "-i", f"{frames_dir}/%06d.jpeg",
                   "-frames:v", str(last - first + 1), "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS), video])
    if not ok:
        sys.exit("编码失败：" + msg)
    stats["encode_s"] = round(time.time() - t)

    # ---- 4. 合入音频 ----
    log("4/4 合成")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if a.no_audio:
        shutil.move(video, out)
    else:
        if audio_thread:
            audio_thread.result()
            src_audio = ["-i", audio]
            acodec = ["-c:a", "aac", "-b:a", "320k"]
        else:
            src_audio = ["-i", a.audio_from]
            acodec = ["-c:a", "copy"]
        tmp_out = out + ".tmp.mp4"
        ok, msg = run(["ffmpeg", "-y", "-v", "error", "-i", video, *src_audio, "-map", "0:v:0", "-map", "1:a:0",
                       "-c:v", "copy", *acodec, "-movflags", "+faststart", tmp_out])
        if not ok:
            sys.exit("合成失败：" + msg)
        os.replace(tmp_out, out)

    n_out = int(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                                         "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", out]).decode().strip().strip(","))
    stats["out_frames"] = n_out
    stats["total_s"] = round(time.time() - t0)
    if n_out != last - first + 1:
        log(f"⚠️ 输出帧数 {n_out}，应为 {last - first + 1}")
    if not a.keep:
        shutil.rmtree(work, ignore_errors=True)
    log(f"完成 → {os.path.relpath(out, ROOT)}  用时 {stats['total_s'] // 60} 分 {stats['total_s'] % 60} 秒")
    print(json.dumps(stats, ensure_ascii=False))


if __name__ == "__main__":
    main()
