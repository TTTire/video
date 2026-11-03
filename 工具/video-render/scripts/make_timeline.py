"""讲稿卡 → src/<期号>/timeline.json（渲染时间轴）。在 工具/video-render 下运行（Windows 把 python3 换成 python）：

  python3 scripts/make_timeline.py <讲稿卡.md> <期号> [--cpm 200]
      录前：按每条要点的字数估时，先渲拼图看版式。cpm = 每分钟讲多少字，按讲稿卡上的字数算、含停顿（AI03 实录约 200）
  python3 scripts/make_timeline.py <讲稿卡.md> <期号> --starts src/<期号>/starts.json [--srt <粗剪.srt>]
      录后：按要点起点表。表不存在时先生成一张空表（讲稿卡里每个要点 id 都列好），照粗剪填完再跑。

要点起点表：{"0.1": "00:00.0", "0.2": "00:07.4", …, "1.0": "01:00.2", …, "end": "08:19.5"}
  值写秒数或 mm:ss.s，和 A-roll 同一条时间线（分段录的先拼成一条再填）；
  N.0 填上一章最后一句说完的时间；end 填最后一句说完（给了 --srt 可不填，取最后一条字幕的结束）；
  临场跳过的要点填和下一条一样的时间；它要是某个场景的起始要点，那个场景时长为 0，会被跳过。
场景表 src/<期号>/scenemap.json 由 scenes_from_checklist.py 生成（键是起始要点 id）。

timeline.json：
  scenes[].steps  场景内每条要点的起点（相对场景 from）；photo.json 里的 at / until / swap.at 都是它的下标
  points          {要点 id: 开始帧}，A-roll cues 按它换算
  章节卡 N.0 从它的时间开始，至少显示 2.2 秒，盖住新一章第一条要点的开头
  subs            只给拼图 / 检查版预览：没有 --srt 时是「要点 id + 要点开头」，有 --srt 时是字幕条
"""
import json, os, re, sys

from card import parse_card, plain, spoken_len

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, CHAPTER_DUR, LEAD, TAIL, MIN_POINT = 30, 2.2, 0.3, 2.0, 2.0
F = lambda s: round(s * FPS)
ts = lambda fr: f"{int(fr / FPS // 60):02d}:{fr / FPS % 60:04.1f}"


def args():
    pos, opts, i = [], {}, 1
    while i < len(sys.argv):
        a = sys.argv[i]
        if a in ("--cpm", "--starts", "--srt"):
            if i + 1 >= len(sys.argv): sys.exit(f"{a} 后面要跟值")
            opts[a], i = sys.argv[i + 1], i + 2
        elif a.startswith("--"): sys.exit(f"不认识的参数 {a}\n{__doc__}")
        else: pos.append(a); i += 1
    if len(pos) != 2: sys.exit(__doc__)
    return pos, opts


def seconds(v):
    """秒数或 mm:ss.s / h:mm:ss.s → 秒"""
    if isinstance(v, (int, float)): return float(v)
    s = 0.0
    try:
        for part in str(v).strip().split(":"): s = s * 60 + float(part)
    except ValueError:
        sys.exit(f"起点表里的时间「{v}」看不懂，写秒数或 mm:ss.s")
    return s


def parse_srt(path):
    """→ [(起, 止, 文字)]；双语字幕只取第一行（中文）"""
    def t(s):
        h, m, r = s.strip().split(":")
        return int(h) * 3600 + int(m) * 60 + float(r.replace(",", "."))
    cues = []
    for block in re.split(r"\n\s*\n", open(path, encoding="utf-8-sig").read().strip()):
        rows = [r for r in block.strip().splitlines() if r.strip()]
        i = next((k for k, r in enumerate(rows) if "-->" in r), None)
        if i is None: continue
        a, b = rows[i].split("-->")
        cues.append((t(a), t(b.split()[0]), rows[i + 1].strip() if i + 1 < len(rows) else ""))
    if not cues: sys.exit(f"{path} 里没读到字幕")
    return cues


def estimate(points, cpm):
    """录前：每条要点讲 字数 / cpm 分钟，一条接一条；章节卡 N.0 贴在上一条讲完的时候"""
    start, t = {}, LEAD
    for p in points:
        start[p["id"]] = t
        if p["n"]: t += max(MIN_POINT, spoken_len(p["text"]) / cpm * 60)
    return start, t


