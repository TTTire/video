"""按剪切清单剪成片：边界吸附到音频最安静处，一条 ffmpeg filter_complex 输出；可选把字幕重定时。

用法: python scripts/cut.py <同步后视频> <剪切清单.md> [--words words.json] [--out 成片路径]
      [--height 1080] [--fps 30] [--snap 0.3] [--margin 0.08] [--encoder auto|h264_nvenc|libx264]
"""
from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (ensure_venv, ffmpeg_bin, fmt_srt_time, fmt_time, h264_args, load_json, media_duration,  # noqa: E402
                     parse_time, pick_h264_encoder, read_audio, run, write_json)

ensure_venv()
import numpy as np  # noqa: E402

DELETE_WORDS = {"删", "删除", "剪", "cut", "x", "✓"}
MERGE_GAP = 0.25
FRAME = 0.02  # RMS 帧长（秒）


# ---------------------------------------------------------------- 清单解析
def parse_cutlist(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 7 or not cells[0].isdigit():
            continue
        try:
            start, end = parse_time(cells[1]), parse_time(cells[2])
        except ValueError as e:
            print(f"[cut] 跳过第 {cells[0]} 行：{e}")
            continue
        action = cells[6].strip().lower()
        rows.append({"n": int(cells[0]), "start": start, "end": end, "type": cells[4], "note": cells[5],
                     "delete": action in DELETE_WORDS})
    return rows


# ---------------------------------------------------------------- 边界吸附
def rms_db(audio: np.ndarray, sr: int) -> np.ndarray:
    n = int(sr * FRAME)
    frames = len(audio) // n
    x = audio[:frames * n].reshape(frames, n)
    return 20 * np.log10(np.sqrt((x ** 2).mean(axis=1)) + 1e-7)


QUIET_BAND_DB = 10.0  # 比窗内最低 RMS 高不超过这么多的帧算"安静区"


def quiet_run(t: float, db: np.ndarray, radius: float) -> tuple[float, float]:
    """边界 t ±radius 内，包含最低 RMS 帧的连续安静区 [l, r]（秒）。"""
    lo = max(0, int((t - radius) / FRAME))
    hi = min(len(db) - 1, int((t + radius) / FRAME))
    if hi <= lo:
        return t, t
    seg = db[lo:hi + 1]
    i = int(seg.argmin())
    thr = seg[i] + QUIET_BAND_DB
    l = i
    while l > 0 and seg[l - 1] <= thr:
        l -= 1
    r = i
    while r < len(seg) - 1 and seg[r + 1] <= thr:
        r += 1
    return (lo + l) * FRAME, (lo + r + 1) * FRAME


def snap_start(t: float, db: np.ndarray, radius: float, margin: float) -> float:
    """删除段起点：落在安静区里，离前面保留的话音至少 margin；提议值本身在安静区内就尊重提议。"""
    l, r = quiet_run(t, db, radius)
    lo_ok, hi_ok = l + margin, max(l + margin, r - margin)
    return min(max(t, lo_ok), hi_ok)


def snap_end(t: float, db: np.ndarray, radius: float, margin: float) -> float:
    """删除段终点：落在安静区里，离后面保留的话音起点至少 margin。"""
    l, r = quiet_run(t, db, radius)
    hi_ok, lo_ok = r - margin, min(l, r - margin)
    return min(max(t, lo_ok), hi_ok)


def plan_cuts(rows: list[dict], db: np.ndarray, duration: float, radius: float, margin: float) -> list[dict]:
    cuts = []
    for r in rows:
        if not r["delete"]:
            continue
        a = snap_start(r["start"], db, radius, margin)
        b = snap_end(r["end"], db, radius, margin)
        if r["start"] <= 0.05:
            a = 0.0
        if r["end"] >= duration - 0.05:
            b = duration
        if b - a < 0.04:
            print(f"[cut] 第 {r['n']} 行吸附后太短（{b - a:.3f}s），跳过")
            continue
        cuts.append({"n": [r["n"]], "orig": [r["start"], r["end"]], "start": max(0.0, a), "end": min(duration, b)})
    cuts.sort(key=lambda c: c["start"])
    merged: list[dict] = []
    for c in cuts:
        if merged and c["start"] - merged[-1]["end"] < MERGE_GAP:
            merged[-1]["end"] = max(merged[-1]["end"], c["end"])
            merged[-1]["n"] += c["n"]
            merged[-1]["orig"] = [merged[-1]["orig"][0], max(merged[-1]["orig"][1], c["orig"][1])]
        else:
            merged.append(c)
    return merged


def keep_segments(cuts: list[dict], duration: float) -> list[dict]:
    keeps, pos, t = [], 0.0, 0.0
    for c in cuts:
        if c["start"] > pos + 0.02:
            keeps.append({"src_start": pos, "src_end": c["start"], "dst_start": t})
            t += c["start"] - pos
        pos = c["end"]
    if duration > pos + 0.02:
        keeps.append({"src_start": pos, "src_end": duration, "dst_start": t})
        t += duration - pos
    for k in keeps:
        k["dst_end"] = k["dst_start"] + (k["src_end"] - k["src_start"])
    return keeps


# ---------------------------------------------------------------- 渲染
def render(src: Path, keeps: list[dict], out: Path, height: int, fps: int, enc: str) -> None:
    parts, labels = [], []
    for i, k in enumerate(keeps):
        a, b = k["src_start"], k["src_end"]
        parts.append(f"[0:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    parts.append("".join(labels) + f"concat=n={len(keeps)}:v=1:a=1[vc][ac]")
    parts.append(f"[vc]scale=-2:{height}:flags=lanczos,fps={fps},format=yuv420p[v]")
    parts.append("[ac]aresample=48000[a]")
    run([ffmpeg_bin(), "-nostdin", "-i", str(src), "-filter_complex", ";".join(parts),
         "-map", "[v]", "-map", "[a]", *h264_args(enc), "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", str(out)])


# ---------------------------------------------------------------- 字幕重定时
def remap(t: float, keeps: list[dict]) -> float | None:
    for k in keeps:
        if k["src_start"] - 1e-6 <= t <= k["src_end"] + 1e-6:
            return k["dst_start"] + (t - k["src_start"])
    return None


def retime_words(data: dict, keeps: list[dict]) -> dict:
    segs = []
    for s in data["segments"]:
        words = []
        for w in s["words"]:
            mid = (w["start"] + w["end"]) / 2
            m = remap(mid, keeps)
            if m is None:
                continue
            ns = remap(w["start"], keeps)
            ne = remap(w["end"], keeps)
            # 跨边界的词：被删掉的那半截裁掉
            if ns is None:
                ns = next(k["dst_start"] for k in keeps if k["src_start"] <= mid <= k["src_end"])
            if ne is None:
                ne = next(k["dst_end"] for k in keeps if k["src_start"] <= mid <= k["src_end"])
            words.append({**w, "start": round(ns, 3), "end": round(max(ne, ns + 0.01), 3)})
        if not words:
            continue
        segs.append({"id": len(segs), "start": words[0]["start"], "end": words[-1]["end"],
                     "text": "".join(w["word"] for w in words).strip(), "words": words})
    return {**data, "segments": segs, "retimed_from": data.get("media")}


CUE_MAX_CHARS = 20
CUE_BREAK = "。？！；?!;，,、…"


def cues_from_segments(segs: list[dict]) -> list[dict]:
    """Whisper 的段常常 30–40 秒一条，字幕按标点切成 ≤ CUE_MAX_CHARS 字的小条。"""
    cues = []
    for s in segs:
        cur: list[dict] = []

        def flush():
            if cur:
                text = "".join(w["word"] for w in cur).strip().rstrip("，,、;；")
                cues.append({"start": cur[0]["start"], "end": cur[-1]["end"], "text": text})
                cur.clear()

        for w in s["words"]:
            cur.append(w)
            n = len(re.sub(r"[\s" + re.escape(CUE_BREAK) + "]", "", "".join(x["word"] for x in cur)))
            if w["word"].strip()[-1:] in CUE_BREAK and n >= 6:
                flush()
            elif n >= CUE_MAX_CHARS:
                flush()
        flush()
    return cues


def write_srt(cues: list[dict], path: Path) -> None:
    lines = []
    for i, s in enumerate(cues, 1):
        end = max(s["end"], s["start"] + 0.3)
        if i < len(cues) and end > cues[i]["start"]:
            end = max(cues[i]["start"] - 0.001, s["start"] + 0.1)
        lines += [str(i), f"{fmt_srt_time(s['start'])} --> {fmt_srt_time(end)}", s["text"], ""]
    path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------- 主流程
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("cutlist", type=Path, help="剪切清单.md（只执行 处理=删 的行）")
    ap.add_argument("--words", type=Path, help="转写 words.json，给了就同时输出重定时的 words.json 与 srt")
    ap.add_argument("--out", type=Path, help="成片路径，默认 <视频目录>/<名>-成片.mp4")
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--snap", type=float, default=0.3, help="边界吸附搜索半径秒（默认 0.3）")
    ap.add_argument("--margin", type=float, default=0.08, help="吸附后各留多少秒余量（默认 0.08）")
    ap.add_argument("--encoder", default="auto", choices=["auto", "h264_nvenc", "libx264"])
    args = ap.parse_args()

    video = args.video.resolve()
    out = (args.out or video.parent / f"{video.stem}-成片.mp4").resolve()
    duration = media_duration(video)
    rows = parse_cutlist(args.cutlist)
    dels = [r for r in rows if r["delete"]]
    print(f"[cut] 清单 {len(rows)} 行，执行 {len(dels)} 行；源时长 {fmt_time(duration)}")

    t0 = time.time()
    db = rms_db(read_audio(video, 16000), 16000)
    cuts = plan_cuts(dels, db, duration, args.snap, args.margin)
    keeps = keep_segments(cuts, duration)
    removed = sum(c["end"] - c["start"] for c in cuts)
    new_dur = duration - removed
    for c in cuts:
        print(f"  删 #{','.join(map(str, c['n']))}: {fmt_time(c['orig'][0])}–{fmt_time(c['orig'][1])} "
              f"→ 吸附 {fmt_time(c['start'])}–{fmt_time(c['end'])}（{c['end'] - c['start']:.2f}s）")
    print(f"[cut] 删 {len(cuts)} 段共 {removed:.2f}s，保留 {len(keeps)} 段，成片 {fmt_time(new_dur)}（分析 {time.time() - t0:.1f}s）")

    enc = pick_h264_encoder() if args.encoder == "auto" else args.encoder
    t0 = time.time()
    render(video, keeps, out, args.height, args.fps, enc)
    print(f"[cut] 编码 {enc}，{time.time() - t0:.1f}s → {out}")

    write_json(out.parent / "剪辑映射.json", {
        "source": str(video), "output": str(out), "source_duration": duration, "output_duration": new_dur,
        "cuts": cuts, "keeps": keeps})
    if args.words:
        data = load_json(args.words)
        retimed = retime_words(data, keeps)
        retimed["media"] = str(out)
        retimed["duration"] = round(new_dur, 3)
        write_json(out.with_name(out.stem + ".words.json"), retimed)
        cues = cues_from_segments(retimed["segments"])
        write_srt(cues, out.with_suffix(".srt"))
        print(f"[cut] 字幕重定时：{len(retimed['segments'])} 段 → {len(cues)} 条 srt → {out.with_suffix('.srt').name}")


if __name__ == "__main__":
    main()
