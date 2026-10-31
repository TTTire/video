"""把录音笔音频对齐到相机视频：互相关找偏移 + 钟漂，换音轨、响度归一，输出同步片段与报告。

用法: python scripts/sync.py <原片文件夹> [--out 输出目录] [--concat]
      [--recorder 指定录音笔文件] [--win 60] [--drift-threshold-ms 20] [--no-loudnorm]
"""
from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (AUDIO_EXT, VIDEO_EXT, ensure_venv, ffmpeg_bin, fmt_time, h264_args, media_duration,  # noqa: E402
                     pick_h264_encoder, read_audio, run, stream_kinds, video_params, write_json)

ensure_venv()
import numpy as np  # noqa: E402

SR = 8000               # 分析采样率
BAND = (300.0, 3000.0)  # 人声带通
MAX_PPM = 500.0         # 钟漂物理上限（超过视为误匹配）


# ---------------------------------------------------------------- 信号处理
def bandpass(x: np.ndarray, sr: int, lo: float, hi: float, chunk: int = 1 << 20, pad: int = 4096) -> np.ndarray:
    """分块 FFT 掩膜带通（块间留 pad 重叠，取中段），避免整条 1 小时音频一次 FFT 吃内存。"""
    x = x.astype(np.float64, copy=False)
    out = np.empty_like(x)
    n = len(x)
    for s in range(0, n, chunk):
        a, b = max(0, s - pad), min(n, s + chunk + pad)
        seg = x[a:b]
        X = np.fft.rfft(seg)
        f = np.fft.rfftfreq(len(seg), 1.0 / sr)
        X[(f < lo) | (f > hi)] = 0
        y = np.fft.irfft(X, n=len(seg))
        out[s:min(n, s + chunk)] = y[s - a: s - a + min(chunk, n - s)]
    return out


def preprocess(x: np.ndarray, sr: int) -> np.ndarray:
    y = bandpass(x, sr, *BAND)
    y -= y.mean()
    peak = np.abs(y).max()
    return y / peak if peak > 0 else y


def xcorr_ncc(short: np.ndarray, long: np.ndarray, lag_lo: int | None = None, lag_hi: int | None = None):
    """归一化互相关（overlap-save）。返回 (lags, ncc)。lag = short[0] 对齐到 long 的下标，可为负。"""
    L = len(short)
    if lag_lo is None:
        lag_lo = -(L - 1)
    if lag_hi is None:
        lag_hi = len(long) - 1
    lag_lo = max(lag_lo, -(L - 1))
    lag_hi = min(lag_hi, len(long) - 1)
    nlags = lag_hi - lag_lo + 1
    if nlags <= 0:
        return np.array([0]), np.array([0.0])
    # y[k] 对应 long[k + lag_lo]
    front = max(0, -lag_lo)
    src = long[max(0, lag_lo): lag_hi + L]
    y = np.zeros(nlags + L - 1, dtype=np.float64)
    y[front:front + len(src)] = src[:len(y) - front]

    B = 1 << max(16, math.ceil(math.log2(4 * L)))
    step = B - L + 1
    S = np.conj(np.fft.rfft(short, B))
    corr = np.empty(nlags, dtype=np.float64)
    for s in range(0, nlags, step):
        blk = y[s: s + B]
        c = np.fft.irfft(np.fft.rfft(blk, B) * S, B)
        m = min(step, nlags - s)
        corr[s:s + m] = c[:m]
    # 局部能量归一
    cs = np.concatenate([[0.0], np.cumsum(y * y)])
    e_long = cs[L:L + nlags] - cs[:nlags]
    e_short = float(np.dot(short, short))
    floor = 0.05 * float(e_long.mean()) + 1e-12
    ncc = corr / np.sqrt(e_short * np.maximum(e_long, floor))
    return np.arange(lag_lo, lag_hi + 1), ncc


def find_peak(lags: np.ndarray, ncc: np.ndarray, sr: int, excl_ms: float = 50.0):
    """主峰（亚采样抛物线插值）与 主峰/次峰 置信度。"""
    a = np.abs(ncc)
    i = int(a.argmax())
    peak = float(a[i])
    if 0 < i < len(a) - 1 and peak > 0:
        y0, y1, y2 = a[i - 1], a[i], a[i + 1]
        den = y0 - 2 * y1 + y2
        frac = 0.5 * (y0 - y2) / den if den != 0 else 0.0
        frac = float(np.clip(frac, -1, 1))
    else:
        frac = 0.0
    excl = int(excl_ms / 1000 * sr)
    mask = a.copy()
    mask[max(0, i - excl): i + excl + 1] = 0
    second = float(mask.max()) if mask.size else 0.0
    conf = peak / second if second > 1e-9 else float("inf")
    return (lags[i] + frac) / sr, peak, conf


