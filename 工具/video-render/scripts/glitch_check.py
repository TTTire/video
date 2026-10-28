"""查花屏帧（Remotion 偶发的整帧缩小平铺、叠字丢失的坏帧）。

判定：第 n..n+k 帧（k ≤ 3）和前一帧、后一帧都差得很远（PSNR < 20 dB），而前一帧和后一帧彼此明显更像
（PSNR 比跳进、跳出两次都高 6 dB 以上）。
正常硬切只会跳一次，不会跳进去又跳回来，所以不会误判。缩到 240×135 灰度比较，整期 1 万多帧约 1 分钟。

命令行：python3 scripts/glitch_check.py <视频.mp4 或 图片序列文件夹> [起始帧号]
"""
import glob, os, subprocess, sys
import numpy as np

W, H = 240, 135
LOW, GAP = 20.0, 6.0


def _load_images(paths):
    from PIL import Image
    out = np.empty((len(paths), H, W), np.float32)
    for i, p in enumerate(paths):
        im = Image.open(p)
        im.draft("L", (W * 2, H * 2))       # jpeg 直接按 1/4、1/8 解码，快很多
        out[i] = np.asarray(im.convert("L").resize((W, H)), np.float32)
    return out


def _load_video(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)


def _psnr(a, b):
    mse = float(np.mean((a - b) ** 2))
    return 99.0 if mse == 0 else 10 * np.log10(255 ** 2 / mse)


def detect(x, nums):
    """x: (N,H,W)；nums: 每帧的帧号（可以不连续，不连续处不比较）。返回坏帧帧号列表。"""
    n = len(nums)
    adj = [(_psnr(x[i], x[i + 1]) if nums[i + 1] == nums[i] + 1 else 99.0) for i in range(n - 1)]
    bad = []
    i = 1
    while i < n - 1:
        if adj[i - 1] < LOW:                          # 从 i-1 跳到 i
            for k in range(4):
                j = i + k                              # 坏帧段 i..j
                if j + 1 >= n or nums[j + 1] != nums[j] + 1:
                    break
                if adj[j] < LOW and _psnr(x[i - 1], x[j + 1]) > max(adj[i - 1], adj[j]) + GAP:
                    bad += nums[i:j + 1]
                    i = j + 1                      # j+1 是跳回来的正常帧，从它的下一帧接着找
                    break
        i += 1
    return bad


def find_glitches(paths, nums):
    return detect(_load_images(paths), nums)


def candidates(x, nums, thr=28.0):
    """宽松的可疑帧：夹在两次"跳变"（相邻 PSNR < thr）之间、长度 ≤ 3 的帧段。
    会把一些正常的快动作也算进来，所以只用来挑"要重渲比对"的帧，不直接判坏。"""
    n = len(nums)
    low = [i for i in range(n - 1) if nums[i + 1] == nums[i] + 1 and _psnr(x[i], x[i + 1]) < thr]
    out = set()
    for a, b in zip(low, low[1:]):
        if b - a <= 3:
            out.update(nums[a + 1:b + 1])
    return sorted(out)


def same(paths_a, paths_b, thr=35.0):
    """两组图逐张比，返回每张是否一致（同一帧渲两次，正常帧几乎一模一样）。"""
    xa, xb = _load_images(paths_a), _load_images(paths_b)
    return [_psnr(a, b) > thr for a, b in zip(xa, xb)]


if __name__ == "__main__":
    src = sys.argv[1]
    off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    if os.path.isdir(src):
        paths = sorted(glob.glob(f"{src.rstrip('/')}/*.jpeg"))
        x = _load_images(paths)
    else:
        x = _load_video(src)
    nums = list(range(off, off + len(x)))
    bad = detect(x, nums)
    print(f"{src}  帧数 {len(x)}  坏帧 {len(bad)}" + ("  " + " ".join(map(str, bad)) if bad else ""))
