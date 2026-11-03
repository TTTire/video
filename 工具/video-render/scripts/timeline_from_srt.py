"""用真人口播的字幕（剪映导出的 srt）生成时间轴，代替合成配音的时间。
用法：python scripts/timeline_from_srt.py <口播逐字稿.md> <口播.srt> <期号如 ep6> <场景表.json> [--strict]

- 逐字稿每一句对应 srt 的一条字幕。比对时去掉标点、数字按原样；默认允许少量出入（相似度 ≥ 0.8），
  句数对不上时自动按内容对齐，并把漏念 / 多念 / 改词的句子列出来；--strict 时任何不一致都报错停下。
- 逐字稿和字幕不是一句对一条时（口播稿按停顿断行、一条字幕拆成几行，或自由讲后把口播稿改成实际念的版本），
  句级对齐出入太多会自动退到逐字对齐：每条字幕的时间按字数均摊到每个字，逐字稿每行取它匹配到的首尾字的时间；
  匹配到的字不足九成仍然停下。
- 双语字幕（中文一行 + 英文一行）只取第一行比对。
- 章节标题口播里不念：章节卡放在上一句结束后 0.1 秒，显示 2.2 秒，盖住新章节第一句的开头。
- 输出 src/<期号>/timeline.json；总时长 = 最后一句结束 + 2 秒，从 0 秒起和口播对齐。
"""
import difflib, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, CHAPTER_DUR, SIM = 30, 2.2, 0.8
def norm(s):
    # 剪映版的读法和稿子等价：4.3% ↔ 百分之4点3
    s = re.sub(r"(\d+(?:\.\d+)?)\s*%", lambda m: "百分之" + m.group(1), s)
    s = re.sub(r"(\d)\.(\d)", lambda m: m.group(1) + "点" + m.group(2), s)
    return re.sub(r"[\s，。？！、“”‘’：；《》,.?!\"'·—…（）()\-]", "", s)


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
        h, m, r = s.strip().split(":"); sec, ms = r.replace(".", ",").split(",")
        return int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000
    cues = []
    for block in re.split(r"\n\s*\n", open(path, encoding="utf-8-sig").read().strip()):
        rows = [r for r in block.strip().splitlines() if r.strip()]
        i = next((k for k, r in enumerate(rows) if "-->" in r), None)
        if i is None: continue
        a, b = rows[i].split("-->")
        text_rows = rows[i + 1:]
        # 双语字幕只取第一行（中文）
        cues.append((t(a), t(b), text_rows[0] if text_rows else ""))
    return cues


def sim(a, b):
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def align(lines, cues):
    """全局对齐（Needleman–Wunsch）：返回 [(line_idx | None, cue_idx | None)]"""
    n, m = len(lines), len(cues)
    GAP = -0.6
    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): S[i][0] = i * GAP
    for j in range(1, m + 1): S[0][j] = j * GAP
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sc = sim(lines[i - 1]["text"], cues[j - 1][2]) * 2 - 1  # 相似 1 → +1，完全不同 → -1
            S[i][j] = max(S[i - 1][j - 1] + sc, S[i - 1][j] + GAP, S[i][j - 1] + GAP)
    pairs, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and abs(S[i][j] - (S[i - 1][j - 1] + sim(lines[i - 1]["text"], cues[j - 1][2]) * 2 - 1)) < 1e-9:
            pairs.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and abs(S[i][j] - (S[i - 1][j] + GAP)) < 1e-9:
            pairs.append((i - 1, None)); i -= 1
        else:
            pairs.append((None, j - 1)); j -= 1
    return pairs[::-1]


