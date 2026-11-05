"""打印 A-roll 出镜表：每段的模式、要点范围、时间、开头那条字幕。
用法：python3 scripts/aroll_cues.py <epN>
cue 的 at 写要点 id（讲稿卡期，查 timeline.points）或口播稿行号（ep8 及以前），和 register.tsx 的 cueFrame 同口径。
"""
import bisect, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]
pj = json.load(open(f"{ROOT}/src/{ep}/photo.json", encoding="utf-8"))
tl = json.load(open(f"{ROOT}/src/{ep}/timeline.json", encoding="utf-8"))
ar = pj.get("aroll")
if not ar: sys.exit("photo.json 没有 aroll")
total = tl["total"]
lines = [sc["from"] + s for sc in tl["scenes"] for s in sc["steps"]]   # 老期：口播稿第 i 行开始的帧
points = tl.get("points") or {}                                        # 讲稿卡期：{要点 id: 开始帧}


def F(at):
    if isinstance(at, str):
        if at == "0.1": return 0   # 开口前有几帧静音，别让 idle 闪一下
        if at == "end": return total
        if at not in points: sys.exit(f"cue 里的要点 id「{at}」timeline.json 里没有：讲稿卡改过要点就改 cue，再重跑 make_timeline.py")
        return points[at]
    return 0 if at <= 0 else total if at >= len(lines) else lines[at]


def ts(fr): s = fr / 30; return f"{int(s // 60):02d}:{s - int(s // 60) * 60:05.2f}"


idle = ar.get("idle", "bubble")
hide_on = set(ar.get("hideOn", ["chapter", "series"]))
frames = [idle] * total
for c in sorted(ar["cues"], key=lambda c: F(c["at"][0])):
    a = F(c["at"][0])
    b = min(total, F(c["at"][1]), a + round(c["max"] * 30) if c.get("max") else total)   # max：最多几秒，和 aroll.tsx 一致
    for i in range(a, b): frames[i] = c["mode"]
for sc in tl["scenes"]:
    if sc["scene"] in hide_on:
        for i in range(sc["from"], min(total, sc["from"] + sc["dur"])): frames[i] = "hide"  # 和 aroll.tsx 一致：章节卡 / 栏目卡整段 hide
segs = []
for i, m in enumerate(frames):
    if segs and segs[-1][2] == m: segs[-1][1] = i + 1
    else: segs.append([i, i + 1, m])
ids, starts = (list(points), list(points.values())) if points else ([str(i) for i in range(len(lines))], lines)
def label(fr): return ids[max(0, bisect.bisect_right(starts, fr) - 1)]
subs = tl["subs"]
print(f"| # | 模式 | {'要点' if points else '行号'} | 时间 | 时长 | 开头 |\n|---|---|---|---|---|---|")
for i, (fa, fb, m) in enumerate(segs):
    # 段开头那一刻正在说的那条（正好在停顿里就取下一条）；讲稿卡估时一条要点只有一条预览字幕，取「之后第一条」会错到下一条要点
    first = next((x["text"] for x in subs if x["from"] <= fa < x["from"] + x["dur"]), None) or next((x["text"] for x in subs if x["from"] >= fa), "—")
    print(f"| {i+1:02d} | {m} | {label(fa)}–{label(fb - 1)} | {ts(fa)} | {(fb - fa) / 30:.1f}s | {first[:18]} |")
