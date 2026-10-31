"""aroll-prep 冒烟测试：造测试素材 → 跑 sync / transcribe / propose_cuts / cut → 打印关键数字 → 删临时文件。

用法: python tests/smoke.py [--keep] [--skip-asr]
依赖: ffmpeg、`工具/video-render/out/ep8-full.mp4`（对齐用）、Windows SAPI 中文语音（转写用，没有就跳过）。
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
TMP = ROOT / "tests" / "_tmp"
EP8 = ROOT.parent / "video-render" / "out" / "ep8-full.mp4"
PY = sys.executable

TTS_PS1 = r'''
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$v = $s.GetInstalledVoices() | ? { $_.VoiceInfo.Culture.Name -like "zh*" } | Select -First 1
if (-not $v) { Write-Output "NO_ZH_VOICE"; exit 0 }
$s.SelectVoice($v.VoiceInfo.Name)
$s.SetOutputToWaveFile("%OUT%")
$s.SpeakSsml(@"
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
大家好，今天我们聊一个很多人都遇到过的问题：为什么海底捞涨价之后，还要专门出来道歉。<break time="600ms"/>
答案藏在一个经济学概念里，叫做需求价格弹性。<break time="900ms"/>
答案藏在一个经济学概念里，叫做需求价格弹性。<break time="3000ms"/>
呃，<break time="250ms"/>简单说，弹性就是价格变动一点，销量会跟着变多少。<break time="500ms"/>
如果一涨价顾客就跑光，那就是弹性大；如果涨了价大家还是照样来，那就是弹性小。<break time="500ms"/>
火锅这个品类，替代品太多了，隔壁就是另一家火锅店，所以它的弹性天然就大。<break time="500ms"/>
这就解释了为什么海底捞涨价六个点，就被骂上了热搜。<break time="500ms"/>
下期我们再聊，为什么有些东西越涨价越多人买。
</speak>
"@)
$s.Dispose()
Write-Output $v.VoiceInfo.Name
'''


def sh(*cmd: str, capture: bool = False) -> str:
    r = subprocess.run([str(c) for c in cmd], check=True, capture_output=capture, text=capture,
                       encoding="utf-8" if capture else None, errors="replace")
    return r.stdout if capture else ""


def ff(*args: str) -> None:
    sh("ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args)


def duration(p: Path) -> float:
    out = sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p, capture=True)
    return float(out.strip())


def sync_case(name: str, drift_af: str | None) -> dict:
    d = TMP / name / "原片"
    d.mkdir(parents=True, exist_ok=True)
    ff("-ss", "0", "-t", "180", "-i", EP8, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", d / "cam01.mp4")
    rec_filter = ("[0:a]aformat=channel_layouts=mono,adelay=delays=2345:all=1,equalizer=f=200:t=q:w=1:g=-6,"
                  "equalizer=f=4000:t=q:w=1:g=3,apad,atrim=end=190[a];"
                  "[1:a]aformat=channel_layouts=mono,atrim=end=190[n];[a][n]amix=inputs=2:normalize=0[o]")
    ff("-i", d / "cam01.mp4", "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.0316:r=48000:d=200",
       "-filter_complex", rec_filter, "-map", "[o]", "-ar", "48000", d / "recorder0.wav")
    if drift_af:
        ff("-i", d / "recorder0.wav", "-af", drift_af, d / "recorder.wav")
        (d / "recorder0.wav").unlink()
    else:
        (d / "recorder0.wav").rename(d / "recorder.wav")
    sh(PY, SCRIPTS / "sync.py", d, "--concat")
    rep = json.loads((TMP / name / "同步" / "同步报告.json").read_text(encoding="utf-8"))["segments"][0]
    return {"offset": rep["offset"], "ppm": rep["ppm"], "acc_ms": rep["acc_ms"], "corrected": rep["corrected"],
            "conf": rep["conf"], "loudnorm": rep["loudnorm"]}


def asr_case() -> dict | None:
    d = TMP / "asr" / "原片"
    d.mkdir(parents=True, exist_ok=True)
    wav = TMP / "asr" / "tts.wav"
    ps1 = TMP / "asr" / "tts.ps1"
    ps1.write_bytes(b"\xef\xbb\xbf" + TTS_PS1.replace("%OUT%", str(wav)).encode("utf-8"))  # 带 BOM 否则 PS5 按 ANSI 读
    voice = sh("powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, capture=True).strip()
    if "NO_ZH_VOICE" in voice or not wav.exists():
        print("[smoke] 没有中文 SAPI 语音，跳过转写链路")
        return None
    ff("-f", "lavfi", "-i", "color=c=0x202830:s=1920x1080:r=30", "-i", wav, "-filter_complex",
       "[1:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=120,lowpass=f=5000,volume=-8dB[a]",
       "-map", "0:v", "-map", "[a]", "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", d / "talk01.mp4")
    ff("-i", wav, "-af", "aresample=48000,adelay=delays=1234:all=1,volume=-3dB", d / "rec.wav")
    sh(PY, SCRIPTS / "sync.py", d)
    out = TMP / "asr" / "同步"
    synced = out / "talk01-同步.mp4"
    asr_log = sh(PY, SCRIPTS / "transcribe.py", synced, "--hotwords", "海底捞,需求价格弹性", capture=True)
    print(asr_log, end="")
    words = out / "talk01-同步.words.json"
    prop_log = sh(PY, SCRIPTS / "propose_cuts.py", words, capture=True)
    print(prop_log, end="")
    items = json.loads((out / "剪切清单.json").read_text(encoding="utf-8"))["items"]
    cut_log = sh(PY, SCRIPTS / "cut.py", synced, out / "剪切清单.md", "--words", words, capture=True)
    print(cut_log, end="")
    final = out / "talk01-同步-成片.mp4"
    src_dur, dst_dur = duration(synced), duration(final)
    srt = (out / "talk01-同步-成片.srt").read_text(encoding="utf-8")
    cues = [(int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000, int(h2) * 3600 + int(m2) * 60 + int(s2) + int(ms2) / 1000)
            for h, m, s, ms, h2, m2, s2, ms2 in re.findall(r"(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)", srt)]
    mono = all(a < b for a, b in cues) and all(cues[i][1] <= cues[i + 1][0] for i in range(len(cues) - 1)) \
        and (not cues or cues[-1][1] <= dst_dur + 0.01)
    return {"voice": voice, "transcript": (out / "talk01-同步.转写.txt").read_text(encoding="utf-8"),
            "types": sorted({it["type"] for it in items}), "items": len(items),
            "src_dur": src_dur, "dst_dur": dst_dur, "cues": len(cues), "srt_monotonic": mono,
            "asr_log": asr_log}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", action="store_true", help="跑完保留 tests/_tmp")
    ap.add_argument("--skip-asr", action="store_true")
    args = ap.parse_args()
    if not EP8.exists():
        sys.exit(f"缺少对齐测试素材 {EP8}")
    if TMP.exists():
        shutil.rmtree(TMP)
    TMP.mkdir(parents=True)
    try:
        r1 = sync_case("sync1", None)
        print(f"[smoke] 对齐（无钟漂）: 偏移 {r1['offset']:.3f}s（期望 2.345）置信度 {r1['conf']:.2f}")
        r2 = sync_case("sync2", "aresample=480000,asetrate=480144,aresample=48000")  # 精确 ×1.0003
        print(f"[smoke] 对齐（×1.0003）: 偏移 {r2['offset']:.3f}s 钟漂 {r2['ppm']:.1f}ppm（期望 -300）"
              f" 段尾 {r2['acc_ms']:.1f}ms（期望 -54）修正={r2['corrected']} 置信度 {r2['conf']:.2f}")
        if not args.skip_asr:
            ra = asr_case()
            if ra:
                print(f"[smoke] 转写链路: 语音 {ra['voice']}；提议 {ra['items']} 处 {ra['types']}；"
                      f"时长 {ra['src_dur']:.2f}s → {ra['dst_dur']:.2f}s；srt {ra['cues']} 条，单调且在时长内={ra['srt_monotonic']}")
    finally:
        if not args.keep and TMP.exists():
            shutil.rmtree(TMP, ignore_errors=True)
            print("[smoke] 已清理 tests/_tmp")


if __name__ == "__main__":
    main()
