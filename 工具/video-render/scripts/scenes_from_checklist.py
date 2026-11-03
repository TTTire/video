"""从发布清单的「画面与素材清单」生成渲染工程需要的文件。
用法：python scripts/scenes_from_checklist.py <发布清单.md> <讲稿卡.md> <期号如 ep9> [--force]

读取 `## 画面与素材清单` 下的分场景表格（列：# | 场景 id | 起始要点 | 这段在讲什么 | 图 | 叠字 | 环境声），输出：
- src/<epN>/scenemap.json      {起始要点 id: 场景 id}，按讲稿卡顺序
- src/<epN>/scene-names.json   {场景 id: 中文名}（给剪辑说明和拼图用）
- src/<epN>/photo.json         场景骨架（已存在时不覆盖，加 --force 才重写）：照片、叠字按顺序挂到场景内的要点上，之后手工调
并打印需要出的图和每个场景的要点范围。要点 id = 章.序（开头 0.1 起，第 N 章 N.1 起，章节卡 N.0），解析规则见 card.py。
"""
import json, os, re, sys

from card import parse_card, plain

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAGGER = 90   # 叠字比要点多时，多出来的挂在最后一条要点上，每条再晚 3 秒


def section(txt, title):
    i = txt.find(f"## {title}")
    if i < 0: sys.exit(f"发布清单里没有「## {title}」")
    rest = txt[i + 3:]
    j = re.search(r"\n## ", rest)
    return rest[:j.start()] if j else rest


def table_rows(sec):
    rows = []
    for l in sec.splitlines():
        if not l.strip().startswith("|"): continue
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        if not cells or cells[0] in ("#", "", "编号") or set(cells[0]) <= set("-: "): continue
        rows.append(cells)
    return rows


# 出图清单的「文字放哪侧」→ 画面区域名（见 photo-json.md「画面区域」）。
# 推荐直接写区域名 TL/TC/TR/ML/MC/MR/BL/BC/BR/TW/MW/BW；老写法（"左侧" "上 1/3" "右 40%"）也能认。
REGION_RE = re.compile(r"\b([TMB][LCRW])\b", re.I)
def region_of(txt):
    m = REGION_RE.search(txt or "")
    if m: return m.group(1).upper()
    t = (txt or "").replace(" ", "")
    if not t or t in ("—", "-"): return None
    if "中" in t and ("居" in t or "中间" in t): return "MC"
    col = "L" if "左" in t else "R" if "右" in t else "W"
    row = "T" if ("上" in t or "顶" in t) else "B" if ("下" in t or "底" in t) else "T" if col != "W" else "T"
    return row + col
REGION_GRAD = {"L": "left", "R": "right", "C": "all", "W": "top"}


