from __future__ import annotations

import math
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
OUT_MP4 = ROOT / "像素呼吸_CH01_章节转场示例.mp4"
OUT_GIF = ROOT / "像素呼吸_CH01_章节转场示例.gif"
FRAME_DIR = ROOT / "_frames"

W, H = 720, 1280
FPS = 30
DURATION = 3.0
N = int(FPS * DURATION)

FONT_MAIN = Path("C:/Windows/Fonts/simhei.ttf")
FONT_SANS = Path("C:/Windows/Fonts/msyh.ttc")
if not FONT_SANS.exists():
    FONT_SANS = FONT_MAIN

CYAN = (110, 231, 249)
WARM = (245, 241, 232)
RED = (209, 74, 58)
BG = (5, 7, 9)


def ease_out_cubic(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in_out(x: float) -> float:
    x = min(max(x, 0.0), 1.0)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def alpha_at(t: float, start: float, end: float) -> float:
    if t < start or t > end:
        return 0
    mid = start + (end - start) * 0.28
    if t <= mid:
        return ease_out_cubic((t - start) / (mid - start))
    return 1 - ease_in_out((t - mid) / (end - mid)) * 0.08


def draw_centered_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.FreeTypeFont, fill, anchor="mm"):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor)


def make_bg() -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    pix = img.load()
    for y in range(H):
        for x in range(W):
            v = int(10 + 18 * (y / H))
            dx = (x - W * 0.5) / W
            dy = (y - H * 0.42) / H
            glow = max(0, 1 - math.sqrt(dx * dx * 7 + dy * dy * 7))
            r = min(255, v + int(glow * 10))
            g = min(255, v + int(glow * 26))
            b = min(255, v + int(glow * 32))
            pix[x, y] = (r, g, b)
    return img


BG_IMG = make_bg()
font_brand = ImageFont.truetype(str(FONT_SANS), 24)
font_chapter = ImageFont.truetype(str(FONT_SANS), 28)
font_main = ImageFont.truetype(str(FONT_MAIN), 64)
font_sub = ImageFont.truetype(str(FONT_MAIN), 58)
font_mark = ImageFont.truetype(str(FONT_SANS), 18)

starts = [
    (95, 260), (610, 220), (170, 920), (565, 950), (350, 325),
    (86, 650), (650, 615), (260, 150), (465, 1110), (110, 1040),
    (620, 1040), (355, 1030),
]
targets = [
    (330, 665), (360, 665), (390, 665),
    (330, 695), (360, 695), (390, 695),
    (330, 725), (360, 725), (390, 725),
    (310, 695), (410, 695), (360, 745),
]