def pick_window(x: np.ndarray, sr: int, lo: float, hi: float, win: float) -> float:
    """在 [lo, hi] 秒范围内选能量最大的 win 秒窗口，返回窗口起点（秒）。"""
    if hi - lo <= win:
        return lo
    best, best_e = lo, -1.0
    for st in np.arange(lo, hi - win + 1e-6, 5.0):
        seg = x[int(st * sr): int((st + win) * sr)]
        e = float(np.dot(seg, seg))
        if e > best_e:
            best, best_e = st, e
    return float(best)


# ---------------------------------------------------------------- 对齐
def align(cam: np.ndarray, rec: np.ndarray, sr: int, win: float) -> dict:
    """返回 offset0（相机 t=0 对应录音笔的秒数）、ppm、置信度等。"""
    dur = len(cam) / sr
    windows: list[float] = []
    if dur <= win * 1.6:
        windows = [0.0]
        win_eff = dur
    else:
        win_eff = win
        windows.append(pick_window(cam, sr, 0.0, min(dur * 0.3, dur - win), win))
        if dur >= win * 3.5:
            windows.append(pick_window(cam, sr, dur * 0.4, dur * 0.6 + win, win))
        windows.append(pick_window(cam, sr, max(dur * 0.7, windows[0] + win), dur, win))
    windows = sorted(set(round(w, 3) for w in windows))

    def stretch(seg: np.ndarray, d: float) -> np.ndarray:
        if d == 0.0:
            return seg
        n_new = int(round(len(seg) * (1 + d)))
        return np.interp(np.arange(n_new) / (1 + d), np.arange(len(seg)), seg)

    def one(ws: float, d_est: float, coarse: float | None) -> dict:
        seg = stretch(cam[int(ws * sr): int((ws + win_eff) * sr)], d_est)
        if coarse is None:
            lags, ncc = xcorr_ncc(seg, rec)
        else:
            exp = (coarse + ws * (1 + d_est)) * sr
            tol = int((MAX_PPM * 1e-6 * dur + 0.5) * sr)
            lags, ncc = xcorr_ncc(seg, rec, int(exp - tol), int(exp + tol))
        lag_s, peak, conf = find_peak(lags, ncc, sr)
        return {"win_start": ws, "win_len": win_eff, "offset": lag_s - ws * (1 + d_est), "peak": peak, "conf": conf}

    def fit(res: list[dict]):
        good = [r for r in res if r["conf"] >= 1.5 and r["peak"] >= 0.03]
        if len(good) < 2 or res[0] not in good:
            return None, good
        t = np.array([r["win_start"] + r["win_len"] / 2 for r in good])
        o = np.array([r["offset"] for r in good])
        slope, inter = np.polyfit(t, o, 1)
        return (float(slope), float(inter)), good

    # 1) 粗搜：首窗在全长录音笔里找偏移。钟漂会把长窗的峰抹平（300ppm×60s=18ms），
    #    所以按 ±MAX_PPM 的网格预先拉伸首窗，取峰值最高的一档作为钟漂初值。
    grid = [0.0] + [s * k * 1e-4 for k in range(1, int(MAX_PPM / 100) + 1) for s in (1, -1)]
    coarse_tries = [(d, one(windows[0], d, None)) for d in (grid if win_eff >= 20 else [0.0])]
    d_est, base = max(coarse_tries, key=lambda t: t[1]["peak"] * min(t[1]["conf"], 10.0))
    results = [base]
    out = {"windows": results, "offset0": base["offset"], "ppm": 0.0, "drift_ok": False,
           "conf": base["conf"], "peak": base["peak"], "warnings": [], "iterations": 0,
           "coarse_grid": [{"ppm": d * 1e6, "peak": r["peak"], "conf": r["conf"]} for d, r in coarse_tries]}
    if len(windows) < 2:
        if d_est != 0.0:
            out["warnings"].append(f"段太短无法测钟漂（粗搜网格最佳档 {d_est * 1e6:+.0f} ppm，未修正）")
    else:
        # 2) 以钟漂初值测全部窗口，线性拟合 偏移~时间 得残余钟漂，叠加后重测，收敛到 1ppm 以内
        for _ in range(4):
            results = [one(ws, d_est, base["offset"]) for ws in windows]
            out["iterations"] += 1
            fitted, good = fit(results)
            if fitted is None:
                bad = [f"{fmt_time(r['win_start'])}(主/次峰 {r['conf']:.2f})" for r in results if r not in good]
                out["warnings"].append("部分窗口置信度低，无法测钟漂: " + ", ".join(bad))
                break
            slope, inter = fitted
            if abs((d_est + slope) * 1e6) > MAX_PPM:
                out["warnings"].append(f"窗口间偏移差异过大（{(d_est + slope) * 1e6:.0f} ppm），不像钟漂，按首窗偏移、不修正")
                break
            d_est += slope
            base = results[0]
            out.update(offset0=inter, ppm=d_est * 1e6, drift_ok=True, windows=results,
                       conf=base["conf"], peak=base["peak"])
            if abs(slope * 1e6) < 1.0:
                break
    if base["conf"] < 2.0 or base["peak"] < 0.05:
        out["warnings"].insert(0, f"首窗置信度低（主/次峰 {base['conf']:.2f}，峰值 {base['peak']:.3f}），偏移可能不可靠")
    return out


