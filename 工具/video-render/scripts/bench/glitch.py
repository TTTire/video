"""找花屏帧：相邻帧 PSNR 连续两次骤降（n-1→n、n→n+1 都 < 阈值）判为单帧坏帧；镜头硬切只会降一次。
用法：python3 glitch.py <视频> [起始全局帧号]
"""
import os, subprocess, sys, tempfile
v = sys.argv[1]
off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
show_all = "--all" in sys.argv
st = tempfile.mktemp(suffix=".txt")
src = ["-framerate", "30", "-pattern_type", "glob", "-i", f"{v.rstrip('/')}/*.jpeg"] if os.path.isdir(v) else ["-i", v]
subprocess.run(["ffmpeg", "-v", "error", *src, *src, "-lavfi",
                f"[0:v]scale=480:-1[a];[1:v]trim=start_frame=1,setpts=PTS-STARTPTS,scale=480:-1[b];[a][b]psnr=stats_file={st}", "-f", "null", "-"], check=True)
p = []
for line in open(st):
    d = dict(x.split(":") for x in line.split())
    p.append(float(d["psnr_avg"]) if d["psnr_avg"] != "inf" else 99)
os.remove(st)
# p[i] = PSNR(frame i, frame i+1)
bad = [i + 1 for i in range(len(p) - 1) if p[i] < 20 and p[i + 1] < 20]
print(f"{os.path.relpath(v)}  frames={len(p) + 1}  glitch={len(bad)}  " + " ".join(str(b + off) for b in bad[:40]))
if show_all:
    print("BAD: " + " ".join(str(b + off) for b in bad))
