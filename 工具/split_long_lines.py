#!/usr/bin/env python3
"""把口播稿里超过字幕宽度的句子，在标点停顿处断成几行；并把发布清单分场景表的「起始句」行号同步过去。

用法：
  python3 工具/split_long_lines.py <口播稿.md>                      只预览：列出要断的句子和断法
  python3 工具/split_long_lines.py <口播稿.md> --write              写回口播稿
  python3 工具/split_long_lines.py <口播稿.md> --write --remap <发布清单.md>   同时重算场景表起始句
  python3 工具/split_long_lines.py --realign <旧口播稿.md> <新口播稿.md> <发布清单.md>
      手工断行 / 改词之后用：按文字对齐旧稿和新稿，把场景表起始句从旧行号换成新行号

规则和 validate_package.rb 一致：去掉标点后，汉字算 1，数字 / 字母 / 空格算 0.5，默认每行 ≤ 16（环境变量 MAX_SUBTITLE_WIDTH 可调）。
脚本只在 ，。：；？！ 处断；断完仍超长的会列出来，需要手工改写。断完一定要自己读一遍，再跑 validate_package.rb --write-jianying。
"""
import os
import re
import sys
import unicodedata

LIM = float(os.environ.get("MAX_SUBTITLE_WIDTH", 16))


def norm(s):
    s = re.sub(r"(\d+)\.(\d+)", r"\1点\2", s)
    s = re.sub(r"(\d+(?:点\d+)?)%", r"百分之\1", s)
    s = re.sub(r"[^\w\s]", "", s)
    return re.sub(r"[ \t]+", " ", s).strip()


def width(s):
    return sum(1 if unicodedata.east_asian_width(c) in "WF" else 0.5 for c in norm(s))


def split_line(s):
    segs = re.findall(r"[^，。：；？！]+[，。：；？！]*", s)
    pieces, cur = [], ""
    for g in segs:
        if cur and width(cur + g) > LIM:
            pieces.append(cur)
            cur = g
        else:
            cur += g
    if cur:
        pieces.append(cur)
    return pieces


def content_lines(path):
    """和 build_timeline.py --list 同口径：去掉空行和 # 标题，## 章节标题算一行"""
    return [l.strip() for l in open(path, encoding="utf-8") if l.strip() and not l.strip().startswith("# ")]


def realign(old_path, new_path, checklist):
    key = lambda t: re.sub(r"[^\w]", "", t)
    old, new = content_lines(old_path), content_lines(new_path)
    mapping, j = {}, 0
    for i, t in enumerate(old):
        o = key(t)
        while j < len(new):
            x = key(new[j])
            k = min(4, len(x), len(o))
            if o[:k] == x[:k]:
                break
            j += 1
        if j == len(new):
            sys.exit(f"对不上：旧稿第 {i} 行「{t}」在新稿里找不到开头，检查是不是改了句首")
        mapping[i] = j
        j += 1
    s = open(checklist, encoding="utf-8").read()
    a = s.index("### 分场景")
    b = s.index("### 出图清单", a)
    rows = []
    for row in s[a:b].split("\n"):
        c = row.split(" | ")
        if row.startswith("| ") and len(c) > 3 and c[2].strip().isdigit():
            print(f"  {c[1]:<12} {c[2]:>4} → {mapping[int(c[2])]}")
            c[2] = str(mapping[int(c[2])])
            row = " | ".join(c)
        rows.append(row)
    open(checklist, "w", encoding="utf-8").write(s[:a] + "\n".join(rows) + s[b:])
    print(f"已重算场景表起始句 {checklist}")


def main():
    args = sys.argv[1:]
    if args and args[0] == "--realign":
        realign(*args[1:4])
        return
    if not args:
        print(__doc__)
        sys.exit(2)
    script = args[0]
    write = "--write" in args
    remap = args[args.index("--remap") + 1] if "--remap" in args else None

    out, mapping, still = [], {}, []
    oi = ni = 0  # 行号口径同 build_timeline.py --list：标题不算，章节标题算
    for raw in open(script, encoding="utf-8").read().split("\n"):
        s = raw.strip()
        if not s:
            out.append(raw)
            continue
        if s.startswith("# "):
            out.append(raw)
            continue
        mapping[oi] = ni
        oi += 1
        if s.startswith("## ") or width(s) <= LIM:
            out.append(s)
            ni += 1
            continue
        pieces = split_line(s)
        print(f"[{oi - 1}] {s}")
        for p in pieces:
            flag = "  ⚠️ 仍超长，需手工改" if width(p) > LIM else ""
            print(f"      → {p}{flag}")
            if flag:
                still.append(p)
        out.append("\n\n".join(pieces))
        ni += len(pieces)

    print(f"\n原 {oi} 行 → 新 {ni} 行；仍超长 {len(still)} 行")
    if not write:
        return
    text = "\n".join(out)
    open(script, "w", encoding="utf-8").write(text if text.endswith("\n") else text + "\n")
    print(f"已写回 {script}")
    if remap:
        s = open(remap, encoding="utf-8").read()
        a = s.index("### 分场景")
        b = s.index("### 出图清单", a)
        rows = []
        for row in s[a:b].split("\n"):
            c = row.split(" | ")
            if row.startswith("| ") and len(c) > 3 and c[2].strip().isdigit():
                c[2] = str(mapping[int(c[2])])
                row = " | ".join(c)
            rows.append(row)
        open(remap, "w", encoding="utf-8").write(s[:a] + "\n".join(rows) + s[b:])
        print(f"已重算场景表起始句 {remap}")


if __name__ == "__main__":
    main()
