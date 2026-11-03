"""讲稿卡解析，scenes_from_checklist.py / make_timeline.py 共用。

要点 id = 章.序：「## 开头」下的第 n 条是 0.n，「## 第 N 章 标题」下的第 n 条是 N.n，章节卡本身是 N.0。
只认顶格的列表项（`1.` / `-` / `*`），缩进的子条目算上一条的补充；数字表 / 别说 / 录制不算要点。
"""
import re
import sys

HEAD = re.compile(r"##\s*(?:(开头)|第\s*(\d+)\s*章)[\s：:]*(.*)")
ITEM = re.compile(r"(?:\d+[.、]|[-*])\s+(.+)")


def parse_card(path):
    """→ [{"id", "chapter", "n", "text"}]，按讲稿卡顺序；章节卡 n=0、text=章标题"""
    points, ch, chapters = [], None, []
    for raw in open(path, encoding="utf-8").read().splitlines():
        if raw.startswith("## "):
            m = HEAD.match(raw)
            ch, n = None, 0
            if not m: continue
            ch = 0 if m.group(1) else int(m.group(2))
            if ch in chapters: sys.exit(f"讲稿卡里「{raw}」重复了")
            chapters.append(ch)
            if ch: points.append({"id": f"{ch}.0", "chapter": ch, "n": 0, "text": m.group(3).strip()})
            continue
        if ch is None: continue
        m = ITEM.match(raw)
        if m:
            n += 1
            points.append({"id": f"{ch}.{n}", "chapter": ch, "n": n, "text": m.group(1).strip()})
    if chapters[:1] != [0] or chapters != list(range(len(chapters))):
        sys.exit(f"讲稿卡要按「## 开头」「## 第 1 章 …」「## 第 2 章 …」的顺序写，现在读到的是 {chapters}")
    empty = [c for c in chapters if not any(p["chapter"] == c and p["n"] for p in points)]
    if empty: sys.exit("这些段落没有要点：" + "、".join("开头" if c == 0 else f"第 {c} 章" for c in empty))
    return points


def plain(text):
    """去掉 markdown 记号和 ★，给打印 / 字幕预览用"""
    return re.sub(r"\*\*|★\s*", "", text).strip()


def spoken_len(text):
    """估时用的字数：汉字 1，一串数字 2，一个英文词 1"""
    return (len(re.findall(r"[\u4e00-\u9fff]", text)) + 2 * len(re.findall(r"\d+(?:\.\d+)?", text))
            + len(re.findall(r"[A-Za-z]+", text)))
