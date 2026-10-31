"""从 words.json 提议剪点（停顿 / 重说 / 垫字 / 残句），写成可手改的 Markdown 表 + 同名 json。

用法: python scripts/propose_cuts.py <words.json> [--pause 1.5] [--out 剪切清单.md]
      [--window 60] [--similarity 0.75]

表里 `处理` 列默认 `删`；人工改成 `留` 就不剪，也可以直接改 开始/结束 时间（mm:ss.sss 或纯秒）。
"""
from __future__ import annotations

import argparse
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import fmt_time, load_json, write_json  # noqa: E402

CLAUSE_END = "。？！；?!;，,.、…"
PUNCT_RE = re.compile(r"[\s。？！；，,.、…:：\"'“”‘’（）()《》<>\[\]【】—\-~～!?]+")
FILLERS_ALWAYS = {"呃", "嗯", "啊", "额", "呐", "嗯嗯", "呃呃"}
FILLERS_IF_PAUSED = {"那个", "就是", "然后", "这个", "对"}
PAUSE_KEEP = 0.4      # 停顿里保留的秒数（两边各一半）
EDGE = 0.1            # 删除段末端离下一遍开口的余量


def norm(text: str) -> str:
    return PUNCT_RE.sub("", text)


def flat_words(data: dict) -> list[dict]:
    return [{**w, "seg": s["id"]} for s in data["segments"] for w in s["words"]]


def clauses_of(words: list[dict]) -> list[dict]:
    """按标点把词序列切成短句，每句带 词下标范围、起止时间、归一化文本。"""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(i)
        if w["word"].strip()[-1:] in CLAUSE_END or i == len(words) - 1:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    res = []
    for idx in out:
        text = "".join(words[i]["word"] for i in idx)
        res.append({"idx": idx, "start": words[idx[0]]["start"], "end": words[idx[-1]]["end"],
                    "text": text.strip(), "norm": norm(text)})
    return res


def back_to_pause(words: list[dict], first_idx: int, keep: float = EDGE, min_gap: float = 0.25) -> float:
    """删除段起点：若前一个词和本句之间有 ≥ min_gap 的空隙，就从空隙里起剪（给前句收尾留 keep 秒）。"""
    w = words[first_idx]
    if first_idx == 0:
        return max(0.0, w["start"] - 0.05)
    prev_end = words[first_idx - 1]["end"]
    gap = w["start"] - prev_end
    if gap >= min_gap:
        return prev_end + min(keep, gap / 2)
    return max(prev_end, w["start"] - 0.03)


