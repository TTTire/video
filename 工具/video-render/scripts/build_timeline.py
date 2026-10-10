"""口播稿 → 逐句合成配音 + 时间轴。
用法：python3 scripts/build_timeline.py <口播逐字稿.md> <期号如 ep6> <场景表.json>
场景表：{"句子序号": "场景名", ...}，序号从 0 开始，章节标题也占一个序号（先运行一次不带场景表的 --list 查看序号）。
输出：public/<期号>-narration.wav、src/<期号>/timeline.json
"""
import json, os, re, subprocess, sys, wave, array

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS, SR = 30, 48000
VOICE, RATE = "Tingting", "215"
REPLACE = {"2 万 4": "两万四", "2 万": "两万", "《": "", "》": ""}

def parse(path):
    items, chap = [], 0
    for l in open(path, encoding="utf-8").read().splitlines():
        l = l.strip()
        if not l or l.startswith("# "):
            continue
        m = re.match(r"## 第(\d)章：(.*)", l)
        if m:
            chap = int(m.group(1)); items.append({"type": "chapter", "chapter": chap, "text": m.group(2)}); continue
        items.append({"type": "line", "chapter": chap, "text": l})
    return items

def main():
    src, ep = sys.argv[1], sys.argv[2]
    items = parse(src)
    if len(sys.argv) > 3 and sys.argv[3] == "--list":
        for i, it in enumerate(items): print(i, it["type"][0], it["text"][:40])
        return
    scenemap = {int(k): v for k, v in json.load(open(sys.argv[3], encoding="utf-8")).items()}
    work = f"/tmp/video-render-{ep}"; os.makedirs(work, exist_ok=True)
    t, n = 0.6, 0
    for it in items:
        if it["type"] == "chapter":
            it.update(start=round(t, 3), dur=2.2); t += 2.2; continue
        text = it["text"]
        for a, b in REPLACE.items(): text = text.replace(a, b)
        aiff, wav = f"{work}/{n:03d}.aiff", f"{work}/{n:03d}.wav"
        subprocess.run(["say", "-v", VOICE, "-r", RATE, "-o", aiff, text], check=True)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", aiff, "-ar", str(SR), "-ac", "1", wav], check=True)
        d = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav]))
        it.update(start=round(t, 3), dur=round(d, 3), file=wav); t += d + 0.32; n += 1
    total = t + 2.0
    buf = array.array("h", [0]) * int(total * SR)
    for it in items:
        if "file" in it:
            w = wave.open(it["file"]); a = array.array("h", w.readframes(w.getnframes())); s = int(it["start"] * SR); buf[s:s + len(a)] = a
    os.makedirs(f"{ROOT}/public", exist_ok=True)
    o = wave.open(f"{ROOT}/public/{ep}-narration.wav", "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes(buf.tobytes()); o.close()
    keys = sorted(scenemap); scenes = []
    for i, k in enumerate(keys):
        end = keys[i + 1] if i + 1 < len(keys) else len(items)
        f0 = round(items[k]["start"] * FPS)
        f1 = round(items[end]["start"] * FPS) if end < len(items) else round(total * FPS)
        sc = {"scene": scenemap[k], "from": f0, "dur": f1 - f0, "steps": [round(items[j]["start"] * FPS) - f0 for j in range(k, end)]}
        if items[k]["type"] == "chapter": sc.update(chapter=items[k]["chapter"], title=items[k]["text"])
        scenes.append(sc)
    subs = [{"from": round(it["start"] * FPS), "dur": round(it["dur"] * FPS), "text": it["text"].rstrip("。，？！")} for it in items if it["type"] == "line"]
    os.makedirs(f"{ROOT}/src/{ep}", exist_ok=True)
    json.dump({"fps": FPS, "total": round(total * FPS), "scenes": scenes, "subs": subs}, open(f"{ROOT}/src/{ep}/timeline.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"{ep}: {n} 句, {len(scenes)} 个场景, {total:.1f} 秒")

main()
