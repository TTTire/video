# Python port of 工具/validate_package.rb (same normalization), used when ruby is not on PATH.
import re, sys, glob, os, unicodedata

def is_punct_or_symbol(ch):
    return unicodedata.category(ch)[0] in ('P', 'S')

def normalize_line(line):
    line = re.sub(r'(\d+)\.(\d+)', r'\1点\2', line)
    line = re.sub(r'(\d+(?:点\d+)?)%', r'百分之\1', line)
    line = ''.join(ch for ch in line if not is_punct_or_symbol(ch))
    line = re.sub(r'[ \t]+', ' ', line)
    return line.strip()

topic = sys.argv[1]
write = '--write-jianying' in sys.argv
scripts = [p for p in glob.glob(os.path.join(topic, '*-口播逐字稿.md')) if '剪映版' not in p]
clips = glob.glob(os.path.join(topic, '*-口播逐字稿-剪映版.md'))
checklists = glob.glob(os.path.join(topic, '*-发布清单.md'))
if write and len(scripts) == 1 and not clips:
    clips = [scripts[0].replace('-口播逐字稿.md', '-口播逐字稿-剪映版.md')]
errors = []
assert len(scripts) == 1 and len(clips) == 1 and len(checklists) == 1, (scripts, clips, checklists)
script = open(scripts[0], encoding='utf-8').read()
checklist = open(checklists[0], encoding='utf-8').read()

chapters = [int(x) for x in re.findall(r'^## 第([0-9]+)章：', script, re.M)]
if chapters != [1, 2, 3]: errors.append(f'chapter sequence {chapters}')

blocks = [[]]
for line in script.splitlines():
    s = line.strip()
    if not s or s.startswith('# '): continue
    if re.match(r'^## 第[123]章：', s):
        if blocks[-1]: blocks.append([])
        continue
    c = normalize_line(s)
    if c: blocks[-1].append(c)
blocks = [b for b in blocks if b]
expected = '\n\n'.join('\n'.join(b) for b in blocks) + '\n'
if write:
    open(clips[0], 'w', encoding='utf-8', newline='\n').write(expected)
    print('wrote=', clips[0])
clip = open(clips[0], encoding='utf-8').read()
if len(blocks) != 4: errors.append(f'blocks {len(blocks)}')
if clip != expected: errors.append('clip differs')
if any(is_punct_or_symbol(ch) for ch in clip): errors.append('clip has punct')

for h in ['## 推荐标题','## 封面图片 Prompt','## 标签','## 发布文案','## 发布时间','## 背景音乐（Suno）','## 画面与素材清单','## 事实核对']:
    if h not in checklist: errors.append('missing '+h)
if len(re.findall(r'^\d+\. \*\*', checklist, re.M)) != 3: errors.append('need 3 titles')

def han(t): return len(re.findall(r'[\u4e00-\u9fff]', t))
def tl(label, t):
    if han(t) > 13: errors.append(f'{label} title too long: {han(t)} {t}')
tl('script', script.splitlines()[0].lstrip('# '))
tl('checklist', re.sub(r'\s+[—-]\s+发布清单\s*$', '', checklist.splitlines()[0].lstrip('# ')))
for i, t in enumerate(re.findall(r'^\d+\. \*\*(.+?)\*\*', checklist, re.M)): tl(f'rec{i+1}', t)
m = re.search(r'^封面标题：[ \t]*\n(?:\n)*[ \t]*`?([^`\n]+)`?[ \t]*$', checklist, re.M)
if not m: errors.append('cover title not found')
else: tl('cover', m.group(1))
for f in ['封面标题：','备选标题：','一句视觉方案：']:
    if f not in checklist: errors.append('cover missing '+f)
if not re.search(r'Image2(?: / Image2\.5)? 一段式 Prompt：', checklist): errors.append('missing Image2 prompt')
if not re.search(r'COVER_DNA v[12]', checklist): errors.append('missing COVER_DNA')
for lim in ['strictly instrumental only','no vocals','no vocal chops','no humming','no choir','no spoken word','no whispers','no ad-libs','no vocal samples']:
    if lim not in checklist: errors.append('suno missing '+lim)
forb = ['深度赋能','认知升级','底层逻辑','显著提升','闭环','抓手','高维度','本质上','不难发现','值得注意的是','在这个时代']
hits = {t: script.count(t) for t in forb if script.count(t)}
if hits: errors.append(f'forbidden {hits}')
spoken = han(''.join(''.join(b) for b in blocks))
decl = re.search(r'(?:可口播)?正文约?\s*(\d+)\s*个汉字', checklist)
if decl and abs(int(decl.group(1)) - spoken) > 50: print(f'WARN: declared {decl.group(1)} vs actual {spoken}')
tc = {p: script.count(p) for p in ['不是','而是','真正','你以为','这就是','很多人']}
nb = len(re.findall(r'不是[^。\n]{0,20}而是', script))
if nb > 3: print(f'WARN: 不是…而是 x{nb}')
print('spoken_han_count=', spoken, 'blocks=', len(blocks), 'template=', tc)
if errors:
    for e in errors: print('FAIL:', e)
    print('VALIDATION=FAIL'); sys.exit(1)
print('VALIDATION=PASS')
