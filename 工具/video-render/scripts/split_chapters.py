"""把整片渲染（render_seq.py --keep）按章切成 4 段，并验证 4 段首尾相接 == 整片。

只渲一次整片，段从同一套图片序列 + 同一条 wav 切出来：画面逐帧对应、音频按采样点切，
4 段接起来和整片一样，接缝处没有各自渲音频带来的时间偏移。
切点 = 每张章节卡的起始帧（timeline.json 里 scene == "chapter" 的 from）。

用法（在 工具/video-render 下，先跑过 render_seq.py <epN> --comp EpNFull --keep）：
  python3 scripts/split_chapters.py <epN> <整片.mp4> "<输出前缀>" [--comp EpNFull] [--verify]
输出：<前缀>-0开头.mp4 / -1第1章.mp4 / -2第2章.mp4 / -3第3章.mp4
--verify：用 concat 把 4 段接回去，和整片逐帧比 SSIM、音频按采样点比最大偏差，打印接缝处的结果。
"""
import argparse, json, os, subprocess, sys, tempfile, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30


def sh(cmd, capture=False):
    r = subprocess.run(cmd, check=True, capture_output=capture, text=capture)
    return r.stdout if capture else None


def nframes(path):
    return int(sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets",
                   "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", path], True).strip().strip(","))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("master")
    ap.add_argument("prefix")
    ap.add_argument("--comp")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    comp = a.comp or (a.ep[:1].upper() + a.ep[1:] + "Full")
    work = f"{ROOT}/out/{a.ep}-seq/{comp}"
    frames, wav = f"{work}/frames", f"{work}/audio.wav"
    if not os.path.isdir(frames) or not os.path.exists(wav):
        sys.exit(f"缺 {work}/frames 或 audio.wav：先 render_seq.py {a.ep} --comp {comp} --keep")

    tl = json.load(open(f"{ROOT}/src/{a.ep}/timeline.json", encoding="utf-8"))
    cuts = [0] + [s["from"] for s in tl["scenes"] if s["scene"] == "chapter"] + [tl["total"]]
    labels = ["0开头"] + [f"{i}第{i}章" for i in range(1, len(cuts) - 1)]
    if len(labels) != 4:
        sys.exit(f"应有 3 张章节卡，切点 {cuts}")

    with wave.open(wav) as w:
        sr, ch, sw, n_samp = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
    print(f"整片 {tl['total']} 帧，切点 {cuts}，wav {sr}Hz {ch}ch {n_samp} 采样")

    outs = []
    for (s, e), label in zip(zip(cuts, cuts[1:]), labels):
        out = f"{a.prefix}-{label}.mp4"
        n = e - s
        s0, s1 = s * sr // FPS, e * sr // FPS           # 采样点按帧边界取整，和画面严格对齐
        sh(["ffmpeg", "-y", "-v", "error",
            "-framerate", str(FPS), "-start_number", str(s), "-i", f"{frames}/%06d.jpeg",
            "-i", wav,
            "-map", "0:v:0", "-map", "1:a:0",
            "-frames:v", str(n), "-af", f"atrim=start_sample={s0}:end_sample={s1},asetpts=PTS-STARTPTS",
            "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", out])
        got = nframes(out)
        flag = "" if got == n else f"  ⚠️ 应为 {n}"
        print(f"{label}  帧 {s}-{e - 1}  {n} 帧 {n / FPS:.1f}s  → {os.path.basename(out)}  实际 {got} 帧{flag}")
        outs.append(out)

    if a.verify:
        verify(a.master, outs, cuts, sr)


