"""建 .venv 并装依赖（清华镜像），最后校验 import 与 CUDA。幂等，可重复跑。

用法: python scripts/setup.py [--cpu-only] [--force]
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import PIP_INDEX, VENV_DIR, VENV_PY, TOOL_ROOT  # noqa: E402

GPU_PKGS = ["nvidia-cublas-cu12", "nvidia-cudnn-cu12"]
BASE_PKGS = ["numpy", "faster-whisper==1.2.1", "ctranslate2==4.8.4"]

CHECK = r"""
import os, sys
from pathlib import Path
site = Path(sys.prefix) / 'Lib' / 'site-packages' / 'nvidia'
for sub in ('cublas', 'cudnn', 'cuda_nvrtc'):
    d = site / sub / 'bin'
    if d.is_dir():
        os.add_dll_directory(str(d)); os.environ['PATH'] = str(d) + os.pathsep + os.environ['PATH']
import numpy, faster_whisper, ctranslate2
print('numpy', numpy.__version__, '| faster-whisper', faster_whisper.__version__, '| ctranslate2', ctranslate2.__version__)
n = ctranslate2.get_cuda_device_count()
print('CUDA 设备数:', n, '->', 'cuda/float16' if n else 'cpu/int8 (回退)')
"""


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--cpu-only", action="store_true", help="不装 nvidia-*-cu12（无 NVIDIA 显卡时）")
    ap.add_argument("--force", action="store_true", help="即使已装也重新 pip install")
    args = ap.parse_args()

    if not VENV_PY.exists():
        print(f"[setup] 创建 venv: {VENV_DIR}")
        subprocess.run([sys.executable, "-m", "venv", str(VENV_DIR)], check=True)
    else:
        print(f"[setup] venv 已存在: {VENV_DIR}")

    pkgs = BASE_PKGS + ([] if args.cpu_only else GPU_PKGS)
    need_install = args.force or subprocess.run(
        [str(VENV_PY), "-c", "import numpy, faster_whisper, ctranslate2" + ("" if args.cpu_only else ", nvidia.cublas, nvidia.cudnn")],
        capture_output=True).returncode != 0
    if need_install:
        print(f"[setup] pip install {' '.join(pkgs)}  (index: {PIP_INDEX})")
        subprocess.run([str(VENV_PY), "-m", "pip", "install", "-q", "--upgrade", "pip", "-i", PIP_INDEX], check=True)
        subprocess.run([str(VENV_PY), "-m", "pip", "install", "-i", PIP_INDEX, *pkgs], check=True)
    else:
        print("[setup] 依赖已齐，跳过安装（--force 可强制）")

    print("[setup] 校验 import / CUDA:")
    r = subprocess.run([str(VENV_PY), "-c", CHECK])
    if r.returncode != 0:
        sys.exit("[setup] 校验失败")
    print(f"[setup] 完成。其余脚本直接 `python scripts/xxx.py` 即可，会自动切到 {VENV_PY.relative_to(TOOL_ROOT)}")


if __name__ == "__main__":
    main()