def from_starts(points, path, cues):
    """录后：读要点起点表 → ({要点 id: 秒}, 最后一句说完的秒数)"""
    ids = [p["id"] for p in points]
    if not os.path.exists(path):
        json.dump({**{i: None for i in ids}, "end": None}, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        sys.exit(f"已生成空的要点起点表 {path}：照粗剪填每条要点开口的时间（秒数或 mm:ss.s），"
                 "N.0 填上一章最后一句说完的时间，end 填最后一句说完（给了 --srt 可不填）。填完再跑。")
    raw = json.load(open(path, encoding="utf-8"))
    extra = [k for k in raw if k not in ids and k != "end"]
    if extra: sys.exit("起点表里有讲稿卡没有的要点：" + "、".join(extra) + "（讲稿卡增删过要点，就对着新卡改表）")
    empty = [i for i in ids if raw.get(i) in (None, "")]
    if empty: sys.exit("起点表还有要点没填：" + "、".join(empty))
    start = {i: seconds(raw[i]) for i in ids}
    back = [f"{a}→{b}" for a, b in zip(ids, ids[1:]) if start[b] < start[a]]
    if back: sys.exit("起点表的时间往回走了：" + "、".join(back) + "（要点按讲稿卡顺序填；实际讲的顺序变了，就先改讲稿卡和场景表）")
    end = seconds(raw["end"]) if raw.get("end") not in (None, "") else (cues[-1][1] if cues else None)
    if end is None: sys.exit("起点表要填 end（最后一句说完的时间），或者加 --srt")
    if end <= start[ids[-1]]: sys.exit(f"end（{end:.1f} 秒）要晚于最后一条要点 {ids[-1]} 的起点")
    return start, end


def main():
    (card, ep), opts = args()
    points = parse_card(card)
    idx = {p["id"]: n for n, p in enumerate(points)}
    smap_path = f"{ROOT}/src/{ep}/scenemap.json"
    if not os.path.exists(smap_path): sys.exit(f"没有 {smap_path}：先跑 scenes_from_checklist.py")
    smap = json.load(open(smap_path, encoding="utf-8"))
    bad = [k for k in smap if k not in idx]
    if bad: sys.exit("scenemap 里有讲稿卡没有的起始要点：" + "、".join(bad) + "（讲稿卡改过要点，就先改场景表再重跑 scenes_from_checklist.py）")
    keys = sorted(smap, key=idx.get)
    if keys[0] != "0.1": sys.exit("第一个场景要从 0.1 开始")
    if "--srt" in opts and "--starts" not in opts: sys.exit("--srt 要和 --starts 一起用（录前估时没有字幕）")
    cues = parse_srt(opts["--srt"]) if "--srt" in opts else []
    cpm = float(opts.get("--cpm", 200))
    start, end = from_starts(points, opts["--starts"], cues) if "--starts" in opts else estimate(points, cpm)
    total = F(end + TAIL)

    # 场景起点：第一个场景从 0 帧；章节卡之后的场景等卡显示够 2.2 秒；不往回走
    froms = []
    for n, k in enumerate(keys):
        s = 0 if n == 0 else max(F(start[k]), froms[-1])
        if n and points[idx[keys[n - 1]]]["n"] == 0: s = max(s, F(start[keys[n - 1]] + CHAPTER_DUR))
        froms.append(min(s, total))
    froms.append(total)
    scenes, frame_of, skipped = [], {}, []
    for n, k in enumerate(keys):
        a, b = idx[k], (idx[keys[n + 1]] if n + 1 < len(keys) else len(points))
        if points[a]["n"] == 0 and b - a != 1:
            sys.exit(f"章节卡 {k} 的下一个场景要从 {points[a]['chapter']}.1 开始（场景表改过就重跑 scenes_from_checklist.py）")
        f0, f1 = froms[n], froms[n + 1]
        ids = [points[j]["id"] for j in range(a, b)]
        steps = [min(max(0, F(start[i]) - f0), max(0, f1 - f0 - 1)) for i in ids]
        frame_of.update({i: f0 + s for i, s in zip(ids, steps)})
        if f1 <= f0:
            skipped.append(f"{smap[k]}（{k}）")
            continue
        sc = {"scene": smap[k], "from": f0, "dur": f1 - f0, "steps": steps}
        if points[a]["n"] == 0: sc.update(chapter=points[a]["chapter"], title=plain(points[a]["text"]))
        scenes.append(sc)

    if cues:
        subs = [{"from": F(a), "dur": max(1, F(b - a)), "text": t.rstrip("。，？！")} for a, b, t in cues]
    else:
        subs = []
        for j, p in enumerate(points):
            if p["n"] == 0: continue
            a, b = start[p["id"]], (start[points[j + 1]["id"]] if j + 1 < len(points) else end)
            subs.append({"from": F(a), "dur": max(1, F(b - a)), "text": f"{p['id']}  {plain(p['text'])[:22]}"})

    out = f"{ROOT}/src/{ep}/timeline.json"
    source = "starts" if "--starts" in opts else "estimate"
    json.dump({"fps": FPS, "total": total, "scenes": scenes, "points": frame_of, "subs": subs, "source": source},
              open(out, "w", encoding="utf-8"), ensure_ascii=False)
    talk = sum(1 for p in points if p["n"])
    head = f"{ep}: {talk} 条要点 + {len(points) - talk} 张章节卡, {len(scenes)} 个场景, {total / FPS / 60:.1f} 分钟"
    if source == "starts": print(f"{head}（按要点起点表{'，字幕来自 srt' if cues else ''}）→ {out}")
    else: print(f"{head}（估算，{cpm:.0f} 字/分）→ {out}\n  ※ 预览用：录完填 src/{ep}/starts.json，再加 --starts 重跑")
    if skipped: print("⚠ 这些场景的起始要点和下一个场景同时开始，时长为 0，已跳过：" + "、".join(skipped))
    for sc in scenes: print(f"  {ts(sc['from'])}  {sc['dur'] / FPS:5.1f}s  {sc['scene']}")


main()
