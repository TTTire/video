"""aroll-prep 共用工具：venv 切换、CUDA DLL 注入、ffmpeg/ffprobe 封装、音频读 numpy、时间格式。"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

TOOL_ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = TOOL_ROOT / ".venv"
VENV_PY = VENV_DIR / "Scripts" / "python.exe"
PIP_INDEX = "https://pypi.tuna.tsinghua.edu.cn/simple"
HF_ENDPOINT = "https://hf-mirror.com"

VIDEO_EXT = {".mp4", ".mov", ".m4v", ".mkv"}
AUDIO_EXT = {".wav", ".mp3", ".m4a", ".flac", ".aac", ".ogg"}


# ---------------------------------------------------------------- venv / CUDA
def ensure_venv() -> None:
    """若当前解释器不是 .venv 的，就用 .venv 的 python 重新运行当前脚本并退出。"""
    if Path(sys.prefix).resolve() == VENV_DIR.resolve():
        return
    if not VENV_PY.exists():
        sys.exit(f"[aroll-prep] 未找到 {VENV_PY}，先运行: python scripts/setup.py")
    code = subprocess.call([str(VENV_PY), *sys.argv])
    sys.exit(code)


def add_cuda_dlls() -> list[str]:
    """把 pip 装的 nvidia-*-cu12 的 bin 目录注入 DLL 搜索路径（ctranslate2 需要 cublas64_12 / cudnn64_9）。"""
    added = []
    site = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
    for sub in ("cublas", "cudnn", "cuda_nvrtc", "cuda_runtime"):
        d = site / sub / "bin"
        if d.is_dir():
            os.add_dll_directory(str(d))
            os.environ["PATH"] = str(d) + os.pathsep + os.environ.get("PATH", "")
            added.append(str(d))
    return added


def set_hf_env() -> None:
    os.environ.setdefault("HF_ENDPOINT", HF_ENDPOINT)
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


# ---------------------------------------------------------------- ffmpeg
def ffmpeg_bin(name: str = "ffmpeg") -> str:
    p = shutil.which(name)
    if not p:
        sys.exit(f"[aroll-prep] PATH 里找不到 {name}")
    return p


def run(cmd: list[str], *, capture: bool = False, check: bool = True, quiet: bool = True) -> subprocess.CompletedProcess:
    """跑外部命令。ffmpeg 默认加 -hide_banner -loglevel error -y。"""
    if cmd and Path(cmd[0]).stem.lower() == "ffmpeg":
        cmd = [cmd[0], "-hide_banner", "-y", "-loglevel", "error" if quiet else "info", *cmd[1:]]
    return subprocess.run(cmd, capture_output=capture, text=capture, encoding="utf-8" if capture else None,
                          errors="replace", check=check)


def ffprobe_json(path: Path | str) -> dict:
    out = subprocess.run(
        [ffmpeg_bin("ffprobe"), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout
    return json.loads(out)


def media_duration(path: Path | str) -> float:
    info = ffprobe_json(path)
    d = info.get("format", {}).get("duration")
    if d is None:
        for s in info.get("streams", []):
            if s.get("duration"):
                d = s["duration"]
                break
    return float(d or 0.0)


def stream_kinds(path: Path | str) -> set[str]:
    try:
        info = ffprobe_json(path)
    except subprocess.CalledProcessError:
        return set()
    kinds = set()
    for s in info.get("streams", []):
        # 封面图之类的附件图片不算视频流
        if s.get("codec_type") == "video" and s.get("disposition", {}).get("attached_pic"):
            continue
        if s.get("codec_type") == "video" and s.get("codec_name") in ("mjpeg", "png"):
            continue
        kinds.add(s.get("codec_type"))
    return kinds


def video_params(path: Path | str) -> dict:
    info = ffprobe_json(path)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    return {
        "vcodec": v and v.get("codec_name"), "width": v and v.get("width"), "height": v and v.get("height"),
        "fps": v and v.get("r_frame_rate"), "pix_fmt": v and v.get("pix_fmt"),
        "acodec": a and a.get("codec_name"), "sr": a and a.get("sample_rate"), "ch": a and a.get("channels"),
    }


def read_audio(path: Path | str, sr: int = 16000, start: float | None = None, duration: float | None = None):
    """用 ffmpeg 把任意媒体的音轨解码成单声道 float32 numpy 数组（不走 av/decode_audio）。"""
    import numpy as np
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin"]
    if start is not None:
        cmd += ["-ss", f"{start:.6f}"]
    cmd += ["-i", str(path)]
    if duration is not None:
        cmd += ["-t", f"{duration:.6f}"]
    cmd += ["-vn", "-sn", "-dn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


_ENC_CACHE: str | None = None


def pick_h264_encoder() -> str:
    """有可用 NVENC 用 h264_nvenc，否则 libx264。会真的编 1 秒测试帧确认。"""
    global _ENC_CACHE
    if _ENC_CACHE:
        return _ENC_CACHE
    enc = "libx264"
    out = subprocess.run([ffmpeg_bin(), "-hide_banner", "-encoders"], capture_output=True, text=True,
                         encoding="utf-8", errors="replace").stdout
    if "h264_nvenc" in out:
        test = subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                               "color=c=black:s=256x256:r=30:d=1", "-c:v", "h264_nvenc", "-f", "null", "-"],
                              capture_output=True)
        if test.returncode == 0:
            enc = "h264_nvenc"
    _ENC_CACHE = enc
    return enc


def h264_args(enc: str) -> list[str]:
    if enc == "h264_nvenc":
        return ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "19", "-b:v", "0", "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"]


# ---------------------------------------------------------------- 时间格式
def fmt_time(sec: float, ms_digits: int = 3) -> str:
    """秒 -> mm:ss.sss（超过 1 小时写成 h:mm:ss.sss）。"""
    sec = max(0.0, float(sec))
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    body = f"{m:02d}:{s:0{3 + ms_digits}.{ms_digits}f}"
    return f"{h}:{body}" if h else body


def fmt_srt_time(sec: float) -> str:
    sec = max(0.0, float(sec))
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


_TIME_RE = re.compile(r"^\s*(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)\s*$")


def parse_time(text: str) -> float:
    """接受 `mm:ss.sss`、`h:mm:ss.sss` 或纯秒。"""
    text = text.strip().replace("：", ":")
    m = _TIME_RE.match(text)
    if not m:
        raise ValueError(f"无法解析时间: {text!r}")
    a, b, s = m.groups()
    total = float(s)
    parts = [p for p in (a, b) if p is not None]
    for i, p in enumerate(reversed(parts)):
        total += float(p) * (60 ** (i + 1))
    return total


def write_json(path: Path | str, data) -> None:
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")


def load_json(path: Path | str):
    return json.loads(Path(path).read_text(encoding="utf-8"))