# ---------------------------------------------------------------- ffmpeg 产出
def audio_chain(offset0: float, ppm: float, cam_dur: float, correct_drift: bool) -> str:
    parts = ["aresample=48000"]
    if offset0 >= 0:
        parts.append(f"atrim=start={offset0:.6f},asetpts=PTS-STARTPTS")
    else:
        parts.append(f"adelay=delays={int(round(-offset0 * 48000))}S:all=1")
    if correct_drift:
        d = ppm * 1e-6
        hi = 384000
        parts.append(f"aresample={hi},asetrate={int(round(hi * (1 + d)))},aresample=48000")
    parts.append(f"apad,atrim=end={cam_dur:.6f},asetpts=PTS-STARTPTS")
    return ",".join(parts)


def loudnorm_measure(rec: Path, chain: str) -> dict | None:
    cmd = [ffmpeg_bin(), "-hide_banner", "-nostdin", "-i", str(rec), "-af",
           chain + ",loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        return None
    return json.loads(m.group(0))


TARGET_I, TARGET_TP = -16.0, -1.5


def loudnorm_stage(measured: dict | None) -> tuple[str, str]:
    """第二遍：能线性增益就用 loudnorm linear；线性增益会顶破 TP 时改用 volume + 前视限制器（loudnorm 会
    悄悄退回 dynamic 模式，语气词多的口播会被压得忽大忽小，且常达不到目标响度）。返回 (filter, 说明)。"""
    if not measured:
        return "", "未归一"
    mi, mtp, mlra = float(measured["input_i"]), float(measured["input_tp"]), float(measured["input_lra"])
    gain = TARGET_I - mi
    if mtp + gain <= TARGET_TP + 0.05:
        lra = max(11.0, math.ceil(mlra) + 1.0)  # linear 模式要求目标 LRA ≥ 源 LRA，否则退回 dynamic
        f = (f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={lra:g}:linear=true:"
             f"measured_I={measured['input_i']}:measured_LRA={measured['input_lra']}:"
             f"measured_TP={measured['input_tp']}:measured_thresh={measured['input_thresh']}:"
             f"offset={measured['target_offset']}")
        return f, f"loudnorm linear（{mi:.1f}→{TARGET_I:.0f} LUFS，增益 {gain:+.1f}dB）"
    lim = 10 ** ((TARGET_TP - 1.0) / 20)  # 采样峰限制器 + AAC 过冲，留 1dB 余量
    f = f"volume={gain:.2f}dB,alimiter=limit={lim:.4f}:attack=5:release=50:level=false:latency=true"
    return f, (f"volume {gain:+.1f}dB + alimiter {TARGET_TP - 1.0}dBTP（源 {mi:.1f} LUFS / TP {mtp:.1f}，"
               f"线性增益会顶破真峰值，峰被压约 {mtp + gain - TARGET_TP:.1f}dB，成品响度会略低于目标）")


def write_synced(video: Path, rec: Path, out: Path, chain: str, loud: str) -> None:
    if loud:
        chain = chain + "," + loud
    run([ffmpeg_bin(), "-nostdin", "-i", str(video), "-i", str(rec),
         "-filter_complex", f"[1:a]{chain}[a]", "-map", "0:v:0", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-movflags", "+faststart", str(out)])


def first_speech(x: np.ndarray, sr: int) -> float:
    """第一段响度明显处（1 秒窗 RMS 比最大值低不超过 12dB）。"""
    n = len(x) // sr
    if n < 2:
        return 0.0
    rms = np.sqrt((x[:n * sr].reshape(n, sr) ** 2).mean(axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    idx = np.nonzero(db >= db.max() - 12)[0]
    return float(idx[0]) if idx.size else 0.0


def write_lipcheck(synced: Path, start: float, out: Path) -> None:
    run([ffmpeg_bin(), "-nostdin", "-ss", f"{start:.3f}", "-t", "10", "-i", str(synced),
         "-vf", "scale=-2:1080", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
         "-c:a", "copy", str(out)])


def concat_all(files: list[Path], out: Path) -> str:
    params = [video_params(f) for f in files]
    same = all(p == params[0] for p in params)
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{f.resolve().as_posix()}'\n" for f in files), encoding="utf-8")
    if same:
        run([ffmpeg_bin(), "-nostdin", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
             "-movflags", "+faststart", str(out)])
        mode = "copy（编码参数一致）"
    else:
        enc = pick_h264_encoder()
        h = params[0]["height"] or 1080
        inputs, fc = [], []
        for i, f in enumerate(files):
            inputs += ["-i", str(f)]
            fc.append(f"[{i}:v]scale=-2:{h},fps=30,setsar=1[v{i}];[{i}:a]aresample=48000[a{i}]")
        fc.append("".join(f"[v{i}][a{i}]" for i in range(len(files))) + f"concat=n={len(files)}:v=1:a=1[v][a]")
        run([ffmpeg_bin(), "-nostdin", *inputs, "-filter_complex", ";".join(fc), "-map", "[v]", "-map", "[a]",
             *h264_args(enc), "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
        mode = f"重编码 {enc}（编码参数不一致）"
    lst.unlink(missing_ok=True)
    return mode


# ---------------------------------------------------------------- 主流程
def classify(folder: Path, recorder_arg: Path | None):
    videos, audios = [], []
    for p in sorted(folder.iterdir(), key=lambda q: q.name.lower()):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        if ext in VIDEO_EXT or ext in AUDIO_EXT:
            kinds = stream_kinds(p)
            if "video" in kinds and "audio" in kinds:
                videos.append(p)
            elif kinds == {"audio"}:
                audios.append(p)
    if recorder_arg:
        audios = [recorder_arg]
    return videos, audios


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", type=Path, help="原片文件夹（相机 mp4/mov + 录音笔 wav/mp3/m4a/flac）")
    ap.add_argument("--out", type=Path, help="输出目录，默认 <原片文件夹>/../同步")
    ap.add_argument("--recorder", type=Path, help="手动指定录音笔文件（文件夹里有多条音频时）")
    ap.add_argument("--concat", action="store_true", help="把全部同步段按文件名顺序拼成 A-roll-同步-全部.mp4")
    ap.add_argument("--win", type=float, default=60.0, help="互相关窗口秒数（默认 60）")
    ap.add_argument("--drift-threshold-ms", type=float, default=20.0, help="段尾累计钟漂超过多少 ms 才修正（默认 20）")
    ap.add_argument("--no-loudnorm", action="store_true", help="跳过响度归一")
    args = ap.parse_args()

    folder = args.folder.resolve()
    out_dir = (args.out or folder.parent / "同步").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    videos, audios = classify(folder, args.recorder)
    if not videos:
        sys.exit(f"[sync] {folder} 里没有带音轨的相机视频")
    if not audios:
        sys.exit(f"[sync] {folder} 里没有纯音频的录音笔文件（可用 --recorder 指定）")
    if len(audios) > 1:
        print(f"[sync] 发现多条音频，使用最长的一条；也可 --recorder 指定: {[a.name for a in audios]}")
        audios.sort(key=media_duration, reverse=True)
    rec = audios[0]
    rec_dur = media_duration(rec)
    print(f"[sync] 录音笔: {rec.name} ({fmt_time(rec_dur)})；相机段 {len(videos)} 个")

    t0 = time.time()
    rec_x = preprocess(read_audio(rec, SR), SR)
    print(f"[sync] 录音笔音频读取+带通 {time.time() - t0:.1f}s")

    rows, synced_files = [], []
    for v in videos:
        t1 = time.time()
        cam_dur = media_duration(v)
        cam_raw = read_audio(v, SR)
        cam_x = preprocess(cam_raw, SR)
        res = align(cam_x, rec_x, SR, args.win)
        off, ppm = res["offset0"], res["ppm"]
        acc_ms = ppm * 1e-6 * cam_dur * 1000
        correct = res["drift_ok"] and abs(acc_ms) > args.drift_threshold_ms
        warns = list(res["warnings"])
        if off < 0:
            warns.append(f"录音笔比相机晚开机 {-off:.3f}s，开头补静音")
        if off + cam_dur * (1 + ppm * 1e-6) > rec_dur + 0.05:
            warns.append(f"录音笔比相机早停 {off + cam_dur - rec_dur:.1f}s，结尾补静音")

        chain = audio_chain(off, ppm, cam_dur, correct)
        measured = None if args.no_loudnorm else loudnorm_measure(rec, chain)
        if not args.no_loudnorm and measured is None:
            warns.append("loudnorm 第一遍测量失败，已跳过响度归一")
        loud_f, loud_desc = loudnorm_stage(measured)
        out_v = out_dir / f"{v.stem}-同步.mp4"
        write_synced(v, rec, out_v, chain, loud_f)
        lip_start = min(first_speech(cam_raw, SR), max(0.0, cam_dur - 10))
        write_lipcheck(out_v, lip_start, out_dir / f"{v.stem}-口型核对.mp4")
        synced_files.append(out_v)

        row = {"file": v.name, "duration": cam_dur, "offset": off, "ppm": ppm, "acc_ms": acc_ms,
               "corrected": correct, "conf": res["conf"], "peak": res["peak"],
               "windows": res["windows"], "iterations": res["iterations"], "coarse_grid": res["coarse_grid"],
               "warnings": warns, "lipcheck_start": lip_start, "loudnorm": loud_desc,
               "loudnorm_measured": measured, "seconds": time.time() - t1}
        rows.append(row)
        print(f"[sync] {v.name}: 偏移 {off:+.3f}s  钟漂 {ppm:+.1f}ppm（段尾 {acc_ms:+.1f}ms，"
              f"{'已修正' if correct else '未修正'}） 置信度 {res['conf']:.2f}  响度: {loud_desc}  用时 {row['seconds']:.1f}s")
        for w in warns:
            print(f"        警告: {w}")

    concat_mode = None
    if args.concat and synced_files:
        concat_mode = concat_all(synced_files, out_dir / "A-roll-同步-全部.mp4")
        print(f"[sync] 已拼接 A-roll-同步-全部.mp4（{concat_mode}）")

    lines = ["# 同步报告", "", f"- 录音笔: `{rec.name}`（{fmt_time(rec_dur)}）", f"- 输出目录: `{out_dir}`",
             f"- 分析: {SR}Hz 单声道，带通 {int(BAND[0])}–{int(BAND[1])}Hz，归一化互相关，窗口 {args.win:.0f}s；"
             f"钟漂修正阈值 {args.drift_threshold_ms:.0f}ms/段", ""]
    if concat_mode:
        lines += [f"- 拼接: `A-roll-同步-全部.mp4`（{concat_mode}）", ""]
    lines += ["| 文件 | 时长 | 偏移(s) | 钟漂(ppm) | 段尾累计(ms) | 修正 | 置信度(主/次峰) | 峰值 | 警告 |",
              "|---|---|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['file']} | {fmt_time(r['duration'])} | {r['offset']:+.3f} | {r['ppm']:+.1f} | "
                     f"{r['acc_ms']:+.1f} | {'是' if r['corrected'] else '否'} | {r['conf']:.2f} | {r['peak']:.3f} | "
                     f"{'；'.join(r['warnings']) or '-'} |")
    lines += ["", "## 各窗口", ""]
    for r in rows:
        lines.append(f"- **{r['file']}**（口型核对片段起点 {fmt_time(r['lipcheck_start'])}；响度: {r['loudnorm']}；"
                     f"钟漂迭代 {r['iterations']} 次）")
        for w in r["windows"]:
            lines.append(f"  - 窗 {fmt_time(w['win_start'])}+{w['win_len']:.0f}s: 偏移 {w['offset']:+.4f}s，"
                         f"峰值 {w['peak']:.3f}，主/次峰 {w['conf']:.2f}")
    lines += ["", "偏移 = 相机 t=0 对应录音笔的时间（正数表示录音笔先开机）。置信度 < 2 要人工用「口型核对」片段确认。", ""]
    (out_dir / "同步报告.md").write_text("\n".join(lines), encoding="utf-8")
    write_json(out_dir / "同步报告.json", {"recorder": str(rec), "segments": rows, "concat": concat_mode})
    print(f"[sync] 报告: {out_dir / '同步报告.md'}")


if __name__ == "__main__":
    main()
