"""打印 A-roll 出镜表：每段的模式、口播行号、时间、第一句。
用法：python3 scripts/aroll_cues.py <epN>
"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]
pj = json.load(open(f"{ROOT}/src/{ep}/photo.json", encoding="utf-8"))
tl = json.load(open(f"{ROOT}/src/{ep}/timeline.json", encoding="utf-8"))
ar = pj.get("aroll")
if not ar: sys.exit("photo.json 没有 aroll")
lf = []
for sc in tl["scenes"]: lf += [sc["from"] + s for s in sc["steps"]]
total = tl["total"]
def F(i): return 0 if i <= 0 else total if i >= len(lf) else lf[i]
def ts(fr): s = fr / 30; return f"{int(s // 60):02d}:{s - int(s // 60) * 60:05.2f}"
idle = ar.get("idle", "bubble")
hide_on = set(ar.get("hideOn", ["chapter", "series"]))
frames = [idle] * total
for c in sorted(ar["cues"], key=lambda c: c["at"][0]):
    for i in range(F(c["at"][0]), min(total, F(c["at"][1]))): frames[i] = c["mode"]
for sc in tl["scenes"]:
    if sc["scene"] in hide_on:
        for i in range(sc["from"], min(total, sc["from"] + min(sc["dur"], 90))): frames[i] = "hide"
segs = []
for i, m in enumerate(frames):
    if segs and segs[-1][2] == m: segs[-1][1] = i + 1
    else: segs.append([i, i + 1, m])
subs = tl["subs"]
import bisect
def line_of(fr): return max(0, bisect.bisect_right(lf, fr) - 1)
print(f"| # | 模式 | 行号 | 时间 | 时长 | 第一句 |\n|---|---|---|---|---|---|")
for i, (fa, fb, m) in enumerate(segs):
    first = next((x["text"] for x in subs if x["from"] >= fa - 1), "—")
    print(f"| {i+1:02d} | {m} | {line_of(fa)}–{line_of(fb-1)} | {ts(fa)} | {(fb-fa)/30:.1f}s | {first[:18]} |")
