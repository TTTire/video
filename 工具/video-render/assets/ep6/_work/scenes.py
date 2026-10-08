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
        for i in range(9):
            x = 880 - i * 108
            s = 0.82 - i * 0.012
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
        xs = [1040, 1150, 1270, 1385]
        for i, (n, shirt, apron, hair, hc, skin) in enumerate(C.STAFF[:4]):
            b += place(C.staff_busy(shirt, apron, hair, hc, skin, 'flat' if n != 4 else 'hmm'), xs[i], 390, 0.85, flip=(i % 2 == 1))
        b += place(C.sealer(True), 1620, 440, 0.65)
        # 杂乱动作线
        for (x, y) in [(1000, 450), (1250, 420), (1600, 430)]:
            b += f'<path d="M{x} {y} q10 -16 20 0 M{x+30} {y-10} q10 -16 20 0" {C.st(6)}/>'
    else:
        b += place(C.sealer(True), 840, 440, 0.65)
        b += place(C.sealer(True), 1700, 440, 0.65)
        for i, (n, shirt, apron, hair, hc, skin) in enumerate(C.STAFF[:4]):
            x = [1080, 1230, 1400, 1550][i]
            b += place(C.staff_busy(shirt, apron, hair, hc, skin), x, 390, 0.85, flip=(i < 2))
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
    x = 160; base = 900; unit = 16
    tops = []
    for i, h in enumerate(hs):
        hh = h * unit
        b += f'<rect x="{x + i*190}" y="{base - hh}" width="190" height="{hh}" fill="{C.NAVY if i<3 else C.ORANGE}" {C.st(8)}/>'
        tops.append(base - hh)
    b += f'<path d="M0 {base} L{W} {base}" {C.st(8)}/>'
    b += place(C.cup('straw'), x + 4*190 + 20, tops[-1] - 230, 0.6)
    return b


save('S04-栏目卡-递减台阶', steps_cover())


def staff_by_n(n, pose='front', face=None):
    _, shirt, apron, hair, hc, skin = C.STAFF[n - 1]
    if pose == 'front':
        return C.staff_front(shirt, apron, hair, hc, skin, face or 'smile')
    return C.staff_busy(shirt, apron, hair, hc, skin, face or 'flat')


def cup_row(x, y, n, s=0.45, gap=None, state='sealed'):
    gap = gap or 200 * s + 10
    return ''.join(place(C.cup(state), x + i * gap, y, s) for i in range(n))


def sound_arcs(x, y, r=40, n=3, color=None):
    color = color or C.ORANGE
    out = ''
    for i in range(n):
        rr = r + i * 22
        out += f'<path d="M{x+rr*0.5:.0f} {y-rr*0.87:.0f} A{rr} {rr} 0 0 1 {x+rr*0.5:.0f} {y+rr*0.87:.0f}" stroke="{color}" stroke-width="8" stroke-linecap="round" fill="none"/>'
    return out


def counter_seg(x, y, w, h=260):
    return (f'<rect x="{x}" y="{y+10}" width="{w}" height="{h}" fill="{C.TEAL}" {C.st(8)}/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="36" rx="6" fill="{C.TAN}" {C.st(8)}/>')


# S03 不是新人，是那台机器
def s03():
    b = place(staff_by_n(4, 'front', 'o'), 120, 520, 1.05)
    b += counter_seg(0, 820, W)
    b += place(C.sealer(True), 560, 200, 1.75)
    b += cup_row(470, 665, 5, 0.42)
    return b
save('S03-新人与封口机', s03())


