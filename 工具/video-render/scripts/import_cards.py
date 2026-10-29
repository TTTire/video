"""把卡内小图入库：C01 / C02… → 裁成方形（或指定比例）→ public/<epN>/cards/C01.jpg
用法：python scripts/import_cards.py <图片文件夹> <期号如 ai03> [--need 发布清单.md] [--ratio 1] [--size 900]

- 文件名里有 C01 / C12 这种编号即可（"C03 光伏板.png"、"c07.jpg" 都行）。
- 默认裁成 1:1 中心裁切（photo 卡上半是方图）；--ratio 1.33 裁 4:3。
- 输出 JPG 质量 90，长边 --size（默认 900，卡上显示最大 440 宽，够了）。
- --need 给发布清单时，对照「出图清单」里的 C 编号列出缺哪几张。
"""
import os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE = re.compile(r"(?<![A-Za-z0-9#])C(\d{1,2})(?![0-9A-Fa-f])", re.I)   # 排除 #C8A16B 这类颜色值


def code_of(name):
    m = CODE.search(name)
    return f"C{int(m.group(1)):02d}" if m else None


def needed_codes(md):
    txt = open(md, encoding="utf-8").read()
    i = txt.find("## 画面与素材清单")
    sec = txt[i:] if i >= 0 else txt
    j = sec.find("\n## ", 5)
    sec = sec[:j] if j > 0 else sec
    return sorted({code_of(x) for x in re.findall(r"(?<![A-Za-z0-9#])C\d{1,2}(?![0-9A-Fa-f])", sec) if code_of(x)})


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src, ep = args[0], args[1]
    need = sys.argv[sys.argv.index("--need") + 1] if "--need" in sys.argv else None
    ratio = float(sys.argv[sys.argv.index("--ratio") + 1]) if "--ratio" in sys.argv else 1.0
    size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 900
    out = f"{ROOT}/public/{ep}/cards"
    os.makedirs(out, exist_ok=True)
    seen = {}
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
        c = code_of(f)
        if not c:
            print(f"  跳过（没有 C 编号）: {f}"); continue
        if c in seen:
            print(f"  重复编号 {c}: {f}（已用 {seen[c]}）"); continue
        im = Image.open(f"{src}/{f}").convert("RGB")
        w, h = im.size
        tw, th = (round(h * ratio), h) if w / h >= ratio else (w, round(w / ratio))
        left, top = (w - tw) // 2, (h - th) // 2
        im = im.crop((left, top, left + tw, top + th))
        if max(im.size) > size:
            k = size / max(im.size)
            im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        im.save(f"{out}/{c}.jpg", quality=90)
        seen[c] = f
        print(f"  {f:40s} → {c}.jpg  {w}×{h} → {im.width}×{im.height}")
    print(f"\n入库 {len(seen)} 张 → {out}")
    if need:
        want = needed_codes(need)
        missing = [c for c in want if c not in seen and not os.path.exists(f"{out}/{c}.jpg")]
        extra = [c for c in seen if c not in want]
        print(f"清单需要 {len(want)} 张：{' '.join(want) or '（清单里没有 C 编号）'}")
        print("还缺：" + (" ".join(missing) if missing else "无 ✓"))
        if extra: print("清单里没有但入库了：" + " ".join(extra))


main()
