"""把渲染好的视频按场景切成片段，文件名带场景名，方便剪映里和出镜镜头穿插。
用法：python3 scripts/split_scenes.py <视频.mp4> <epN> <输出文件夹> [场景名映射.json]
映射文件：{"场景 id": "中文名"}；没有映射时直接用场景 id。只切视频时长覆盖到的场景。
"""
import json, os, subprocess, sys
video, ep, out = sys.argv[1], sys.argv[2], sys.argv[3]
names = json.load(open(sys.argv[4], encoding="utf-8")) if len(sys.argv) > 4 else {}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tl = json.load(open(f"{ROOT}/src/{ep}/timeline.json", encoding="utf-8"))
total = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]))
os.makedirs(out, exist_ok=True)
n = 0
for s in tl["scenes"]:
    a, b = s["from"] / 30, (s["from"] + s["dur"]) / 30
    if b > total + 0.05: break
    n += 1
    label = names.get(s["scene"], s["scene"]) if s["scene"] != "chapter" else f"第{s['chapter']}章-{s['title']}"
    lines = [x["text"] for x in tl["subs"] if s["from"] <= x["from"] < s["from"] + s["dur"]]
    f = f"{out}/{n:02d}-{label}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", video, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", f], check=True)
    print(f"{n:02d}-{label}  {b - a:.1f}s  ← " + " / ".join(l[:16] for l in lines))