# S07 吧台俯视（左半），右半留白放柱状图
def s07():
    b = f'<rect x="60" y="80" width="880" height="920" rx="40" fill="{C.TEAL}" {C.st(8)}/>'
    b += f'<rect x="120" y="140" width="760" height="800" rx="24" fill="{C.TAN}" {C.st(6)}/>'
    # 点单口（左侧缺口）
    b += f'<rect x="40" y="420" width="90" height="240" rx="14" fill="{C.CREAM}" {C.st(8)}/>'
    b += f'<rect x="150" y="440" width="120" height="200" rx="12" fill="{C.NAVY}" {C.st(6)}/>'  # 收银机
    # 操作台：几组俯视的杯子（圆）与托盘
    for i in range(3):
        b += f'<rect x="{330+i*170}" y="200" width="140" height="110" rx="14" fill="{C.CREAM}" {C.st(6)}/>'
        for j in range(3):
            b += f'<circle cx="{360+i*170+j*42}" cy="255" r="16" fill="{C.TEAL}" {C.st(5)}/>'
    for i in range(5):
        b += f'<circle cx="{380+i*110}" cy="480" r="30" fill="{C.WOOD}" {C.st(6)}/><circle cx="{380+i*110}" cy="480" r="12" fill="{C.NAVY}"/>'
    # 封口机位（右下角，俯视：方块 + 圆）
    b += f'<rect x="700" y="760" width="160" height="160" rx="20" fill="{C.ORANGE}" {C.st(8)}/>'
    b += f'<circle cx="780" cy="840" r="40" fill="{C.NAVY}" {C.st(6)}/><circle cx="730" cy="790" r="10" fill="#F2C14E" {C.st(4)}/>'
    # 出杯口（下侧缺口）
    b += f'<rect x="300" y="950" width="300" height="70" rx="14" fill="{C.CREAM}" {C.st(8)}/>'
    return b
save('S07-吧台俯视图', s07())


# S08 第四个人在偷懒吗
def s08():
    b = place(staff_by_n(4, 'busy', 'hmm'), 420, 520, 1.05)
    b += counter_seg(0, 820, W)
    b += cup_row(820, 665, 6, 0.42)
    return b
save('S08-四号等封口', s08())


# S10 顾客视角：玻璃里忙乱，出杯口冷清
def s10():
    b = ''
    # 玻璃窗
    b += f'<rect x="240" y="60" width="1440" height="620" rx="20" fill="#F6E3B4" {C.st(10)}/>'
    b += f'<path d="M300 620 L720 120 M820 620 L1240 120" stroke="{C.CREAM}" stroke-width="40" stroke-linecap="round" opacity="0.55"/>'
    # 窗内吧台与 4 个店员
    b += f'<rect x="250" y="500" width="1420" height="170" fill="{C.TEAL}" {C.st(6)}/>'
    for i, x in enumerate([420, 620, 1000, 1200]):
        b += place(staff_by_n(i + 1, 'busy', 'flat'), x, 260, 0.62, flip=(i % 2 == 1))
    for (x, y) in [(400, 300), (700, 280), (1050, 300), (1300, 290), (900, 380)]:
        b += f'<path d="M{x} {y} q10 -16 20 0 M{x+30} {y-10} q10 -16 20 0" {C.st(6)}/>'
    b += place(C.sealer(True), 1400, 300, 0.5)
    # 玻璃外：出杯口台面，只有一杯
    b += counter_seg(240, 720, 1440, 200)
    b += place(C.cup('straw'), 880, 520, 0.5)
    return b
save('S10-顾客视角-忙不等于出杯', s10())


# S15 第五个人站着看
def s15():
    b = f'<ellipse cx="860" cy="1000" rx="1000" ry="120" fill="{C.TEAL}" opacity="0.35"/>'
    b += place(C.tree(), 40, 380, 0.9)
    b += place(C.tree(), 1620, 320, 1.0)
    # 第一组拉锯
    b += place(C.log_(), 420, 700, 0.9)
    b += place(C.saw(), 420, 520, 1.0)
    L1 = C.lumber_body(*C.LUMBER[0][1:], 'saw_right'); L2 = C.lumber_body(*C.LUMBER[1][1:], 'saw_left')
    b += place(L1, 180, 560, 0.95)
    b += place(L2, 700, 560, 0.95)
    # 第二组抬木头
    L3 = C.lumber_body(*C.LUMBER[2][1:], 'saw_right'); L4 = C.lumber_body(*C.LUMBER[3][1:], 'saw_left')
    b += place(L3, 940, 560, 0.95)
    b += place(C.log_(), 1080, 640, 0.7)
    b += place(L4, 1300, 560, 0.95)
    # 第五人远远站着抱树枝
    b += place(C.lumber_body(*C.LUMBER[4][1:], 'hold_twigs'), 1620, 600, 0.85)
    return b
save('S15-第五个人站着看', s15())