def render_frame(i: int, size: tuple[int, int] = (W, H)) -> Image.Image:
    t = i / FPS
    img = BG_IMG.copy().convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)

    # Subtle grid, just enough to feel like pixels.
    grid_alpha = int(20 + 12 * math.sin(min(t / DURATION, 1) * math.pi))
    for x in range(0, W, 36):
        od.line((x, 0, x, H), fill=(255, 255, 255, grid_alpha))
    for y in range(0, H, 36):
        od.line((0, y, W, y), fill=(255, 255, 255, grid_alpha))

    # Brand text.
    brand_a = int(140 * alpha_at(t, 0.08, 2.86))
    if brand_a:
        od.text((58, 96), "像素呼吸", font=font_brand, fill=(*WARM, brand_a))

    # Particles gather then fade.
    gather = ease_out_cubic((t - 0.12) / 1.02)
    particle_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(particle_layer)
    for idx, (s, e) in enumerate(zip(starts, targets)):
        x = s[0] + (e[0] - s[0]) * gather
        y = s[1] + (e[1] - s[1]) * gather
        pulse = 0.65 + 0.35 * math.sin((t * 6.0 + idx) * math.pi)
        if t < 0.12:
            a = 0
        elif t < 1.26:
            a = int(230 * min(1, (t - 0.12) / 0.32) * pulse)
        else:
            a = int(90 * max(0, 1 - (t - 1.26) / 1.35) * pulse)
        size_px = 10 if idx < 9 else 7
        pd.rectangle((x - size_px, y - size_px, x + size_px, y + size_px), fill=(*CYAN, max(0, min(255, a))))
    particle_layer = particle_layer.filter(ImageFilter.GaussianBlur(0.3))
    overlay.alpha_composite(particle_layer)

    # Text breath.
    text_a = int(255 * alpha_at(t, 1.02, 2.82))
    if text_a:
        breath = 1.0 + 0.018 * math.sin(ease_in_out((t - 1.02) / 1.8) * math.pi)
        text_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        td = ImageDraw.Draw(text_layer)
        td.text((W // 2, 474), "CHAPTER 01", font=font_chapter, fill=(*CYAN, int(text_a * 0.9)), anchor="mm")
        td.text((W // 2, 592), "讲不出来的那一秒", font=font_main, fill=(*WARM, text_a), anchor="mm")
        td.text((W // 2, 690), "最诚实", font=font_sub, fill=(*WARM, int(text_a * 0.86)), anchor="mm")
        shadow = text_layer.filter(ImageFilter.GaussianBlur(16))
        overlay.alpha_composite(shadow)
        if breath != 1:
            tw = int(W * breath)
            th = int(H * breath)
            scaled = text_layer.resize((tw, th), Image.Resampling.BICUBIC)
            overlay.alpha_composite(scaled, ((W - tw) // 2, (H - th) // 2))
        else:
            overlay.alpha_composite(text_layer)

    # Red warning line.
    line_a = int(120 * alpha_at(t, 1.32, 2.88))
    if line_a:
        od.line((58, 1104, 270, 1104), fill=(*RED, line_a), width=3)

    # Original mark and pixel stamp.
    mark_a = int(125 * alpha_at(t, 0.92, 2.96))
    if mark_a:
        sx, sy, gap = 610, 1122, 9
        for yy in range(3):
            for xx in range(3):
                a = mark_a
                if xx == 1 and yy == 1:
                    a = min(210, int(mark_a * (1.3 + 0.25 * math.sin(t * math.pi * 4))))
                od.rectangle((sx + xx * gap, sy + yy * gap, sx + xx * gap + 5, sy + yy * gap + 5), fill=(*CYAN, a))
        od.text((456, 1170), "PIXEL BREATH ORIGINAL", font=font_mark, fill=(*WARM, int(mark_a * 0.82)))

    img.alpha_composite(overlay)
    if size != (W, H):
        img = img.resize(size, Image.Resampling.LANCZOS)
    return img.convert("RGB")


def main() -> None:
    if FRAME_DIR.exists():
        shutil.rmtree(FRAME_DIR)
    FRAME_DIR.mkdir(parents=True)

    frames = []
    gif_frames = []
    for i in range(N):
        frame = render_frame(i)
        frame.save(FRAME_DIR / f"frame_{i:04d}.png")
        if i % 2 == 0:
            gif_frames.append(render_frame(i, (360, 640)).convert("P", palette=Image.Palette.ADAPTIVE))

    gif_frames[0].save(
        OUT_GIF,
        save_all=True,
        append_images=gif_frames[1:],
        duration=int(1000 / (FPS / 2)),
        loop=0,
        optimize=True,
    )

    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        cmd = [
            ffmpeg,
            "-y",
            "-framerate",
            str(FPS),
            "-i",
            str(FRAME_DIR / "frame_%04d.png"),
            "-vf",
            "format=yuv420p",
            "-c:v",
            "libx264",
            "-movflags",
            "+faststart",
            str(OUT_MP4),
        ]
        subprocess.run(cmd, check=True)
    shutil.rmtree(FRAME_DIR)
    print(f"wrote {OUT_GIF}")
    print(f"wrote {OUT_MP4}")


if __name__ == "__main__":
    main()
