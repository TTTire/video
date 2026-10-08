#!/usr/bin/env python3
"""把媒体包里的文件恢复到「视频选题」仓库的原位置。

用法（在解压出来的媒体包文件夹里运行；Windows 上把 python3 换成 python 或 py）：
    python3 restore.py <视频选题仓库路径>            # 先预演，只打印要做什么
    python3 restore.py <视频选题仓库路径> --apply    # 真正复制
    加 --force 才会覆盖内容不同的已有文件（默认跳过并报告）
"""
import hashlib, json, os, shutil, sys
from pathlib import Path

PKG = Path(__file__).resolve().parent


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    # Windows 中文系统默认 GBK，统一用 UTF-8 输出，避免中文路径打印报错
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    apply, force = "--apply" in sys.argv, "--force" in sys.argv
    if not args:
        sys.exit(__doc__)
    root = Path(args[0]).expanduser().resolve()
    if not (root / "AGENTS.md").exists():
        sys.exit(f"{root} 下没有 AGENTS.md，看起来不是「视频选题」仓库根目录，已停止。")

    m = json.loads((PKG / "manifest.json").read_text(encoding="utf-8"))
    by_path = {e["path"]: e for e in m["files"]}
    stats = {"复制": 0, "已存在且相同": 0, "冲突跳过": 0, "覆盖": 0}

    for e in m["files"]:
        src_rel = e.get("stored_at") or by_path[e["same_as"]]["stored_at"]
        src, dst = PKG / src_rel, root / e["path"]
        if dst.exists():
            if dst.stat().st_size == e["size"] and sha256(dst) == e["sha256"]:
                stats["已存在且相同"] += 1
                continue
            if not force:
                stats["冲突跳过"] += 1
                print(f"[冲突] 目标已存在但内容不同，跳过：{e['path']}")
                continue
            stats["覆盖"] += 1
            action = "覆盖"
        else:
            stats["复制"] += 1
            action = "复制"
        print(f"[{action}] {e['path']}")
        if apply:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
            os.utime(dst, (e["mtime"], e["mtime"]))
            if sha256(dst) != e["sha256"]:
                sys.exit(f"校验失败：{e['path']}")

    print("\n" + ("已执行" if apply else "预演（未改动任何文件，加 --apply 执行）") + "：",
          "，".join(f"{k} {v}" for k, v in stats.items()))


if __name__ == "__main__":
    main()
