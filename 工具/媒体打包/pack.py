#!/usr/bin/env python3
"""把「视频选题」仓库里所有音视频打成一个 zip，附带清单和恢复脚本。

用法：python3 工具/媒体打包/pack.py [输出目录]
默认输出到仓库的上一级目录（不进 git）。
"""
import hashlib, json, os, sys, zipfile, datetime, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent  # 视频选题/
MEDIA_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}
SKIP_DIRS = {".git", "node_modules", "__MACOSX"}
STORE_EXT = {".mp4", ".mov", ".m4v", ".webm", ".mp3", ".m4a", ".aac", ".ogg", ".flac"}  # 已压缩格式，不再压


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def collect():
    out = []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS]
        for fn in fns:
            p = Path(dp) / fn
            if p.suffix.lower() in MEDIA_EXT and not fn.startswith("._"):
                out.append(p)
    return sorted(out)


def main():
    stamp = datetime.date.today().strftime("%Y%m%d")
    name = f"视频选题-媒体包-{stamp}"
    out_dir = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else ROOT.parent
    zip_path = out_dir / f"{name}.zip"

    files = collect()
    entries, first_by_hash = [], {}
    for p in files:
        rel = p.relative_to(ROOT).as_posix()
        h = sha256(p)
        e = {"path": rel, "size": p.stat().st_size, "sha256": h,
             "mtime": int(p.stat().st_mtime)}
        if h in first_by_hash:
            e["same_as"] = first_by_hash[h]  # 内容重复，只存一份
        else:
            first_by_hash[h] = rel
            e["stored_at"] = f"files/{rel}"
        entries.append(e)

    manifest = {
        "package": name,
        "created": datetime.datetime.now().isoformat(timespec="seconds"),
        "source_root": str(ROOT),
        "note": "path 均相对于「视频选题」仓库根目录（含 AGENTS.md 的那一层）",
        "file_count": len(entries),
        "total_bytes": sum(e["size"] for e in entries),
        "files": entries,
    }

    tmp = zip_path.with_suffix(".zip.part")
    with zipfile.ZipFile(tmp, "w", allowZip64=True) as z:
        for e in entries:
            if "stored_at" not in e:
                continue
            src = ROOT / e["path"]
            ct = zipfile.ZIP_STORED if src.suffix.lower() in STORE_EXT else zipfile.ZIP_DEFLATED
            z.write(src, f"{name}/{e['stored_at']}", compress_type=ct)
        z.writestr(f"{name}/manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
        z.write(HERE / "restore.py", f"{name}/restore.py")
        z.write(HERE / "恢复说明-给AI看.md", f"{name}/恢复说明-给AI看.md")
    tmp.replace(zip_path)

    # 打包内容校验
    with zipfile.ZipFile(zip_path) as z:
        bad = z.testzip()
    if bad:
        sys.exit(f"zip 校验失败：{bad}")

    dup = sum(1 for e in entries if "same_as" in e)
    print(f"完成：{zip_path}")
    print(f"文件 {len(entries)} 个（其中 {dup} 个内容重复只存一份），"
          f"原始共 {manifest['total_bytes']/1e6:.1f}MB，包大小 {zip_path.stat().st_size/1e6:.1f}MB")


if __name__ == "__main__":
    main()