def photo_regions(sec):
    """读「### 出图清单」表（编号 | 画面 | 文字放哪侧 | 用在）→ {S01: 'TL', ...}"""
    i = sec.find("### 出图清单")
    if i < 0: return {}
    out = {}
    for r in table_rows(sec[i:]):
        if len(r) < 3: continue
        m = re.match(r"S(\d{1,2})([A-Za-z]?)", r[0].strip("`* "))
        if not m: continue
        code = f"S{int(m.group(1)):02d}{m.group(2).upper()}"
        reg = region_of(r[2])
        if reg: out[code] = reg
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    md, card, ep = args[:3]
    force = "--force" in sys.argv
    txt = open(md, encoding="utf-8").read()
    sec = section(txt, "画面与素材清单")
    regions = photo_regions(sec)   # 每张图的文字区域
    # 只读「### 分场景」这一张表（后面还有出图清单表）
    i = sec.find("### 分场景")
    if i >= 0:
        sec = sec[i + 6:]
        j = re.search("\n### ", sec)
        sec = sec[:j.start()] if j else sec
    rows = table_rows(sec)
    if not rows: sys.exit("没找到分场景表格")
    points = parse_card(card)
    order = {p["id"]: n for n, p in enumerate(points)}

    # 先过一遍起始要点：讲稿卡里有、按讲稿卡顺序、章节卡那行用 chapter
    marks = []   # [(讲稿卡下标, 表格行)]
    for r in rows:
        r += [""] * (7 - len(r))
        no, sid, start = r[0], r[1].strip("`"), r[2].strip("` ")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", sid): sys.exit(f"第 {no} 行场景 id「{sid}」要用小写英文（如 shop、tenmin）")
        if start not in order: sys.exit(f"第 {no} 行起始要点「{start}」讲稿卡里没有（写 章.序：开头 0.1 起，第 N 章 N.1 起，章节卡 N.0）")
        k = order[start]
        if marks and k <= marks[-1][0]: sys.exit(f"第 {no} 行起始要点 {start} 要排在上一行的 {points[marks[-1][0]]['id']} 后面")
        is_ch = points[k]["n"] == 0
        if is_ch != (sid == "chapter"): sys.exit(f"第 {no} 行：{start} " + ("是章节卡，场景 id 应为 chapter" if is_ch else "不是章节卡，不能用 chapter"))
        marks.append((k, r))
    if points[marks[0][0]]["id"] != "0.1": sys.exit("分场景表第一行的起始要点必须是 0.1")
    used = {points[k]["id"] for k, _ in marks}
    missing = [p["id"] for p in points if p["n"] == 0 and p["id"] not in used]
    if missing: sys.exit("这些章节卡在分场景表里没有 chapter 行：" + "、".join(missing))
    for n, (k, _) in enumerate(marks):
        if points[k]["n"] == 0 and (n + 1 == len(marks) or marks[n + 1][0] != k + 1):
            sys.exit(f"章节卡 {points[k]['id']} 的下一行要从 {points[k]['chapter']}.1 开始（章节卡只占自己那 2 秒）")

    scenemap, names, scenes, photos = {}, {}, [], []
    for n, (k, r) in enumerate(marks):
        no, sid, start, what, pic, overlay, amb = r[:7]
        sid = sid.strip("`")
        scenemap[points[k]["id"]] = sid
        if sid == "chapter": continue
        if sid in names: sys.exit(f"场景 id「{sid}」重复，每个场景要唯一")
        span = (marks[n + 1][0] if n + 1 < len(marks) else len(points)) - k   # 场景内有几条要点
        names[sid] = re.sub(r"[，。、\s]+", "-", what).strip("-")[:18]
        codes = re.findall(r"S\d{1,2}[A-Za-z]?", pic)
        codes = [f"S{int(re.sub(r'\D', '', c)):02d}{c[-1].upper() if c[-1].isalpha() else ''}" for c in codes]
        photos += [c for c in codes if c not in photos]
        texts = re.findall(r"「([^」]+)」", overlay) or ([overlay] if overlay and overlay not in ("—", "-", "无") else [])
        # 第 i 条叠字挂到场景内第 i 条要点（at 是场景内第几条要点，0 起）
        items = [{"type": "h", "text": t, "at": min(i, span - 1), **({"delay": (i - span + 1) * STAGGER} if i >= span else {})} for i, t in enumerate(texts)]
        sc = {"id": sid, "name": names[sid], "photo": codes[0] if codes else "S00", "move": "in", "items": items}
        # 文字框：按出图清单里这张图的「文字放哪侧」写区域名；没写就不给，走本期 style.layout 的母版
        reg = regions.get(sc["photo"])
        if reg:
            sc["box"] = reg
            sc["grad"] = REGION_GRAD[reg[1]]
        else:
            sc["grad"] = "left"
        # 对白：叠字自带引号或冒号前有人名的，标成 quote
        for it in sc["items"]:
            if re.match(r'^[“"「].+[”"」]$', it["text"]) or re.match(r"^[^：:]{1,4}[：:]", it["text"]): it["quote"] = True
        # 第二张图：从第 2 条要点换；场景只有一条要点时，讲到 6 秒换
        if len(codes) > 1: sc["swap"] = {"at": 1, "photo": codes[1]} if span > 1 else {"at": 0, "delay": 180, "photo": codes[1]}
        if amb and amb not in ("—", "-", "无"): sc["ambience"] = amb
        scenes.append(sc)

    out = f"{ROOT}/src/{ep}"
    os.makedirs(out, exist_ok=True)
    json.dump(scenemap, open(f"{out}/scenemap.json", "w", encoding="utf-8"), ensure_ascii=False)
    # 全局风格里的 <!-- STYLE_DNA ... --> → photo.json 的 style（每期视觉方案，见 video-broll-maker SKILL）
    style = None
    m = re.search(r"<!--\s*STYLE_DNA\s+(.*?)-->", txt, re.S)
    if m:
        kv = dict(re.findall(r"(\w+)=(\S+)", m.group(1)))
        style, theme = {}, {}
        for k, v in kv.items():
            if k in ("gold", "coral", "teal", "bg", "white", "dim"): theme[k] = v
            elif k == "font": style["titleFont"] = v
            elif k in ("letterbox", "grain", "badge"): style[k] = v.lower() in ("1", "true", "yes")
            elif k == "tintOpacity": style[k] = float(v)
            elif k in ("layout", "tint", "enter", "scale", "cardSkin", "textEnter"): style[k] = v
        if theme: style["theme"] = theme
        # 2026-10 起新期默认：不打左上角标、字号走 v2 档（老期不写这两条，重渲不变样）
        style.setdefault("badge", False)
        style.setdefault("scale", "v2")
    pj = f"{out}/photo.json"
    # photo.json 里已经手工写了更好的场景名时，scene-names 以它为准
    if os.path.exists(pj) and not force:
        for sc in json.load(open(pj, encoding="utf-8")).get("scenes", []):
            if sc.get("id") in names and sc.get("name"): names[sc["id"]] = sc["name"]
    json.dump(names, open(f"{out}/scene-names.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    # 栏目：ai01 → AI经济学（不显示期号）；ep7 → 100 个经济学原理（显示期号）；发布清单里 <!-- SERIES xxx --> 可覆盖栏目名
    is_ai = ep.startswith("ai")
    badge = "" if is_ai else re.sub(r"\D", "", ep).zfill(2)
    ms = re.search(r"<!--\s*SERIES\s+(.+?)\s*-->", txt)
    series_name = ms.group(1).strip() if ms else ("AI经济学" if is_ai else "100 个经济学原理")
    if force or not os.path.exists(pj):
        spec = {"ep": ep, "badge": badge, "series": series_name, "photos": f"{ep}/photos", "chapterPhoto": photos[-1] if photos else "S01", "scenes": scenes}
        if style: spec["style"] = style
        json.dump(spec, open(pj, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"写入 {pj}（骨架，接下来手工调）")
    else:
        if style:
            spec = json.load(open(pj, encoding="utf-8"))
            if spec.get("style") != style:
                spec["style"] = style
                json.dump(spec, open(pj, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
                print(f"{pj} 已存在，只更新了 style（来自 STYLE_DNA）")
            else: print(f"{pj} 已存在，未覆盖（--force 重写）")
        else: print(f"{pj} 已存在，未覆盖（--force 重写）")
    if style: print("本期视觉方案 style:", json.dumps(style, ensure_ascii=False))
    print(f"栏目：{series_name}" + ("（角标不显示期号）" if not badge else f"　期号 {badge}"))
    if is_ai and any(sc.get("id") == "series" for sc in scenes): print("⚠ AI经济学期不放栏目卡（type: series），开场用普通 title 场景")
    print(f"scenemap: {len(scenemap)} 个场景 → {out}/scenemap.json")
    print(f"需要的图 {len(photos)} 张：{' '.join(photos)}")
    if regions: print("文字区域（来自出图清单）：" + " ".join(f"{k}={v}" for k, v in regions.items()))
    miss = [c for c in photos if c not in regions]
    if miss: print("⚠ 出图清单里没写文字区域的图：" + " ".join(miss) + "（这些场景走母版）")
    # 顺手列出每个场景从哪条要点讲到哪条，方便核对
    for n, (k, _) in enumerate(marks):
        end = marks[n + 1][0] if n + 1 < len(marks) else len(points)
        span = points[k]["id"] if end - k == 1 else f"{points[k]['id']}–{points[end - 1]['id']}"
        print(f"  {scenemap[points[k]['id']]:10s} {span:9s} {plain(points[k]['text'])[:28]}")


main()