# S17 封口机"吃掉"杯子
def s17():
    b = place(staff_by_n(4, 'busy', 'o'), 100, 520, 1.05)
    b += counter_seg(0, 820, W)
    b += place(C.sealer(True), 760, 250, 1.6)
    # 嘴：压头下方的黑色开口 + 舌头
    b += f'<path d="M860 560 Q960 700 1060 560 Z" fill="{C.NAVY}" {C.st(8)}/>'
    b += f'<path d="M900 580 Q960 650 1020 580 Z" fill="{C.ORANGE}"/>'
    # 被吸进去的一列杯子（越近越小、略倾斜）
    for i in range(5):
        s = 0.5 - i * 0.07
        x = 420 + i * 120
        b += f'<g transform="rotate({-8*i} {x+100*s} {760})">{place(C.cup("sealed"), x, 820 - 380 * s, s)}</g>'
    for (x, y) in [(520, 640), (640, 600), (760, 560)]:
        b += f'<path d="M{x} {y} L{x+60} {y-20}" stroke="{C.ORANGE}" stroke-width="8" stroke-linecap="round" opacity="0.8"/>'
    return b
save('S17-封口机吃杯子', s17())


# S19 旧机 vs 新机
def s19():
    b = counter_seg(0, 820, 900)
    b += counter_seg(1020, 820, 900)
    b += place(C.sealer(False), 250, 365, 1.3)
    b += place(C.sealer(True, C.TEAL, double=True), 1150, 365, 1.3)
    b += f'<path d="M960 120 L960 1000" stroke="{C.NAVY}" stroke-width="8" stroke-dasharray="22 22" stroke-linecap="round"/>'
    return b
save('S19-旧机vs新机', s19())


# S20a 点单口空着，顾客张望
def s20a():
    b = f'<rect x="80" y="100" width="640" height="260" rx="16" fill="{C.NAVY}" {C.st(8)}/>'
    for i in range(3):
        b += f'<rect x="130" y="{150+i*60}" width="{300 if i%2 else 400}" height="22" rx="8" fill="{C.CREAM}" opacity="0.6"/>'
    b += counter_seg(0, 600, 900, 480)
    b += f'<rect x="300" y="470" width="220" height="140" rx="12" fill="{C.NAVY}" {C.st(8)}/>'  # 收银机，后面没人
    # 顾客在台前伸头张望（侧面剪影，身体前倾）
    b += f'<g transform="rotate(-10 400 900)">{place(C.silhouette("phone"), 300, 560, 1.0)}</g>'
    b += f'<g transform="rotate(-8 700 950)">{place(C.silhouette("backpack"), 560, 600, 0.95, flip=True)}</g>'
    b += f'<path d="M560 420 q10 -30 40 -20 M600 390 q10 -30 40 -20" {C.st(6)}/>'
    return b
save('S20a-点单口没人', s20a())


# S20b 封口机前排着杯子，店员拿杯等
def s20b():
    b = place(staff_by_n(2, 'busy', 'flat'), 1060, 330, 0.9, flip=True)
    b += place(staff_by_n(4, 'busy', 'hmm'), 1300, 330, 0.9, flip=True)
    b += counter_seg(1020, 600, 900, 480)
    b += place(C.sealer(True), 1500, 260, 0.95)
    b += cup_row(1080, 468, 6, 0.36)
    return b
save('S20b-封口机前排队', s20b())


# S22 金句氛围图：大留白，远处一条小队伍 + 一台在响的封口机
def s22():
    b = ground(960)
    kinds = ['backpack', 'phone', 'hat', 'bag']
    for i in range(7):
        b += place(C.silhouette(kinds[i % 4]), 120 + i * 62, 960 - 380 * 0.36, 0.36, flip=(i % 3 == 0))
    b += place(C.sealer(True), 1560, 960 - 380 * 0.55 - 10, 0.55)
    b += sound_arcs(1560 + 400 * 0.55 + 10, 960 - 380 * 0.55 + 60, r=36, n=3)
    b += f'<g transform="translate({2*(1560-10)} 0) scale(-1 1)">{sound_arcs(1560 - 10, 960 - 380 * 0.55 + 60, r=36, n=3)}</g>'
    return b
save('S22-金句氛围图', s22())

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
