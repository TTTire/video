"""faster-whisper 转写（字级时间戳）。输出 <名>.words.json 与 <名>.转写.txt。

用法: python scripts/transcribe.py <视频或音频> [--hotwords "词1,词2"] [--model large-v3]
      [--device auto|cuda|cpu] [--out-dir 目录] [--no-vad] [--language zh]
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import add_cuda_dlls, ensure_venv, fmt_time, read_audio, set_hf_env, write_json  # noqa: E402

ensure_venv()
set_hf_env()
add_cuda_dlls()

INITIAL_PROMPT = "以下是普通话的句子。"


def pick_device(want: str) -> tuple[str, str]:
    import ctranslate2
    if want == "cpu":
        return "cpu", "int8"
    n = ctranslate2.get_cuda_device_count()
    if n > 0:
        return "cuda", "float16"
    if want == "cuda":
        sys.exit("[transcribe] 要求 cuda 但 ctranslate2 看不到 CUDA 设备（cublas64_12/cudnn64_9 DLL 是否在 .venv 里？运行 setup.py）")
    return "cpu", "int8"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media", type=Path)
    ap.add_argument("--hotwords", default="", help="逗号分隔的专有名词，提高识别率")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    ap.add_argument("--language", default="zh")
    ap.add_argument("--beam-size", type=int, default=5)
    ap.add_argument("--no-vad", action="store_true", help="关闭 VAD 过滤")
    ap.add_argument("--out-dir", type=Path, help="默认与媒体同目录")
    args = ap.parse_args()

    from faster_whisper import WhisperModel

    media = args.media.resolve()
    out_dir = (args.out_dir or media.parent).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    device, compute = pick_device(args.device)

    t0 = time.time()
    audio = read_audio(media, 16000)  # 不走 faster-whisper 的 decode_audio（与当前 av 版本不兼容）
    audio_sec = len(audio) / 16000
    t_audio = time.time() - t0

    t0 = time.time()
    model = WhisperModel(args.model, device=device, compute_type=compute)
    t_load = time.time() - t0
    print(f"[transcribe] 设备 {device}/{compute}，模型 {args.model}，加载 {t_load:.1f}s，音频 {fmt_time(audio_sec)}（解码 {t_audio:.1f}s）")

    hotwords = ",".join(w.strip() for w in args.hotwords.split(",") if w.strip()) or None
    t0 = time.time()
    seg_iter, info = model.transcribe(
        audio, language=args.language, beam_size=args.beam_size, word_timestamps=True,
        vad_filter=not args.no_vad, vad_parameters={"min_silence_duration_ms": 300, "speech_pad_ms": 200},
        initial_prompt=INITIAL_PROMPT, hotwords=hotwords, condition_on_previous_text=False)
    segments = []
    glitches = 0
    for s in seg_iter:
        words = [{"word": w.word, "start": round(w.start, 3), "end": round(w.end, 3), "prob": round(w.probability, 3)}
                 for w in (s.words or [])]
        # Whisper 常把段首第一个字的时间戳拉到静音段开头（例如 15.79-16.27，而第二个字 17.79 才开始）。
        # 若段首字与第二个字之间空 >0.5s 且首字 ≤2 字，就把首字贴到第二个字前面。
        if len(words) >= 2 and words[1]["start"] - words[0]["end"] > 0.5 and len(words[0]["word"].strip()) <= 2:
            words[0]["end"] = round(words[1]["start"] - 0.02, 3)
            words[0]["start"] = round(words[0]["end"] - 0.28, 3)
            glitches += 1
        segments.append({"id": len(segments), "start": round(words[0]["start"] if words else s.start, 3),
                         "end": round(s.end, 3), "text": s.text.strip(), "words": words})
    t_asr = time.time() - t0
    glitch_note = f"，修正段首字时间戳 {glitches} 处" if glitches else ""
    print(f"[transcribe] 转写 {t_asr:.1f}s（{audio_sec / max(t_asr, 1e-6):.1f}x 实时），{len(segments)} 段{glitch_note}，"
          f"语言 {info.language}（p={info.language_probability:.2f}）")

    base = out_dir / media.stem
    write_json(f"{base}.words.json", {
        "media": str(media), "duration": round(audio_sec, 3), "model": args.model, "device": f"{device}/{compute}",
        "language": info.language, "hotwords": hotwords, "load_seconds": round(t_load, 2),
        "transcribe_seconds": round(t_asr, 2), "segments": segments})
    txt = "\n".join(f"[{fmt_time(s['start'], 1)}] {s['text']}" for s in segments) + "\n"
    Path(f"{base}.转写.txt").write_text(txt, encoding="utf-8")
    print(f"[transcribe] 写出 {base}.words.json / {base}.转写.txt")


if __name__ == "__main__":
    main()
