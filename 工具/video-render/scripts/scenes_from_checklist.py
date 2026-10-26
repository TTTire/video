"""从发布清单的「画面与素材清单」生成渲染工程需要的文件。
用法：python scripts/scenes_from_checklist.py <发布清单.md> <口播逐字稿.md> <期号如 ep7> [--force]

读取 `## 画面与素材清单` 下的分场景表格（列：# | 场景 id | 起始句 | 这段在讲什么 | 图 | 叠字 | 环境声），输出：
- src/<epN>/scenemap.json      {起始句: 场景 id}
- src/<epN>/scene-names.json   {场景 id: 中文名}（给剪辑说明和拼图用）
- src/<epN>/photo.json         场景骨架（已存在时不覆盖，加 --force 才重写）：每个场景的照片、叠字先按顺序挂到句子上，之后手工调
并打印需要出的图片编号。起始句的编号以 `python scripts/build_timeline.py <口播稿> epN --list` 为准（从 0 起，章节标题也占一号）。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_md_lines(path):
    items = []
    for l in open(path, encoding="utf-8").read().splitlines():
        l = l.strip()
        if not l or l.startswith("# "): continue
        m = re.match(r"## 第(\d)章：(.*)", l)
        items.append(("chapter", m.group(2)) if m else ("line", l))
    return items


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
    md, script, ep = args[:3]
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
    items = parse_md_lines(script)

    scenemap, names, scenes, photos = {}, {}, [], []
    ids = set()
    for r in rows:
        r += [""] * (7 - len(r))
        no, sid, start, what, pic, overlay, amb = r[:7]
        sid = sid.strip("`")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", sid): sys.exit(f"第 {no} 行场景 id「{sid}」要用小写英文（如 shop、tenmin）")
        try: k = int(re.sub(r"\D", "", start))
        except ValueError: sys.exit(f"第 {no} 行起始句「{start}」不是数字")
        if k >= len(items): sys.exit(f"第 {no} 行起始句 {k} 超出逐字稿范围（0–{len(items) - 1}）")
        if k in scenemap: sys.exit(f"起始句 {k} 重复（{scenemap[k]} / {sid}）")
        is_ch = items[k][0] == "chapter"
        if is_ch and sid != "chapter": sys.exit(f"第 {no} 行：第 {k} 行是章节标题「{items[k][1]}」，场景 id 应为 chapter")
        if not is_ch and sid == "chapter": sys.exit(f"第 {no} 行：第 {k} 行不是章节标题，不能用 chapter")
        scenemap[k] = sid
        if sid == "chapter": continue
        if sid in ids: sys.exit(f"场景 id「{sid}」重复，每个场景要唯一")
        ids.add(sid)
        names[sid] = re.sub(r"[，。、\s]+", "-", what).strip("-")[:18]
        codes = re.findall(r"S\d{1,2}[A-Za-z]?", pic)
        codes = [f"S{int(re.sub(r'\D', '', c)):02d}{c[-1].upper() if c[-1].isalpha() else ''}" for c in codes]
        photos += [c for c in codes if c not in photos]
        texts = re.findall(r"「([^」]+)」", overlay) or ([overlay] if overlay and overlay not in ("—", "-", "无") else [])
        sc = {"id": sid, "name": names[sid], "photo": codes[0] if codes else "S00", "move": "in",
              "items": [{"type": "h", "text": t, "at": i} for i, t in enumerate(texts)]}
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
        if len(codes) > 1: sc["swap"] = {"at": 1, "photo": codes[1]}
        if amb and amb not in ("—", "-", "无"): sc["ambience"] = amb
        scenes.append(sc)

    if 0 not in scenemap: sys.exit("第一行的起始句必须是 0（开场）")
    out = f"{ROOT}/src/{ep}"
    os.makedirs(out, exist_ok=True)
    json.dump({str(k): scenemap[k] for k in sorted(scenemap)}, open(f"{out}/scenemap.json", "w", encoding="utf-8"), ensure_ascii=False)
    # 全局风格里的 <!-- STYLE_DNA ... --> → photo.json 的 style（每期视觉方案，见 video-broll-maker SKILL）
    style = None
    m = re.search(r"<!--\s*STYLE_DNA\s+(.*?)-->", txt, re.S)
    if m:
        kv = dict(re.findall(r"(\w+)=(\S+)", m.group(1)))
        style, theme = {}, {}
        for k, v in kv.items():
            if k in ("gold", "coral", "teal", "bg", "white", "dim"): theme[k] = v
            elif k == "font": style["titleFont"] = v
            elif k in ("letterbox", "grain"): style[k] = v.lower() in ("1", "true", "yes")
            elif k == "tintOpacity": style[k] = float(v)
            elif k in ("layout", "tint", "enter", "scale"): style[k] = v
        if theme: style["theme"] = theme
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
    # 顺手列出每个场景的句子，方便核对
    keys = sorted(scenemap)
    for n, k in enumerate(keys):
        end = keys[n + 1] if n + 1 < len(keys) else len(items)
        first = items[k][1]
        print(f"  {scenemap[k]:10s} 句 {k}–{end - 1}  {first[:28]}")


main()