def align_chars(lines, cues):
    """逐字对齐：给每行写 start/end，返回出入列表。单字匹配不当锚点（太容易撞上“的”“了”）。"""
    # 剪映会把一句长话导成前后两条文字一模一样的字幕（第二条常常只有零点几秒）：并成一条，
    # 不然逐字匹配会贴到和下一条连着的第二份，整句晚 1–4 秒
    merged = []
    for a, b, txt in cues:
        if merged and norm(merged[-1][2]) == norm(txt): merged[-1] = (merged[-1][0], b, merged[-1][2])
        else: merged.append((a, b, txt))
    cues = merged
    ct, cc = [], []  # 字幕每个字的 (start, end, 条号) / 字
    for j, (a, b, txt) in enumerate(cues):
        t = norm(txt)
        for i, ch in enumerate(t):
            ct.append((a + (b - a) * i / len(t), a + (b - a) * (i + 1) / len(t), j)); cc.append(ch)
    lc, owner = [], []
    for li, it in enumerate(lines):
        it.pop("start", None); it.pop("end", None)
        t = norm(it["text"]); lc.extend(t); owner.extend([li] * len(t))
    hit = [None] * len(lc)
    for i, j, n in difflib.SequenceMatcher(None, lc, cc, autojunk=False).get_matching_blocks():
        if n >= 2:
            for k in range(n): hit[i + k] = j + k
    problems, missing = [], []
    for li, it in enumerate(lines):
        hs = [h for h, o in zip(hit, owner) if o == li and h is not None]
        n = owner.count(li)
        if not hs:
            missing.append(li); problems.append(f"  漏念  稿：{it['text']}"); continue
        it.update(start=ct[hs[0]][0], end=ct[hs[-1]][1])
        if len(hs) < n * 0.5: problems.append(f"  不像({len(hs)}/{n} 字)  稿：{it['text']}")
    for li in missing:
        prev = next((lines[k] for k in range(li - 1, -1, -1) if "start" in lines[k]), None)
        nxt = next((lines[k] for k in range(li + 1, len(lines)) if "start" in lines[k]), None)
        t0 = prev["end"] if prev else 0.0
        lines[li].update(start=t0, end=nxt["start"] if nxt else t0)
    used = set(h for h in hit if h is not None)
    for j, (a, b, txt) in enumerate(cues):
        extra = "".join(ch for k, ch in enumerate(cc) if ct[k][2] == j and k not in used)
        if len(extra) >= 3: problems.append(f"  多念  字幕：{txt}（没对上的字：{extra}）")
    return sum(h is not None for h in hit) / max(1, len(lc)), problems

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    strict = "--strict" in sys.argv
    md, srt, ep, smap = args[:4]
    items, cues = parse_md(md), parse_srt(srt)
    lines = [it for it in items if it["type"] == "line"]

    problems = []
    if len(lines) == len(cues) and all(sim(a["text"], b[2]) >= SIM for a, b in zip(lines, cues)):
        for it, (a, b, txt) in zip(lines, cues):
            it.update(start=a, end=b)
            if norm(it["text"]) != norm(txt): problems.append(f"  改词  稿：{it['text']}\n        字幕：{txt}")
    else:
        pairs = align(lines, cues)
        missing = []
        for li, ci in pairs:
            if li is not None and ci is not None:
                a, b, txt = cues[ci]
                s = sim(lines[li]["text"], txt)
                if s < SIM: problems.append(f"  不像({s:.2f})  稿：{lines[li]['text']}\n            字幕：{txt}")
                elif norm(lines[li]["text"]) != norm(txt): problems.append(f"  改词  稿：{lines[li]['text']}\n        字幕：{txt}")
                lines[li].update(start=a, end=b)
            elif li is not None:
                missing.append(li); problems.append(f"  漏念  稿：{lines[li]['text']}")
            else:
                problems.append(f"  多念  字幕：{cues[ci][2]}")
        # 漏念的句子：借用相邻句的时间，让场景切换不至于断掉
        for li in missing:
            prev = next((lines[k] for k in range(li - 1, -1, -1) if "start" in lines[k]), None)
            nxt = next((lines[k] for k in range(li + 1, len(lines)) if "start" in lines[k]), None)
            t0 = prev["end"] if prev else 0.0
            t1 = nxt["start"] if nxt else t0
            lines[li].update(start=t0, end=t1)
        if len(lines) != len(cues): problems.insert(0, f"  句数：逐字稿 {len(lines)} 句，字幕 {len(cues)} 条")
        bad = sum(p.lstrip().startswith(("不像", "漏念", "多念")) for p in problems)
        if bad > max(3, len(lines) * 0.05) and not strict:
            cover, problems = align_chars(lines, cues)
            print(f"句级对齐出入 {bad} 处，改为逐字对齐：逐字稿 {len(lines)} 句 / 字幕 {len(cues)} 条，{cover:.0%} 的字对上了")
            if cover < 0.9:
                print("\n".join(problems)); sys.exit("对上的字不足九成，先把口播稿改成实际念的版本再跑（或确认字幕文件对）。")

    if problems:
        print(f"逐字稿和字幕有 {len(problems)} 处出入：")
        print("\n".join(problems))
        if strict: sys.exit("--strict：有出入就停。")
        print("（已按内容对齐继续生成；建议把口播稿改成实际念的版本，保持两边一致）")

    # 章节卡：上一句结束后 0.1 秒开始
    for i, it in enumerate(items):
        if it["type"] == "chapter":
            prev_end = items[i - 1]["end"] if i else 0
            it.update(start=prev_end + 0.1, end=prev_end + 0.1 + CHAPTER_DUR)
    total = max(it["end"] for it in lines) + 2.0
    F = lambda s: round(s * FPS)

    scenemap = {int(k): v for k, v in json.load(open(smap, encoding="utf-8")).items()}
    keys = sorted(scenemap)
    if keys and keys[-1] >= len(items):
        sys.exit(f"场景表里的句号 {keys[-1]} 超出范围（逐字稿含章节标题共 {len(items)} 行，序号 0–{len(items) - 1}）")
    starts = []
    for n, k in enumerate(keys):
        s = 0 if n == 0 else F(items[k]["start"])
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
    subs = [{"from": F(it["start"]), "dur": max(1, F(it["end"] - it["start"])), "text": it["text"].rstrip("。，？！")} for it in lines]
    os.makedirs(f"{ROOT}/src/{ep}", exist_ok=True)
    out = f"{ROOT}/src/{ep}/timeline.json"
    json.dump({"fps": FPS, "total": F(total), "scenes": scenes, "subs": subs, "source": "srt"}, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{ep}: {len(lines)} 句, {len(scenes)} 个场景, {total:.1f} 秒（按口播字幕）→ {out}")


main()
