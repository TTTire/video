"""图还没到之前，给每个编号生成一张占位图（深色渐变 + 大编号），先渲拼图看版式。
用法：python scripts/placeholder_photos.py <期号如 ep7> [编号...]   不给编号时读 photo.json 里用到的全部编号
已存在的真图不会被覆盖。
"""
import json, os, re, sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]
codes = sys.argv[2:]
if not codes:
    spec = json.load(open(f"{ROOT}/src/{ep}/photo.json", encoding="utf-8"))
    codes = sorted({c for c in re.findall(r"S\d{2}[A-Z]?", json.dumps(spec)) if c})
out = f"{ROOT}/public/{ep}/photos"
os.makedirs(out, exist_ok=True)
for i, c in enumerate(codes):
    path = f"{out}/{c}.jpg"
    if os.path.exists(path): print(f"  已有 {c}.jpg"); continue
    im = Image.new("RGB", (1920, 1080))
    d = ImageDraw.Draw(im)
    hue = (i * 37) % 360
    for y in range(1080):
        k = y / 1080
        d.line([(0, y), (1920, y)], fill=(int(30 + 25 * k + (hue % 40)), int(26 + 18 * k), int(22 + 14 * k)))
    d.ellipse([1150, 250, 1750, 850], fill=(70 + hue % 30, 55, 45))
    d.text((1300, 480), c, fill=(230, 215, 200), font_size=160)
    d.text((40, 1020), f"占位图 {c}", fill=(160, 150, 140), font_size=36)
    im.save(path, quality=80)
    print(f"  占位 {c}.jpg")
