"""文档页截图入库：D 编号原比例入库 → public/<epN>/docs/，打印每张的像素尺寸（填 photo.json 场景 doc.pages 的 w / h）。
用法：python scripts/import_docs.py <图片文件夹> <期号如 ep10> [--need 发布清单.md]

- 文件名里有 D01 这种编号即可（"D01 PNAS 第1页.png"、"d02.png" 都行）。
- 不裁、不缩：文档页要放大聚焦，宽度不到 2560 会警告（放大后字会糊，回去按 2 倍像素比 / ≥ 2560 宽重截）。
- 统一存成 PNG（文字边缘不出 JPEG 噪点）。
- --need 给发布清单时，对照「画面与素材清单」里出现的 D 编号，列出还缺哪几张。
import_photos.py 只认 S 编号、会裁成 16:9，不能拿来入文档页。
"""
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE = re.compile(r"(?<![A-Za-z0-9])D(\d{1,2})(?![0-9])", re.I)
MIN_W = 2560


def code_of(name):
    m = CODE.search(name)
    return f"D{int(m.group(1)):02d}" if m else None


def needed_codes(md):
    txt = open(md, encoding="utf-8").read()
    i = txt.find("## 画面与素材清单")
    sec = txt[i:] if i >= 0 else txt
    j = sec.find("\n## ", 5)
    sec = sec[:j] if j > 0 else sec
    return sorted({code_of(x) for x in re.findall(r"(?<![A-Za-z0-9])D\d{1,2}(?![0-9])", sec) if code_of(x)})


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src, ep = args[0], args[1]
    need = sys.argv[sys.argv.index("--need") + 1] if "--need" in sys.argv else None
    out = f"{ROOT}/public/{ep}/docs"
    os.makedirs(out, exist_ok=True)
    seen = {}
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
        c = code_of(f)
        if not c: continue
        if c in seen:
            print(f"  重复编号 {c}: {f}（已用 {seen[c]}）"); continue
        im = Image.open(f"{src}/{f}").convert("RGB")
        im.save(f"{out}/{c}.png")
        seen[c] = f
        warn = f" ⚠ 宽不到 {MIN_W}，放大后字会糊" if im.width < MIN_W else ""
        print(f"  {f:40s} → {c}.png  {im.width}×{im.height}（photo.json: \"src\": \"{ep}/docs/{c}.png\", \"w\": {im.width}, \"h\": {im.height}）{warn}")
    print(f"\n入库 {len(seen)} 张 → {out}")
    if need:
        want = needed_codes(need)
        missing = [c for c in want if c not in seen and not os.path.exists(f"{out}/{c}.png")]
        print(f"清单需要 {len(want)} 张：{' '.join(want) or '（无）'}")
        print("还缺：" + (" ".join(missing) if missing else "无 ✓"))


main()
