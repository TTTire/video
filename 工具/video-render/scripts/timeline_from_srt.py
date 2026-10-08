"""用真人口播的字幕（剪映导出的 srt）生成时间轴，代替合成配音的时间。
用法：python3 scripts/timeline_from_srt.py <口播逐字稿.md> <口播.srt> <期号如 ep6> <场景表.json>

- 逐字稿里每一句要和 srt 的一条字幕一一对应（去掉标点后逐条核对，不一致就报错停下）。
- 章节标题口播里不念：章节卡放在上一句结束后 0.1 秒，显示 2.2 秒，盖住新章节第一句的开头。
- 输出 src/<期号>/timeline.json；总时长 = 最后一句结束 + 2 秒，从 0 秒起和口播对齐。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, CHAPTER_DUR = 30, 2.2
norm = lambda s: re.sub(r"[\s，。？！、“”‘’：；《》,.?!\"'·—…（）()]", "", s)


def parse_md(path):
    items = []
    for l in open(path, encoding="utf-8").read().splitlines():
        l = l.strip()
        if not l or l.startswith("# "):
            continue
        m = re.match(r"## 第(\d)章：(.*)", l)
        items.append({"type": "chapter", "chapter": int(m.group(1)), "text": m.group(2)} if m else {"type": "line", "text": l})
    return items


def parse_srt(path):
    def t(s):
        h, m, r = s.strip().split(":"); sec, ms = r.split(",")
        return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000
    cues = []
    for block in re.split(r"\n\s*\n", open(path, encoding="utf-8-sig").read().strip()):
        rows = block.strip().splitlines()
        i = next(k for k, r in enumerate(rows) if "-->" in r)
        a, b = rows[i].split("-->")
        cues.append((t(a), t(b), "".join(rows[i + 1:])))
    return cues


def main():
    md, srt, ep, smap = sys.argv[1:5]
    items, cues = parse_md(md), parse_srt(srt)
    lines = [it for it in items if it["type"] == "line"]
    if len(lines) != len(cues):
        sys.exit(f"句数对不上：逐字稿 {len(lines)} 句，字幕 {len(cues)} 条")
    for i, (it, (a, b, txt)) in enumerate(zip(lines, cues)):
        if norm(it["text"]) != norm(txt):
            sys.exit(f"第 {i} 句不一致：\n  稿：{it['text']}\n  字幕：{txt}")
        it.update(start=a, end=b)
    # 章节卡：上一句结束后 0.1 秒开始
    for i, it in enumerate(items):
        if it["type"] == "chapter":
            prev_end = items[i - 1]["end"] if i else 0
            it.update(start=prev_end + 0.1, end=prev_end + 0.1 + CHAPTER_DUR)
    total = cues[-1][1] + 2.0
    F = lambda s: round(s * FPS)

    scenemap = {int(k): v for k, v in json.load(open(smap, encoding="utf-8")).items()}
    keys = sorted(scenemap)
    starts = []
    for n, k in enumerate(keys):
        s = 0 if n == 0 else F(items[k]["start"])
        # 紧跟章节卡的场景，等章节卡放完再出来
        if n and items[keys[n - 1]]["type"] == "chapter":
            s = max(s, F(items[keys[n - 1]]["end"]))
        starts.append(s)
    scenes = []
    for n, k in enumerate(keys):
        end_k = keys[n + 1] if n + 1 < len(keys) else len(items)
        f0, f1 = starts[n], starts[n + 1] if n + 1 < len(keys) else F(total)
        sc = {"scene": scenemap[k], "from": f0, "dur": f1 - f0,
              "steps": [max(0, F(items[j]["start"]) - f0) for j in range(k, end_k)]}
        if items[k]["type"] == "chapter":
            sc.update(chapter=items[k]["chapter"], title=items[k]["text"])
        scenes.append(sc)
    subs = [{"from": F(it["start"]), "dur": F(it["end"] - it["start"]), "text": it["text"].rstrip("。，？！")} for it in lines]
    out = f"{ROOT}/src/{ep}/timeline.json"
    json.dump({"fps": FPS, "total": F(total), "scenes": scenes, "subs": subs, "source": "srt"}, open(out, "w"), ensure_ascii=False)
    print(f"{ep}: {len(lines)} 句, {len(scenes)} 个场景, {total:.1f} 秒（按口播字幕）")


main()
