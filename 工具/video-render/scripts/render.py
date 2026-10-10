"""渲染快捷命令（在 工具/video-render 下运行）。
用法：
  python scripts/render.py <epN> sheet              关键帧拼图（一张 jpg，10 秒出图）→ out/<epN>-sheet.jpg
  python scripts/render.py <epN> check [秒数]       带字幕的核对版，默认只渲前 40 秒 → out/<epN>-check.mp4
  python scripts/render.py <epN> full               正式版（只有音效，剪辑用）→ out/<epN>-photo.mp4
  python scripts/render.py <epN> fullcheck          全片带字幕核对版 → out/<epN>-check-full.mp4
  python scripts/render.py <epN> still <帧号>        单帧 → out/_check/<epN>-<帧号>.jpg
合成 id 由期号推出：ep7 → Ep7Photo / Ep7PhotoCheck / Ep7Sheet（第 6 期 JSON 版是 Ep6J*，传 ep6j）。
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep, mode = sys.argv[1], sys.argv[2]
arg = sys.argv[3] if len(sys.argv) > 3 else None
comp = "Ep" + ep[2:].upper() if ep.lower().startswith("ep") else ep
os.makedirs(f"{ROOT}/out/_check", exist_ok=True)
base = ["npx", "remotion"]
if mode == "sheet":
    cmd = base + ["still", "src/index.ts", f"{comp}Sheet", f"out/{ep}-sheet.jpg", "--frame=0", "--jpeg-quality=85"]
elif mode == "still":
    cmd = base + ["still", "src/index.ts", f"{comp}PhotoCheck", f"out/_check/{ep}-{arg}.jpg", f"--frame={arg}", "--jpeg-quality=85"]
elif mode == "check":
    sec = int(arg or 40)
    cmd = base + ["render", "src/index.ts", f"{comp}PhotoCheck", f"out/{ep}-check.mp4", "--codec=h264", "--crf=22", f"--frames=0-{sec * 30 - 1}"]
elif mode == "full":
    cmd = base + ["render", "src/index.ts", f"{comp}Photo", f"out/{ep}-photo.mp4", "--codec=h264", "--crf=18"]
elif mode == "fullcheck":
    cmd = base + ["render", "src/index.ts", f"{comp}PhotoCheck", f"out/{ep}-check-full.mp4", "--codec=h264", "--crf=22"]
else:
    sys.exit(__doc__)
print(" ".join(cmd))
sys.exit(subprocess.call(cmd, cwd=ROOT, shell=(os.name == "nt")))
