"""录音前的预览时间轴：没有 srt 时，按字数估算每句时长生成 timeline.json，用来先渲拼图看版式。
用法：python scripts/estimate_timeline.py <口播逐字稿.md> <期号如 ep7> <场景表.json> [--cpm 275]
每句时长 = 汉字数 / 每分钟字数（默认 275，按最近实录）+ 0.35 秒停顿；数字按 2 个字算。拿到真实 srt 后用 timeline_from_srt.py 覆盖。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, CHAPTER_DUR, PAUSE = 30, 2.2, 0.35
args = [a for a in sys.argv[1:] if not a.startswith("--")]
md, ep, smap = args[:3]
cpm = float(sys.argv[sys.argv.index("--cpm") + 1]) if "--cpm" in sys.argv else 275.0

items = []
for l in open(md, encoding="utf-8").read().splitlines():
    l = l.strip()
    if not l or l.startswith("# "): continue
    m = re.match(r"## 第(\d)章：(.*)", l)
    items.append({"type": "chapter", "chapter": int(m.group(1)), "text": m.group(2)} if m else {"type": "line", "text": l})

t = 0.3
for it in items:
    if it["type"] == "chapter":
        it.update(start=t + 0.1, end=t + 0.1 + CHAPTER_DUR); continue
    n = len(re.findall(r"[\u4e00-\u9fff]", it["text"])) + 2 * len(re.findall(r"\d+(?:\.\d+)?", it["text"])) + len(re.findall(r"[A-Za-z]+", it["text"]))
    d = max(1.0, n / cpm * 60) + PAUSE
    it.update(start=t, end=t + d); t += d + 0.15
total = t + 2.0
F = lambda s: round(s * FPS)
scenemap = {int(k): v for k, v in json.load(open(smap, encoding="utf-8")).items()}
keys = sorted(scenemap)
starts = []
for n, k in enumerate(keys):
    s = 0 if n == 0 else F(items[k]["start"])
    if n and items[keys[n - 1]]["type"] == "chapter": s = max(s, F(items[keys[n - 1]]["end"]))
    starts.append(s)
scenes = []
for n, k in enumerate(keys):
    end_k = keys[n + 1] if n + 1 < len(keys) else len(items)
    f0, f1 = starts[n], starts[n + 1] if n + 1 < len(keys) else F(total)
    sc = {"scene": scenemap[k], "from": f0, "dur": f1 - f0, "steps": [max(0, F(items[j]["start"]) - f0) for j in range(k, end_k)]}
    if items[k]["type"] == "chapter": sc.update(chapter=items[k]["chapter"], title=items[k]["text"])
    scenes.append(sc)
subs = [{"from": F(it["start"]), "dur": F(it["end"] - it["start"]), "text": it["text"].rstrip("。，？！")} for it in items if it["type"] == "line"]
out = f"{ROOT}/src/{ep}/timeline.json"
json.dump({"fps": FPS, "total": F(total), "scenes": scenes, "subs": subs, "source": "estimate"}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
print(f"{ep}: {len(subs)} 句, {len(scenes)} 个场景, 估算 {total / 60:.1f} 分钟（{cpm:.0f} 字/分）→ {out}  ※ 预览用，录完音用 timeline_from_srt.py 覆盖")
