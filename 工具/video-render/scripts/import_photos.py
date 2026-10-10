"""把你出好的图入库：校验编号齐不齐 → 统一裁成 16:9 → 统一命名 → 写到 public/<epN>/photos/
用法：python scripts/import_photos.py <图片文件夹> <期号如 ep7> [--need 发布清单.md] [--min 1920]

- 文件名里有 S01 / S20A 这种编号即可（大小写、前后缀都无所谓），比如 "S03 封口机特写.png"、"s20b.jpg"。
- --need 给发布清单时，会对照「画面与素材清单」里出现的编号，列出还缺哪几张。
- 非 16:9 的图按中心裁切；宽度不足 --min（默认 1920）的会警告。
- 输出统一为 JPG（质量 92），长边不超过 2560。
"""
import os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE = re.compile(r"(?<![A-Za-z0-9])S(\d{1,2})([A-Za-z])?(?![0-9])", re.I)


def code_of(name):
    m = CODE.search(name)
    return f"S{int(m.group(1)):02d}{(m.group(2) or '').upper()}" if m else None


def needed_codes(md):
    txt = open(md, encoding="utf-8").read()
    i = txt.find("## 画面与素材清单")
    sec = txt[i:] if i >= 0 else txt
    j = sec.find("\n## ", 5)
    sec = sec[:j] if j > 0 else sec
    return sorted({code_of(x) for x in re.findall(r"S\d{1,2}[A-Za-z]?", sec) if code_of(x)})


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    src, ep = args[0], args[1]
    need = sys.argv[sys.argv.index("--need") + 1] if "--need" in sys.argv else None
    mn = int(sys.argv[sys.argv.index("--min") + 1]) if "--min" in sys.argv else 1920
    out = f"{ROOT}/public/{ep}/photos"
    os.makedirs(out, exist_ok=True)
    seen = {}
    for f in sorted(os.listdir(src)):
        if not f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")): continue
        c = code_of(f)
        if not c:
            print(f"  跳过（没有编号）: {f}"); continue
        if c in seen:
            print(f"  重复编号 {c}: {f}（已用 {seen[c]}）"); continue
        im = Image.open(f"{src}/{f}").convert("RGB")
        w, h = im.size
        warn = " ⚠ 分辨率偏低" if w < mn else ""
        tw, th = (w, round(w * 9 / 16)) if w / h >= 16 / 9 else (round(h * 16 / 9), h)
        if w / h > 16 / 9 + 0.01: tw, th = round(h * 16 / 9), h
        if abs(w / h - 16 / 9) > 0.01:
            left, top = (w - tw) // 2, (h - th) // 2
            im = im.crop((left, top, left + tw, top + th))
        if im.width > 2560: im = im.resize((2560, 1440), Image.LANCZOS)
        im.save(f"{out}/{c}.jpg", quality=92)
        seen[c] = f
        print(f"  {f:40s} → {c}.jpg  {w}×{h} → {im.width}×{im.height}{warn}")
    print(f"\n入库 {len(seen)} 张 → {out}")
    if need:
        want = needed_codes(need)
        missing = [c for c in want if c not in seen and not os.path.exists(f"{out}/{c}.jpg")]
        extra = [c for c in seen if c not in want]
        print(f"清单需要 {len(want)} 张：{' '.join(want)}")
        print("还缺：" + (" ".join(missing) if missing else "无 ✓"))
        if extra: print("清单里没有但入库了：" + " ".join(extra))


main()
