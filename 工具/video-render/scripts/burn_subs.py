"""把中英两份字幕烧进成片，出 3840×2160 版。排版照用户剪映里固定的那套（2026-11-26 按 11/100 成片截图逐像素校准）：

  画布 3840×2160，字体 得意黑（assets/fonts/SmileySans-Oblique.ttf），两行都居中
  中文：剪映字号 6、白色；剪映位置 Y 1500（剪映坐标以画面中心为原点、1 单位 = 0.5 px → 行中心 y = 1080 + 1500 / 2 = 1830）
  英文：剪映字号 5、缩放 70%、黄色 #FDC31D（截图里量的）；剪映位置 Y 1700 → 行中心 y 1930
  阴影：剪映「文字阴影」量成两层黑影——硬影右下 (6, 8) px、模糊 8、不透明；软影不偏移、模糊 18、60%。英文那行的阴影跟着缩放乘 0.7
  校准结果：中文墨迹宽 1938 px、英文 1479 px，位置、阴影和截图对得上（截图 1 像素 ≈ 4K 画面 2.8 像素）

用法（在 工具/video-render 下）：
  python scripts/burn_subs.py <成片.mp4> <中文.srt> <英文.srt> <输出.mp4>            整片
  python scripts/burn_subs.py <成片.mp4> <中文.srt> <英文.srt> <输出.mp4> --cue 15  只烧第 15 条，出这一条前后各 0.5 秒的小样
两份 srt 要条数一样、时间轴一致（本工作区的中英字幕就是这样出的）。
画面：1080p 成片先按它自己标的色彩矩阵解成 RGB、放大到 4K，在 RGB 上烧字（颜色就是上面写的值），最后按 BT.709 / 有限范围编码。
"""
import argparse, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_DIR = f"{ROOT}/assets/fonts"
W, H = 3840, 2160
ZH = {"size": 153.6, "color": "#FFFFFF", "y": 1830}          # 字号 6：libass 字号按行高算，得意黑行高 1.2 em → em 128 px
EN = {"size": 153.6 * 5 / 6 * 0.7, "color": "#FDC31D", "y": 1930}
SHADOW = [(6, 8, 8, 1.0), (0, 0, 18, 0.6)]                    # (右移, 下移, 模糊, 不透明度)，4K 像素
EN_SHADOW_SCALE = 0.7


def parse_srt(path):
    cues = []
    for block in re.split(r"\r?\n\s*\r?\n", open(path, encoding="utf-8-sig").read().strip()):
        rows = [r for r in block.splitlines() if r.strip()]
        i = next((k for k, r in enumerate(rows) if "-->" in r), None)
        if i is None:
            continue
        t = [sum(float(x) * m for x, m in zip(s.strip().replace(",", ".").split(":"), (3600, 60, 1))) for s in rows[i].split("-->")]
        text = " ".join(r.strip() for r in rows[i + 1:])
        if re.search(r"[{}\\]", text):
            sys.exit(f"{path} 第 {len(cues) + 1} 条有 {{ }} 或 \\，ASS 会当成控制符：{text}")
        cues.append((t[0], t[1], text))
    return cues


def ass_time(t):
    cs = max(0, int(round(t * 100)))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def ass_color(hexrgb, alpha=0):
    r, g, b = hexrgb[1:3], hexrgb[3:5], hexrgb[5:7]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def build_ass(pairs, shift):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: None

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ZH,Smiley Sans Oblique,{ZH['size']:.1f},{ass_color(ZH['color'])},&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1
Style: EN,Smiley Sans Oblique,{EN['size']:.1f},{ass_color(EN['color'])},&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []
    for t0, t1, zh, en in pairs:
        a, b = ass_time(t0 - shift), ass_time(t1 - shift)
        for st, spec, text, k in (("ZH", ZH, zh, 1.0), ("EN", EN, en, EN_SHADOW_SCALE)):
            for dx, dy, blur, op in SHADOW:
                ev.append(f"Dialogue: 0,{a},{b},{st},,0,0,0,,{{\\an5\\pos({W / 2 + dx * k:.1f},{spec['y'] + dy * k:.1f})"
                          f"\\1c&H000000&\\1a&H{round((1 - op) * 255):02X}&\\blur{blur * k:.1f}}}{text}")
            ev.append(f"Dialogue: 1,{a},{b},{st},,0,0,0,,{{\\an5\\pos({W / 2:.0f},{spec['y']})}}{text}")
    return head + "\n".join(ev) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video"); ap.add_argument("zh"); ap.add_argument("en"); ap.add_argument("out")
    ap.add_argument("--cue", type=int, help="只烧这一条（从 1 数），出小样")
    ap.add_argument("--pad", type=float, default=0.5, help="小样前后各留几秒（默认 0.5）")
    a = ap.parse_args()

    zh, en = parse_srt(a.zh), parse_srt(a.en)
    if len(zh) != len(en):
        sys.exit(f"中文 {len(zh)} 条、英文 {len(en)} 条，条数不一样，先对齐")
    bad = [i + 1 for i, (x, y) in enumerate(zip(zh, en)) if abs(x[0] - y[0]) > 0.002 or abs(x[1] - y[1]) > 0.002]
    if bad:
        sys.exit(f"中英字幕时间轴对不上：第 {bad[:10]} 条")
    pairs = [(x[0], x[1], x[2], y[2]) for x, y in zip(zh, en)]

    seek = []
    shift = 0.0
    if a.cue:
        if not 1 <= a.cue <= len(pairs):
            sys.exit(f"--cue 要在 1–{len(pairs)} 之间")
        t0, t1 = pairs[a.cue - 1][:2]
        shift = max(0.0, t0 - a.pad)
        pairs = [pairs[a.cue - 1]]
        seek = ["-ss", f"{shift:.3f}", "-t", f"{t1 + a.pad - shift:.3f}"]

    out = os.path.abspath(a.out)
    work = os.path.dirname(out)
    ass_name = os.path.splitext(os.path.basename(out))[0] + ".ass"
    open(os.path.join(work, ass_name), "w", encoding="utf-8-sig", newline="\n").write(build_ass(pairs, shift))
    fonts = os.path.relpath(FONT_DIR, work).replace("\\", "/")
    vf = ",".join([
        "scale=flags=lanczos+accurate_rnd+full_chroma_int,format=rgb24",   # 按成片自己的色彩标记解成 RGB
        f"scale={W}:{H}:flags=lanczos",
        f"subtitles=f={ass_name}:fontsdir={fonts}",
        "scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p",
        "setparams=colorspace=bt709:color_primaries=bt709:color_trc=bt709:range=tv",
    ])
    cmd = ["ffmpeg", "-v", "error", "-stats", "-y", *seek, "-i", os.path.abspath(a.video), "-vf", vf,
           "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
           *(["-c:a", "aac", "-b:a", "192k"] if a.cue else ["-c:a", "copy"]), "-movflags", "+faststart", out]
    try:
        subprocess.run(cmd, cwd=work, check=True)
    finally:
        os.remove(os.path.join(work, ass_name))
    print(f"→ {out}（{len(pairs)} 条字幕）")


if __name__ == "__main__":
    main()
