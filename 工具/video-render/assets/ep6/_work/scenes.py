# -*- coding: utf-8 -*-
"""场景图：用元素库拼出的 16:9 场景（1920x1080），风格天然一致。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import gen as G

OUT = os.path.join(os.path.dirname(__file__), '..', 'scenes')
os.makedirs(OUT, exist_ok=True)
W, H = 1920, 1080
C = G


def place(body, x, y, s=1.0, flip=False):
    t = f'translate({x} {y}) scale({-s if flip else s} {s})'
    if flip:
        t = f'translate({x + 400 * s} {y}) scale({-s} {s})'
    return f'<g transform="{t}">{body}</g>'


def save(name, body, bg=True):
    base = f'<rect width="{W}" height="{H}" fill="{C.CREAM}"/>' if bg else ''
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">{base}{body}</svg>'
    open(os.path.join(OUT, name + '.svg'), 'w', encoding='utf-8').write(s)


def ground(y=940):
    return f'<path d="M0 {y} L{W} {y}" stroke="{C.NAVY}" stroke-width="8" stroke-linecap="round"/>'


def shop_front(night=True, queue=True, boss_pose='wave'):
    """奶茶店外景：S01（排队）/ S21b（队伍散了）"""
    b = ''
    # 夜色：上方一片淡墨蓝薄雾（保持米白主体）
    if night:
        b += f'<rect x="0" y="0" width="{W}" height="{H}" fill="{C.NAVY}" opacity="0.06"/>'
        b += f'<circle cx="1700" cy="150" r="60" fill="{C.TAN}" {C.st()}/>'
    # 店面主体
    sx, sy, sw, sh = 980, 330, 760, 610
    b += f'<rect x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="10" fill="{C.TAN}" {C.st(8)}/>'
    # 招牌（无字）
    b += f'<rect x="{sx-20}" y="{sy-10}" width="{sw+40}" height="90" rx="14" fill="{C.ORANGE}" {C.st(8)}/>'
    b += place(C.cup('straw'), sx + sw/2 - 44, sy - 2, 0.2)
    # 遮阳棚
    awn = ''.join(f'<rect x="{sx-30 + i*(sw+60)/8}" y="{sy+80}" width="{(sw+60)/8}" height="56" fill="{C.ORANGE if i%2==0 else C.CREAM}"/>' for i in range(8))
    b += f'<g>{awn}</g><rect x="{sx-30}" y="{sy+80}" width="{sw+60}" height="56" rx="4" fill="none" {C.st(8)}/>'
    # 橱窗（暖光）
    b += f'<rect x="{sx+40}" y="{sy+170}" width="440" height="330" rx="8" fill="#F6E3B4" {C.st(8)}/>'
    # 橱窗里的吧台 + 店员剪影
    b += f'<rect x="{sx+60}" y="{sy+380}" width="400" height="120" fill="{C.TEAL}" {C.st(6)}/>'
    for i, (n, shirt, apron, hair, hc, skin) in enumerate(C.STAFF[:3]):
        b += place(C.staff_busy(shirt, apron, hair, hc, skin), sx + 70 + i * 130, sy + 230, 0.42)
    b += place(C.sealer(True), sx + 330, sy + 250, 0.3)
    # 门
    b += f'<rect x="{sx+540}" y="{sy+170}" width="170" height="440" rx="8" fill="#F6E3B4" {C.st(8)}/>'
    b += f'<path d="M{sx+625} {sy+170} L{sx+625} {sy+610}" {C.st(6)}/>'
    b += f'<circle cx="{sx+605}" cy="{sy+400}" r="8" fill="{C.NAVY}"/><circle cx="{sx+645}" cy="{sy+400}" r="8" fill="{C.NAVY}"/>'
    # 时钟挂在门上方
    b += place(C.clock(), sx + 575, sy + 100, 0.14)
    b += ground()
    # 老板站门边
    b += place(C.boss(boss_pose), sx + 330, 560, 0.95)
    # 队伍
    if queue:
        kinds = ['backpack', 'phone', 'hat', 'bag']
        for i in range(11):
            x = 900 - i * 92
            s = 0.95 - i * 0.012
            b += place(C.silhouette(kinds[i % 4]), x, 940 - 380 * s, s, flip=(i % 3 == 0))
    return b


save('S01-奶茶店夜景排队', shop_front(True, True, 'wave'))
save('S21b-奶茶店夜景-队伍散了', shop_front(True, False, 'scratch'))


def counter_inside(crowded=True, two_sealers=False):
    """吧台内景平视：S02（4 人挤）/ S21a（两台封口机顺畅）"""
    b = ''
    # 后墙 + 置物架
    b += f'<rect x="0" y="0" width="{W}" height="700" fill="{C.TAN}" opacity="0.5"/>'
    for y in (220, 360):
        b += f'<rect x="1000" y="{y}" width="820" height="18" rx="6" fill="{C.NAVY}"/>'
        for i in range(7):
            b += place(C.cup('empty'), 1010 + i * 110, y - 100, 0.25)
    # 菜单板（无字，色块）
    b += f'<rect x="120" y="120" width="700" height="300" rx="16" fill="{C.NAVY}" {C.st(8)}/>'
    for i in range(4):
        b += f'<rect x="170" y="{170+i*60}" width="{260 if i%2 else 360}" height="22" rx="8" fill="{C.CREAM}" opacity="0.6"/>'
        b += f'<rect x="640" y="{170+i*60}" width="120" height="22" rx="8" fill="{C.ORANGE}" opacity="0.9"/>'
    # 吧台
    b += f'<rect x="0" y="700" width="{W}" height="380" fill="{C.TEAL}" {C.st(8)}/>'
    b += f'<rect x="0" y="690" width="{W}" height="40" fill="{C.TAN}" {C.st(8)}/>'
    # 人与机器
    if crowded:
        xs = [1020, 1180, 1340, 1500]
        for i, (n, shirt, apron, hair, hc, skin) in enumerate(C.STAFF[:4]):
            b += place(C.staff_busy(shirt, apron, hair, hc, skin, 'flat' if n != 4 else 'hmm'), xs[i], 390, 0.85, flip=(i % 2 == 1))
        b += place(C.sealer(True), 1620, 440, 0.65)
        # 杂乱动作线
        for (x, y) in [(1000, 450), (1250, 420), (1600, 430)]:
            b += f'<path d="M{x} {y} q10 -16 20 0 M{x+30} {y-10} q10 -16 20 0" {C.st(6)}/>'
    else:
        b += place(C.sealer(True), 920, 440, 0.65)
        b += place(C.sealer(True), 1620, 440, 0.65)
        for i, (n, shirt, apron, hair, hc, skin) in enumerate(C.STAFF[:4]):
            x = [1160, 1300, 1460, 1800][i] if i < 3 else 1480
            x = [1180, 1320, 1470, 1850][i]
            b += place(C.staff_busy(shirt, apron, hair, hc, skin), x, 390, 0.85, flip=(i >= 2))
    return b


save('S02-吧台内景-4人挤', counter_inside(True))
save('S21a-吧台内景-两台封口机', counter_inside(False))


def sealer_closeup():
    """S09 封口机大特写 + 一列杯子排队"""
    b = place(C.sealer(True), 60, 120, 2.0)
    for i in range(7):
        s = 0.9 - i * 0.09
        b += place(C.cup('empty'), 900 + i * 125, 920 - 300 * s, s * 0.8)
    b += ground(930)
    return b


save('S09-封口机特写-杯子排队', sealer_closeup())


def forest():
    """S14 林间空地（不画人，人由代码加）"""
    b = ''
    b += f'<ellipse cx="960" cy="980" rx="1100" ry="140" fill="{C.TEAL}" opacity="0.35"/>'
    for (x, s) in [(80, 0.9), (320, 1.2), (1480, 1.1), (1700, 0.85), (600, 0.6), (1300, 0.6)]:
        b += place(C.tree(), x, 880 - 400 * s, s)
    b += place(C.log_(), 560, 760, 0.9)
    b += place(C.log_(), 1000, 820, 1.0)
    b += place(C.saw(), 660, 560, 1.1)
    return b


save('S14-林间空地', forest())


def steps_cover():
    """S04 栏目卡：递减台阶 + 奶茶杯"""
    b = ''
    hs = [30, 30, 20, 5, 2]
    x = 160; base = 760; unit = 14
    tops = []
    for i, h in enumerate(hs):
        cum = sum(hs[:i+1]) * unit
        b += f'<rect x="{x + i*180}" y="{base - cum}" width="180" height="{cum}" fill="{C.NAVY if i<3 else C.ORANGE}" {C.st(8)}/>'
        tops.append(base - cum)
    b += place(C.cup('straw'), x + 4*180 + 10, tops[-1] - 240, 0.6)
    return b


save('S04-栏目卡-递减台阶', steps_cover())

# 预览
files = sorted(f for f in os.listdir(OUT) if f.endswith('.svg'))
cells = ''.join(f'<figure><img src="../scenes/{f}"><figcaption>{f[:-4]}</figcaption></figure>' for f in files)
html = f'''<!doctype html><meta charset="utf-8"><style>
body{{background:#ddd;margin:0;padding:24px;font-family:"Microsoft YaHei",sans-serif;color:{C.NAVY}}}
.grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:18px}}
figure{{margin:0;text-align:center}} img{{width:100%;display:block;border-radius:8px}}
figcaption{{font-size:14px;margin-top:4px}}
</style><div class="grid">{cells}</div>'''
open(os.path.join(os.path.dirname(__file__), 'preview-scenes.html'), 'w', encoding='utf-8').write(html)
print(len(files), 'scenes')