def verify(master, parts, cuts, sr):
    """三项：① 4 段 concat 回去和整片逐帧比接缝 SSIM；② 每段音频和整片 wav 按采样点对齐比偏差；
    ③ 顺手报一下硬拼（ffmpeg concat -c copy，不处理 AAC 编码延迟）会多出多少毫秒——这是分段交付在剪辑软件里可能卡一下的来源。"""
    import array
    master = os.path.abspath(master)
    tmp = tempfile.mkdtemp(prefix="concat-", dir=f"{ROOT}/out")
    lst = f"{tmp}/list.txt"
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '" + os.path.abspath(p).replace("'", r"'\''") + "'\n")
    joined = f"{tmp}/joined.mp4"
    sh(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", joined])
    nm, nj = nframes(master), nframes(joined)
    print(f"\n验证：整片 {nm} 帧，4 段接起来 {nj} 帧{'' if nm == nj else '  ⚠️ 不一致'}")

    # ① 画面：按帧号取接缝两侧各 3 帧比 SSIM（同一套 jpeg 两次编码，应 ≥ 0.98）。
    # 用 select 按帧号而不是 -ss 按时间：拼接文件的视频时间戳会被 AAC 编码延迟推后 21ms，按时间取会错一帧
    for c in cuts[1:-1]:
        a, b = c - 3, c + 2
        out = subprocess.run(["ffmpeg", "-v", "error", "-i", master, "-i", joined, "-lavfi",
                              f"[0:v]select='between(n,{a},{b})',setpts=N/{FPS}/TB[x];[1:v]select='between(n,{a},{b})',setpts=N/{FPS}/TB[y];[x][y]ssim=stats_file=-",
                              "-f", "null", "-"], check=True, capture_output=True, text=True).stdout
        vals = [float(l.split("All:")[1].split()[0]) for l in out.splitlines() if "All:" in l]
        worst = min(vals) if vals else 0
        print(f"  切点帧 {c}：接缝 ±3 帧 SSIM 最低 {worst:.4f}{'' if worst >= 0.98 else '  ⚠️ 画面对不上'}")

    # ② 音频：每段解码（解码器会按 edit list 去掉编码延迟）后，和整片 wav 在该段起点对齐比首尾各 0.5 秒
    def pcm(path):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", str(sr), "-"],
                             check=True, capture_output=True).stdout
        return array.array("h", raw)
    pm = pcm(master)
    peak = max(abs(v) for v in pm) or 1          # 偏差按整片峰值归一；接缝窗口常是静音，按窗口峰值归一会把底噪算成 100%
    win = sr // 2
    def dev(x, y):
        n = min(len(x), len(y))
        return max((abs(u - v) for u, v in zip(x[:n], y[:n])), default=0) * 100 / peak
    for p, s, e in zip(parts, cuts, cuts[1:]):
        ps = pcm(p)
        s0, s1 = s * sr // FPS, e * sr // FPS
        n = s1 - s0
        # 尾部按"距段起点第 n 个采样"取，不按文件末尾：AAC 编码会在末尾补零到 1024 的整数倍，解码后比画面多十几毫秒
        head, tail = dev(pm[s0:s0 + win], ps[:win]), dev(pm[s1 - win:s1], ps[n - win:n])
        extra = (len(ps) - n) * 1000 / sr
        bad = "" if max(head, tail) < 10 else "  ⚠️ 音频和整片对不齐"
        print(f"  {os.path.basename(p)[-12:]}：首 0.5s 偏差 {head:.1f}%  尾 0.5s 偏差 {tail:.1f}%  音频比画面多 {extra:+.1f} ms（AAC 末尾补零）{bad}")

    # ③ 硬拼会多出来的时间
    pj = pcm(joined)
    print(f"  硬拼 4 段（不处理 AAC 延迟）音频比整片长 {(len(pj) - len(pm)) * 1000 / sr:+.1f} ms；"
          f"剪辑软件若按这种方式接，每个接缝就是约 {(len(pj) - len(pm)) * 1000 / sr / 3:.0f} ms 的声画错位")
    print(f"（验证用的拼接文件：{os.path.relpath(joined, ROOT)}）")


if __name__ == "__main__":
    main()
