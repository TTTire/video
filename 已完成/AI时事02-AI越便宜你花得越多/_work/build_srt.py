# -*- coding: utf-8 -*-
"""Assemble bilingual + English-only SRT from _work/srt_cues.json and _work/en_final.json."""
import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CUES = '_work/srt_cues.json'
EN = '_work/en_final.json'
OUT_BI = 'AI越便宜你花得越多-双语字幕.srt'
OUT_EN = 'AI越便宜你花得越多-英文字幕.srt'
END_PUNCT = '.?!。？！,，;；:：'

cues = json.load(open(CUES, encoding='utf-8'))['cues']
en = json.load(open(EN, encoding='utf-8'))['lines']
en_map = {}
for l in en:
    assert l['i'] not in en_map, f"duplicate index {l['i']}"
    en_map[l['i']] = l['en']
missing = [c['i'] for c in cues if c['i'] not in en_map]
assert not missing, f"missing English for cues {missing}"
extra = sorted(set(en_map) - {c['i'] for c in cues})
assert not extra, f"extra indices {extra}"

def dur(t):
    m = re.match(r'(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)', t)
    a = int(m[1])*3600+int(m[2])*60+int(m[3])+int(m[4])/1000
    b = int(m[5])*3600+int(m[6])*60+int(m[7])+int(m[8])/1000
    return b-a

stripped, long_lines, fast, blank, zh_punct = [], [], [], [], []
bi, eo = [], []
for c in cues:
    i, t, zh = c['i'], c['t'], c['zh']
    e = en_map[i].strip()
    e = re.sub(r'\s+', ' ', e)
    if e and e[-1] in END_PUNCT:
        stripped.append((i, e))
        e = e.rstrip(END_PUNCT + ' ')
    if not e:
        blank.append(i)
    if len(e) > 55:
        long_lines.append((i, len(e), e))
    d = dur(t)
    if d > 0 and len(e)/d > 25:
        fast.append((i, round(len(e)/d, 1), e))
    if re.search(r'[，。？！；：、“”‘’（）]', zh):
        zh_punct.append((i, zh))
    bi.append(f"{i}\n{t}\n{zh}\n{e}\n")
    eo.append(f"{i}\n{t}\n{e}\n")

nl = '\r\n'
open(OUT_BI, 'w', encoding='utf-8', newline='').write(nl.join(b.replace('\n', nl) for b in bi).rstrip(nl) + nl)
open(OUT_EN, 'w', encoding='utf-8', newline='').write(nl.join(b.replace('\n', nl) for b in eo).rstrip(nl) + nl)

print(f"cues: {len(cues)}  written: {OUT_BI}, {OUT_EN}")
print(f"end-punctuation stripped: {len(stripped)}")
for i, e in stripped: print(f"   {i}: {e}")
print(f"blank English: {blank}")
print(f"lines > 55 chars: {len(long_lines)}")
for x in long_lines: print(f"   {x[0]} ({x[1]}): {x[2]}")
print(f"lines > 25 cps: {len(fast)}")
for x in fast: print(f"   {x[0]} ({x[1]} cps): {x[2]}")
print(f"Chinese lines with punctuation: {zh_punct}")
lens = sorted(len(en_map[c['i']]) for c in cues)
print(f"English length: max={lens[-1]} p95={lens[int(len(lens)*0.95)]} median={lens[len(lens)//2]}")
