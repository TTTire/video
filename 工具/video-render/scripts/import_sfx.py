"""把 工具/音效库/ 里的音效整理进工程。
规则：文件名里包含类型词即可，例如 whoosh_1.wav、轻-whoosh.mp3、重击- impact.mp3；同一类型可以放多个版本，渲染时会轮流使用。
处理：裁掉首尾静音 → 按类型限制最长时长并淡出 → 统一响度 → 转成 48k 双声道 wav → 写入 public/sfx/ 和 src/sfx-manifest.json
用法：python3 scripts/import_sfx.py
"""
import json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = os.path.join(os.path.dirname(ROOT), "音效库"), f"{ROOT}/public/sfx"
TYPES = ["whoosh", "pop", "impact", "swipe", "tick", "ding", "riser", "flip", "cash", "error", "typing", "notify", "boom", "shutter", "ambience"]
# 每类的目标响度（LUFS），环境声和上扬音压低一些
LOUD = {"ambience": -32, "riser": -24, "tick": -26, "typing": -26}
# 每类最长保留多少秒（超过的部分淡出裁掉）
MAXLEN = {"whoosh": 1.2, "pop": 0.8, "impact": 1.6, "swipe": 1.0, "tick": 3.0, "ding": 2.0, "riser": 3.0, "flip": 0.8,
          "cash": 1.6, "error": 1.2, "typing": 3.0, "notify": 1.6, "boom": 2.5, "shutter": 0.8, "ambience": 60.0}

os.makedirs(OUT, exist_ok=True)
manifest, skipped = {}, []
for f in sorted(os.listdir(SRC)):
    if f.startswith("."): continue
    found = [t for t in TYPES if t in f.lower()]
    t = found[0] if found else ""
    if not t:
        skipped.append(f); continue
    i = len(manifest.get(t, [])) + 1
    name = f"{t}_{i}.wav"
    L = MAXLEN[t]
    # riser 要保留结尾的高潮，所以从尾部往前截；其他类型从开头截
    trim = "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
    cut = f"areverse,atrim=0:{L},areverse,afade=t=in:d=0.05" if t == "riser" else f"atrim=0:{L},afade=t=out:st={max(0, L - 0.25)}:d=0.25"
    af = f"silenceremove=start_periods=1:start_threshold=-50dB,{trim},{cut},loudnorm=I={LOUD.get(t, -20)}:TP=-2"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{f}", "-af", af, "-ar", "48000", "-ac", "2", f"{OUT}/{name}"], check=True)
    d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f"{OUT}/{name}"]))
    manifest.setdefault(t, []).append({"file": name, "dur": round(d, 2), "from": f})
    print(f"  {f:22s} → {name:14s} {d:.2f}s")
json.dump(manifest, open(f"{ROOT}/src/sfx-manifest.json", "w"), ensure_ascii=False, indent=1)
for t in TYPES:
    print(f"{t:9s} {len(manifest.get(t, []))} 个")
if skipped: print("未识别类型、已跳过：", skipped)