def sim(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def propose(data: dict, pause: float, window: float, sim_thr: float) -> list[dict]:
    words = flat_words(data)
    if not words:
        return []
    clauses = clauses_of(words)
    items: list[dict] = []

    # 1) 停顿：词间空隙 > 阈值
    for i in range(1, len(words)):
        gap = words[i]["start"] - words[i - 1]["end"]
        if gap > pause:
            items.append({"type": "停顿", "start": words[i - 1]["end"] + PAUSE_KEEP / 2,
                          "end": words[i]["start"] - PAUSE_KEEP / 2,
                          "note": f"静音 {gap:.1f}s（保留 {PAUSE_KEEP:.1f}s）"})

    # 2) 重说：60 秒窗内相似短句，删前一遍（连续多句一起重说时合成一块）
    def thr_for(a: str, b: str) -> float:
        return sim_thr if min(len(a), len(b)) >= 10 else max(sim_thr, 0.85)

    consumed: set[int] = set()
    i = 0
    while i < len(clauses):
        ci = clauses[i]
        if i in consumed or len(ci["norm"]) < 4:
            i += 1
            continue
        match = None
        for j in range(i + 1, len(clauses)):
            cj = clauses[j]
            if cj["start"] - ci["end"] > window:
                break
            if len(cj["norm"]) < 4:
                continue
            s = sim(ci["norm"], cj["norm"])
            if s >= thr_for(ci["norm"], cj["norm"]):
                match = (j, s)
                break
        if match is None:
            i += 1
            continue
        j, s0 = match
        m, sims = 1, [s0]
        while i + m < j and j + m < len(clauses):
            s = sim(clauses[i + m]["norm"], clauses[j + m]["norm"])
            if s < thr_for(clauses[i + m]["norm"], clauses[j + m]["norm"]):
                break
            sims.append(s)
            m += 1
        first_text = "".join(c["text"] for c in clauses[i:i + m])
        retake = "".join(c["text"] for c in clauses[j:j + m])
        items.append({"type": "重说", "start": back_to_pause(words, ci["idx"][0]),
                      "end": clauses[j]["start"] - EDGE,
                      "note": f"删前一遍「{first_text}」→ 留后一遍「{retake}」（相似度 {min(sims):.2f}"
                              f"{'，' + str(m) + ' 句' if m > 1 else ''}）"})
        consumed.update(range(i, i + m))
        i += m

    # 3) 垫字：短句开头独立的 呃/嗯/啊/那个/就是
    for c in clauses:
        idx = c["idx"]
        for n in (1, 2):
            if len(idx) < n:
                break
            tok = norm("".join(words[k]["word"] for k in idx[:n]))
            if not tok:
                continue
            nxt = idx[n] if len(idx) > n else (idx[-1] + 1 if idx[-1] + 1 < len(words) else None)
            last = words[idx[n - 1]]
            has_punct = last["word"].strip()[-1:] in CLAUSE_END
            gap_after = (words[nxt]["start"] - last["end"]) if nxt is not None else 1.0
            if tok in FILLERS_ALWAYS or (tok in FILLERS_IF_PAUSED and (has_punct or gap_after >= 0.25)):
                end = (words[nxt]["start"] - 0.08) if nxt is not None else last["end"]
                items.append({"type": "垫字", "start": back_to_pause(words, idx[0], keep=PAUSE_KEEP / 2),
                              "end": max(end, last["end"]),
                              "note": f"「{tok}」"})
                break

    # 4) 残句：短句且下一句开头 2–4 字相同（卡壳重起）
    for i in range(len(clauses) - 1):
        if i in consumed:
            continue
        a, b = clauses[i], clauses[i + 1]
        if len(a["norm"]) > 6 and a["end"] - a["start"] > 2.0:
            continue
        k = min(4, len(a["norm"]))
        if k >= 2 and a["norm"][:k] == b["norm"][:k] and len(b["norm"]) > len(a["norm"]):
            items.append({"type": "残句", "start": back_to_pause(words, a["idx"][0]), "end": b["start"] - EDGE,
                          "note": f"「{a['text']}」→ 接着重起「{b['text'][:12]}…」"})

    # 整理：去掉无效区间；停顿若完全落在别的删除段里就并进去（在那条的内容里注明）
    items = [it for it in items if it["end"] - it["start"] >= 0.05]
    items.sort(key=lambda it: (it["start"], it["end"]))
    kept = []
    for it in items:
        if it["type"] == "停顿":
            host = next((o for o in items if o["type"] != "停顿" and o["start"] <= it["start"] and it["end"] <= o["end"]),
                        None)
            if host is not None:
                host["note"] += f"；含 {it['note']}"
                continue
        kept.append(it)
    for n, it in enumerate(kept, 1):
        it["n"] = n
        it["action"] = "删"
    return kept


def render_md(items: list[dict], src: Path, data: dict, pause: float) -> str:
    total = sum(it["end"] - it["start"] for it in items)
    lines = [f"# 剪切清单 — {Path(data.get('media', src)).name}", "",
             f"- 来源: `{src.name}`（时长 {fmt_time(data.get('duration', 0))}）",
             f"- 规则: 停顿 > {pause:.1f}s；重说 60s 窗内相似度 ≥ 0.75；垫字 呃/嗯/啊/那个/就是；残句 下一句同开头",
             f"- 提议 {len(items)} 处，合计约 {total:.1f}s。`处理` 列：`删` 执行，`留` 跳过；时间可直接改（mm:ss.sss 或秒）。", "",
             "| # | 开始 | 结束 | 时长 | 类型 | 内容 | 处理 |", "|---|---|---|---|---|---|---|"]
    for it in items:
        note = it["note"].replace("|", "｜")
        lines.append(f"| {it['n']} | {fmt_time(it['start'])} | {fmt_time(it['end'])} | {it['end'] - it['start']:.2f} | "
                     f"{it['type']} | {note} | {it['action']} |")
    return "\n".join(lines) + "\n"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("words_json", type=Path)
    ap.add_argument("--pause", type=float, default=1.5, help="词间空隙超过多少秒算停顿（默认 1.5）")
    ap.add_argument("--window", type=float, default=60.0, help="重说检测窗口秒数（默认 60）")
    ap.add_argument("--similarity", type=float, default=0.75, help="重说相似度阈值（默认 0.75）")
    ap.add_argument("--out", type=Path, help="默认与 words.json 同目录的 剪切清单.md")
    args = ap.parse_args()

    data = load_json(args.words_json)
    items = propose(data, args.pause, args.window, args.similarity)
    out_md = args.out or args.words_json.parent / "剪切清单.md"
    out_md.write_text(render_md(items, args.words_json, data, args.pause), encoding="utf-8")
    write_json(out_md.with_suffix(".json"), {"source": str(args.words_json), "pause": args.pause, "items": items})
    counts = {}
    for it in items:
        counts[it["type"]] = counts.get(it["type"], 0) + 1
    total = sum(it["end"] - it["start"] for it in items)
    print(f"[propose] {len(items)} 处（{'，'.join(f'{k} {v}' for k, v in counts.items()) or '无'}），"
          f"合计 {total:.1f}s → {out_md}")


if __name__ == "__main__":
    main()
