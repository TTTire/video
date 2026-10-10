"""新建一期的渲染骨架并注册到 Root.tsx。
用法：python scripts/new_episode.py <期号如 ep7>

生成（已存在的不覆盖）：
- src/<epN>/timeline.json   占位（跑 timeline_from_srt.py 后会被覆盖）
- src/<epN>/scenemap.json / scene-names.json / photo.json   占位（跑 scenes_from_checklist.py 后会被覆盖）
- src/<epN>/custom.tsx      特殊图表写这里
- public/<epN>/photos/      照片入库目录
并在 src/Root.tsx 的两处标记里加上 import 和注册行 → 合成 EpNPhoto / EpNPhotoCheck / EpNSheet
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ep = sys.argv[1]
if not re.fullmatch(r"ep\d+", ep): sys.exit("期号格式：ep7")
n = re.sub(r"\D", "", ep)
d = f"{ROOT}/src/{ep}"
os.makedirs(d, exist_ok=True)
os.makedirs(f"{ROOT}/public/{ep}/photos", exist_ok=True)

def write_if_absent(path, content):
    if os.path.exists(path): print(f"  已有 {os.path.relpath(path, ROOT)}"); return
    open(path, "w", encoding="utf-8").write(content); print(f"  新建 {os.path.relpath(path, ROOT)}")

write_if_absent(f"{d}/timeline.json", json.dumps({"fps": 30, "total": 60, "scenes": [{"scene": "chapter", "from": 0, "dur": 60, "steps": [0], "chapter": 1, "title": "占位"}], "subs": []}))
write_if_absent(f"{d}/scenemap.json", "{}")
write_if_absent(f"{d}/scene-names.json", "{}")
write_if_absent(f"{d}/photo.json", json.dumps({"ep": ep, "badge": n.zfill(2), "series": "100 个经济学原理", "photos": f"{ep}/photos", "chapterPhoto": "S01", "scenes": []}, ensure_ascii=False, indent=2))
write_if_absent(f"{d}/custom.tsx", f'''// 第 {n} 期的特殊图表（柱状图、表格、对比图等）。photo.json 里用 {{"type":"custom","name":"xxx"}} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几句，at(p, i) 是第 i 句开始的帧。参考 src/ep6/custom.tsx。
import React from 'react';
import {{P}} from '../photo/kit';
import {{CustomMap}} from '../photo/engine';

export const CUSTOM{n}: CustomMap = {{}};
''')

root = f"{ROOT}/src/Root.tsx"
s = open(root, encoding="utf-8").read()
imp = f"import {ep}photo from './{ep}/photo.json';\nimport {ep}names from './{ep}/scene-names.json';\nimport {{CUSTOM{n}}} from './{ep}/custom';\n"
reg = f"  {{id: 'Ep{n}', tl: {ep}, spec: {ep}photo as EpisodeSpec, custom: CUSTOM{n}, names: {ep}names}},\n"
tl_imp = f"import {ep} from './{ep}/timeline.json';\n"
if f"'./{ep}/photo.json'" in s:
    print("  Root.tsx 已注册"); sys.exit()
if tl_imp not in s: s = s.replace("// ---- 通用照片引擎的期数", tl_imp + "// ---- 通用照片引擎的期数", 1)
s = s.replace("// ---- /imports ----", imp + "// ---- /imports ----", 1)
s = s.replace("  // ---- /episodes ----", reg + "  // ---- /episodes ----", 1)
open(root, "w", encoding="utf-8").write(s)
print(f"  Root.tsx 注册 Ep{n}Photo / Ep{n}PhotoCheck / Ep{n}Sheet")
