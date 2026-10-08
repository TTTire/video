# -*- coding: utf-8 -*-
"""
第 6 期（边际报酬递减）扁平插画元素生成器。
统一调色 / 线宽 / 头身比，由代码保证风格一致。输出到 ../elements/*.svg，并生成 preview.html 供截图检查。
"""
import os, math

OUT = os.path.join(os.path.dirname(__file__), '..', 'elements')
os.makedirs(OUT, exist_ok=True)

# ---- 调色 ----
CREAM = '#F4EFE6'
NAVY = '#1F2A44'
ORANGE = '#D9713F'
TEAL = '#8FBFB0'
SKIN = '#F3D2B3'
SKIN2 = '#E2B48F'
TAN = '#E7DBC7'      # 纸色 / 杯子高光
GRAY = '#9A9AA3'
DARKTEAL = '#5E9A8B'
LIGHTNAVY = '#3B4C70'
WOOD = '#C98B5A'
WOODDARK = '#8E5B35'
PINE = '#5E9A8B'
PINEDARK = '#3F7A6C'
SW = 7  # 线宽

def st(w=SW):
    return f'stroke="{NAVY}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"'

STYLE = st()


def svg(body, w=400, h=400, name=None):
    s = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" fill="none">\n{body}\n</svg>\n'
    if name:
        with open(os.path.join(OUT, name + '.svg'), 'w', encoding='utf-8') as f:
            f.write(s)
    return s


def g(body, **attrs):
    a = ' '.join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<g {a}>{body}</g>'


# ---------- 人物基础件 ----------
# 头身比约 1:4：头直径 ~90，总高 ~380（画布 400）

HAIRS = {
    'bob':   lambda c: f'<path d="M152 92 C150 40 250 40 248 92 L248 120 Q236 100 232 78 Q200 70 168 78 Q164 100 152 120 Z" fill="{c}" {STYLE}/>',
    'short': lambda c: f'<path d="M153 88 C156 42 244 42 247 88 Q230 62 200 64 Q170 62 153 88 Z" fill="{c}" {STYLE}/>',
    'bun':   lambda c: f'<circle cx="200" cy="40" r="20" fill="{c}" {STYLE}/><path d="M153 88 C156 42 244 42 247 88 Q232 66 200 66 Q168 66 153 88 Z" fill="{c}" {STYLE}/>',
    'cap':   lambda c: f'<path d="M150 84 C154 40 246 40 250 84 Z" fill="{c}" {STYLE}/><path d="M146 86 L270 86 L270 98 L146 98 Z" fill="{c}" {STYLE}/>',
    'side':  lambda c: f'<path d="M152 92 C150 40 250 40 248 92 L254 128 Q244 108 236 80 Q200 70 160 84 Q156 100 152 118 Z" fill="{c}" {STYLE}/>',
    'grayold': lambda c: f'<path d="M156 84 C158 50 242 50 244 84 Q226 66 200 68 Q174 66 156 84 Z" fill="{c}" {STYLE}/>',
    'beanie': lambda c: f'<path d="M150 90 C152 40 248 40 250 90 Z" fill="{c}" {STYLE}/><rect x="146" y="80" width="108" height="22" rx="8" fill="{c}" {STYLE}/><circle cx="200" cy="40" r="12" fill="{c}" {STYLE}/>',
}


def head(hair='short', hair_color=NAVY, skin=SKIN, face='smile', cx=200, cy=90):
    r = 44
    out = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{skin}" {STYLE}/>'
    out += HAIRS[hair](hair_color)
    # 眼睛
    out += f'<circle cx="{cx-15}" cy="{cy+6}" r="4" fill="{NAVY}"/><circle cx="{cx+15}" cy="{cy+6}" r="4" fill="{NAVY}"/>'
    if face == 'smile':
        out += f'<path d="M{cx-10} {cy+24} Q{cx} {cy+32} {cx+10} {cy+24}" {st(4)}/>'
    elif face == 'flat':
        out += f'<path d="M{cx-9} {cy+26} L{cx+9} {cy+26}" {st(4)}/>'
    elif face == 'o':
        out += f'<circle cx="{cx}" cy="{cy+26}" r="5" fill="{NAVY}"/>'
    elif face == 'hmm':
        out += f'<path d="M{cx-10} {cy+28} Q{cx} {cy+20} {cx+10} {cy+28}" {st(4)}/>'
    return out


def arm(x1, y1, x2, y2, sleeve, skin=SKIN, w=24):
    """手臂：粗线 + 手掌圆"""
    return (f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{NAVY}" stroke-width="{w+2*SW/2+2}" stroke-linecap="round"/>'
            f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{sleeve}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<circle cx="{x2}" cy="{y2}" r="14" fill="{skin}" {STYLE}/>')


def arm_bent(x1, y1, xm, ym, x2, y2, sleeve, skin=SKIN, w=24):
    d = f'M{x1} {y1} L{xm} {ym} L{x2} {y2}'
    return (f'<path d="{d}" stroke="{NAVY}" stroke-width="{w+SW+2}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<path d="{d}" stroke="{sleeve}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{x2}" cy="{y2}" r="14" fill="{skin}" {STYLE}/>')


def legs(color=NAVY, shoe=NAVY, x=200, y=280, split=22):
    return (f'<rect x="{x-split-20}" y="{y}" width="40" height="78" rx="12" fill="{color}" {STYLE}/>'
            f'<rect x="{x+split-20}" y="{y}" width="40" height="78" rx="12" fill="{color}" {STYLE}/>'
            f'<rect x="{x-split-26}" y="{y+68}" width="52" height="22" rx="10" fill="{shoe}" {STYLE}/>'
            f'<rect x="{x+split-26}" y="{y+68}" width="52" height="22" rx="10" fill="{shoe}" {STYLE}/>')


def torso(shirt, apron=None, x=200, y=140, w=124, h=150):
    out = f'<rect x="{x-w/2}" y="{y}" width="{w}" height="{h}" rx="38" fill="{shirt}" {STYLE}/>'
    if apron:
        out += (f'<path d="M{x-28} {y+14} L{x-28} {y+40} M{x+28} {y+14} L{x+28} {y+40}" {STYLE}/>'
                f'<rect x="{x-32}" y="{y+40}" width="64" height="{h-40}" rx="10" fill="{apron}" {STYLE}/>'
                f'<path d="M{x-20} {y+34} Q{x} {y+16} {x+20} {y+34}" {STYLE} fill="none"/>')
    return out


# ---------- E01 奶茶杯 ----------
def cup(state='full', scale=1.0, x=0, y=0):
    """state: empty / sealed / straw"""
    body = (f'<path d="M110 110 L130 350 Q131 368 150 368 L250 368 Q269 368 270 350 L290 110 Z" fill="{TEAL}" {STYLE}/>'
            f'<path d="M126 110 L144 350" stroke="{TAN}" stroke-width="12" stroke-linecap="round" opacity="0.7"/>')
    if state != 'empty':
        # 奶茶液面 + 珍珠
        body += f'<path d="M118 190 L282 190 L270 350 Q269 368 250 368 L150 368 Q131 368 130 350 Z" fill="{WOOD}" {STYLE}/>'
        body += f'<path d="M134 190 L148 350" stroke="{TAN}" stroke-width="12" stroke-linecap="round" opacity="0.6"/>'
        for px, py in [(165, 335), (195, 345), (225, 332), (180, 310), (215, 312)]:
            body += f'<circle cx="{px}" cy="{py}" r="11" fill="{NAVY}"/>'
    # 杯口 / 封膜
    if state == 'empty':
        body += f'<ellipse cx="200" cy="110" rx="90" ry="14" fill="{TAN}" {STYLE}/>'
    else:
        body += f'<rect x="104" y="98" width="192" height="22" rx="10" fill="{TAN}" {STYLE}/>'
    if state == 'straw':
        body += (f'<path d="M212 98 L236 20" stroke="{NAVY}" stroke-width="{18+SW}" stroke-linecap="round"/>'
                 f'<path d="M212 98 L236 20" stroke="{ORANGE}" stroke-width="18" stroke-linecap="round"/>')
    return g(body, transform=f'translate({x} {y}) scale({scale})')


svg(cup('empty'), name='E01a-奶茶杯-空')
svg(cup('sealed'), name='E01b-奶茶杯-封口')
svg(cup('straw'), name='E01c-奶茶杯-成品')


# ---------- E02 店员 ×5 ----------
STAFF = [
    # 编号, 衬衫色, 围裙色, 发型, 发色, 肤色
    (1, LIGHTNAVY, TAN, 'short', NAVY, SKIN),
    (2, TEAL, NAVY, 'bob', NAVY, SKIN2),
    (3, NAVY, TAN, 'bun', NAVY, SKIN),
    (4, ORANGE, NAVY, 'side', NAVY, SKIN),   # 主角
    (5, GRAY, TAN, 'cap', NAVY, SKIN2),
]


def staff_front(shirt, apron, hair, hair_c, skin, face='smile'):
    b = legs()
    b += torso(shirt, apron)
    b += arm(150, 168, 118, 262, shirt, skin)
    b += arm(250, 168, 282, 262, shirt, skin)
    b += head(hair, hair_c, skin, face)
    return b


def staff_busy(shirt, apron, hair, hair_c, skin, face='flat'):
    """侧身忙碌：身体略窄，一只手向前端杯"""
    b = legs(x=200)
    b += torso(shirt, apron, w=104)
    b += arm(158, 170, 128, 250, shirt, skin)
    b += arm_bent(242, 170, 300, 210, 318, 176, shirt, skin)
    b += cup('sealed', scale=0.22, x=290, y=104)
    b += head(hair, hair_c, skin, face, cx=206)
    return b


for n, shirt, apron, hair, hc, skin in STAFF:
    face = 'smile' if n != 4 else 'flat'
    svg(staff_front(shirt, apron, hair, hc, skin, face), name=f'E02-店员{n}-正面')
    svg(staff_busy(shirt, apron, hair, hc, skin), name=f'E02-店员{n}-忙碌')
# 4 号的两个特殊表情：无辜 / 无奈等
svg(staff_front(ORANGE, NAVY, 'side', NAVY, SKIN, 'o'), name='E02-店员4-无辜')
svg(staff_front(ORANGE, NAVY, 'side', NAVY, SKIN, 'hmm'), name='E02-店员4-无奈')


# ---------- E03 封口机 ----------
def sealer(light=False, color=ORANGE, double=False):
    w = 300 if double else 200
    x0 = 200 - w / 2
    b = ''
    # 底座
    b += f'<rect x="{x0}" y="300" width="{w}" height="60" rx="14" fill="{color}" {STYLE}/>'
    # 立柱 + 机头
    b += f'<rect x="{x0 + w - 70}" y="90" width="60" height="220" rx="12" fill="{color}" {STYLE}/>'
    b += f'<rect x="{x0}" y="70" width="{w}" height="70" rx="18" fill="{color}" {STYLE}/>'
    # 压头
    heads = [x0 + 70] if not double else [x0 + 60, x0 + 160]
    for hx in heads:
        b += f'<rect x="{hx - 40}" y="138" width="80" height="34" rx="8" fill="{NAVY}" {STYLE}/>'
        b += f'<rect x="{hx - 24}" y="172" width="48" height="14" rx="5" fill="{TAN}" {STYLE}/>'
        # 杯槽里的杯子
        b += cup('sealed', scale=0.26, x=hx - 52, y=200)
    # 拉杆
    b += f'<path d="M{x0 + w - 40} 90 L{x0 + w + 30} 40" stroke="{NAVY}" stroke-width="{SW+10}" stroke-linecap="round"/>'
    b += f'<path d="M{x0 + w - 40} 90 L{x0 + w + 30} 40" stroke="{TAN}" stroke-width="10" stroke-linecap="round"/>'
    b += f'<circle cx="{x0 + w + 30}" cy="40" r="16" fill="{NAVY}" {STYLE}/>'
    # 面板按钮
    b += f'<rect x="{x0 + w - 56}" y="200" width="32" height="60" rx="8" fill="{TAN}" {STYLE}/>'
    # 指示灯
    lc = '#F2C14E' if light else TAN
    b += f'<circle cx="{x0 + 34}" cy="105" r="13" fill="{lc}" {STYLE}/>'
    if light:
        for a in range(0, 360, 45):
            r1, r2 = 20, 32
            x1 = x0 + 34 + r1 * math.cos(math.radians(a)); y1 = 105 + r1 * math.sin(math.radians(a))
            x2 = x0 + 34 + r2 * math.cos(math.radians(a)); y2 = 105 + r2 * math.sin(math.radians(a))
            b += f'<path d="M{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f}" stroke="#F2C14E" stroke-width="5" stroke-linecap="round"/>'
    return b


svg(sealer(False), name='E03a-封口机')
svg(sealer(True), name='E03b-封口机-工作中')
svg(sealer(True, TEAL, double=True), name='E03c-新封口机-双头')


# ---------- E04 老板 ----------
def boss(pose='wave'):
    skin = SKIN
    b = legs(color=LIGHTNAVY)
    # 外套 + 内里围裙
    b += torso(TAN, None)
    b += f'<rect x="168" y="150" width="64" height="140" rx="10" fill="{NAVY}" {STYLE}/>'
    b += f'<path d="M138 140 L170 150 L170 290 M262 140 L230 150 L230 290" {STYLE} fill="none"/>'
    if pose == 'wave':
        b += arm(150, 168, 118, 262, TAN, skin)
        b += arm_bent(250, 168, 300, 150, 300, 70, TAN, skin)
    else:  # scratch
        b += arm(150, 168, 118, 262, TAN, skin)
        b += arm_bent(250, 168, 310, 150, 252, 60, TAN, skin)
    b += head('grayold', GRAY, skin, 'smile' if pose == 'wave' else 'hmm')
    # 胡子
    b += f'<path d="M184 110 Q200 118 216 110" stroke="{GRAY}" stroke-width="7" stroke-linecap="round" fill="none"/>'
    return b


svg(boss('wave'), name='E04a-老板-招手')
svg(boss('scratch'), name='E04b-老板-挠头')


# ---------- E05 顾客剪影 ×4 ----------
def silhouette(kind):
    c = NAVY
    b = legs(color=c, shoe=c)
    b += f'<rect x="138" y="140" width="124" height="150" rx="38" fill="{c}"/>'
    b += f'<circle cx="200" cy="90" r="44" fill="{c}"/>'
    if kind == 'backpack':
        b += f'<rect x="250" y="150" width="46" height="110" rx="18" fill="{c}"/>'
        b += arm(150, 168, 118, 262, c, c); b += arm(250, 168, 272, 262, c, c)
    elif kind == 'phone':
        b += arm(150, 168, 118, 262, c, c)
        b += arm_bent(250, 168, 290, 200, 240, 170, c, c)
        b += f'<rect x="226" y="150" width="30" height="46" rx="6" fill="{c}"/>'
        b += f'<path d="M158 88 C160 40 240 40 242 88 Z" fill="{c}"/>'
    elif kind == 'hat':
        b += f'<path d="M146 92 L254 92 L254 80 L240 80 L240 50 L160 50 L160 80 L146 80 Z" fill="{c}"/>'
        b += arm(150, 168, 118, 262, c, c); b += arm(250, 168, 282, 262, c, c)
    elif kind == 'bag':
        b += arm(150, 168, 118, 262, c, c); b += arm(250, 168, 282, 262, c, c)
        b += f'<path d="M268 262 L300 262 L306 330 L262 330 Z" fill="{c}"/>'
        b += f'<path d="M278 262 Q284 240 290 262" stroke="{c}" stroke-width="6" fill="none"/>'
        b += f'<circle cx="200" cy="48" r="16" fill="{c}"/>'
    return b


for k in ['backpack', 'phone', 'hat', 'bag']:
    svg(silhouette(k), name=f'E05-顾客剪影-{k}')


# ---------- E06 伐木工 ×5 / E07 双人锯 / E08 树 ----------
PLAID = f'''<defs><pattern id="plaid" width="24" height="24" patternUnits="userSpaceOnUse">
<rect width="24" height="24" fill="{ORANGE}"/><rect width="24" height="8" fill="{WOODDARK}" opacity="0.55"/><rect width="8" height="24" fill="{WOODDARK}" opacity="0.55"/></pattern>
<pattern id="plaid2" width="24" height="24" patternUnits="userSpaceOnUse">
<rect width="24" height="24" fill="{TEAL}"/><rect width="24" height="8" fill="{NAVY}" opacity="0.45"/><rect width="8" height="24" fill="{NAVY}" opacity="0.45"/></pattern>
<pattern id="plaid3" width="24" height="24" patternUnits="userSpaceOnUse">
<rect width="24" height="24" fill="{GRAY}"/><rect width="24" height="8" fill="{NAVY}" opacity="0.35"/><rect width="8" height="24" fill="{NAVY}" opacity="0.35"/></pattern></defs>'''

LUMBER = [
    (1, 'url(#plaid)', NAVY, 'beanie', NAVY, SKIN),
    (2, 'url(#plaid2)', NAVY, 'short', NAVY, SKIN2),
    (3, 'url(#plaid)', LIGHTNAVY, 'cap', WOODDARK, SKIN),
    (4, 'url(#plaid2)', LIGHTNAVY, 'bun', NAVY, SKIN2),
    (5, 'url(#plaid3)', NAVY, 'beanie', GRAY, SKIN),
]


def lumber_body(shirt, overall, hair, hc, skin, pose, face='smile'):
    b = PLAID
    if pose == 'saw_left' or pose == 'saw_right':
        # 弓步拉锯：手臂向一侧伸直
        dirn = -1 if pose == 'saw_left' else 1
        b += legs(color=overall)
        b += torso(shirt)
        b += f'<rect x="168" y="190" width="64" height="100" rx="10" fill="{overall}" {STYLE}/>'
        b += f'<path d="M176 190 L176 150 M224 190 L224 150" {st(10)}/>'
        hx = 200 + dirn * 120
        b += arm(200 - dirn * 50, 168, hx, 236, shirt, skin)
        b += arm(200 + dirn * 50, 168, hx + dirn * 18, 262, shirt, skin)
        b += head(hair, hc, skin, face)
    elif pose == 'stand':
        b += legs(color=overall)
        b += torso(shirt)
        b += f'<rect x="168" y="190" width="64" height="100" rx="10" fill="{overall}" {STYLE}/>'
        b += f'<path d="M176 190 L176 150 M224 190 L224 150" {st(10)}/>'
        b += arm(150, 168, 118, 262, shirt, skin)
        b += arm(250, 168, 282, 262, shirt, skin)
        b += head(hair, hc, skin, face)
    elif pose == 'hold_twigs':
        b += legs(color=overall)
        b += torso(shirt)
        b += f'<rect x="168" y="190" width="64" height="100" rx="10" fill="{overall}" {STYLE}/>'
        b += f'<path d="M176 190 L176 150 M224 190 L224 150" {st(10)}/>'
        # 抱着一捆树枝
        b += arm_bent(150, 168, 120, 230, 150, 250, shirt, skin)
        b += arm_bent(250, 168, 280, 230, 250, 250, shirt, skin)
        for i, (dx, dy) in enumerate([(-30, -10), (0, -18), (30, -8), (-15, 4), (15, 6)]):
            b += f'<path d="M{200+dx-40} {236+dy} L{200+dx+40} {236+dy-20}" stroke="{WOODDARK}" stroke-width="10" stroke-linecap="round"/>'
        b += f'<path d="M150 232 Q200 262 250 232" stroke="{NAVY}" stroke-width="8" fill="none" stroke-linecap="round"/>'
        b += head(hair, hc, skin, 'o')
    return b


for n, shirt, ov, hair, hc, skin in LUMBER:
    if n < 5:
        svg(lumber_body(shirt, ov, hair, hc, skin, 'saw_left'), name=f'E06-伐木工{n}-拉锯-左')
        svg(lumber_body(shirt, ov, hair, hc, skin, 'saw_right'), name=f'E06-伐木工{n}-拉锯-右')
    svg(lumber_body(shirt, ov, hair, hc, skin, 'stand'), name=f'E06-伐木工{n}-站立')
svg(lumber_body('url(#plaid3)', NAVY, 'beanie', GRAY, SKIN, 'hold_twigs'), name='E06-伐木工5-抱树枝')


def saw():
    b = f'<path d="M40 190 L360 190 L360 230 L340 212 L320 230 L300 212 L280 230 L260 212 L240 230 L220 212 L200 230 L180 212 L160 230 L140 212 L120 230 L100 212 L80 230 L60 212 L40 230 Z" fill="{TAN}" {STYLE}/>'
    for hx in (40, 360):
        b += f'<rect x="{hx-14}" y="130" width="28" height="60" rx="10" fill="{WOOD}" {STYLE}/>'
        b += f'<rect x="{hx-10}" y="118" width="20" height="16" rx="6" fill="{NAVY}" {STYLE}/>'
    return b


svg(saw(), name='E07-双人锯')


def tree():
    b = f'<rect x="178" y="270" width="44" height="90" rx="10" fill="{WOOD}" {STYLE}/>'
    for i, (w, y) in enumerate([(240, 300), (200, 220), (150, 140)]):
        c = PINE if i % 2 == 0 else PINEDARK
        b += f'<path d="M{200-w/2} {y} L200 {y-130} L{200+w/2} {y} Z" fill="{c}" {STYLE}/>'
    return b


def log_():
    b = f'<rect x="60" y="150" width="280" height="100" rx="50" fill="{WOOD}" {STYLE}/>'
    b += f'<ellipse cx="300" cy="200" rx="40" ry="50" fill="{TAN}" {STYLE}/>'
    b += f'<ellipse cx="300" cy="200" rx="22" ry="28" fill="none" {st(4)}/>'
    b += f'<ellipse cx="300" cy="200" rx="8" ry="10" fill="{WOODDARK}"/>'
    b += f'<path d="M90 180 L200 180 M110 220 L220 220" stroke="{WOODDARK}" stroke-width="6" stroke-linecap="round"/>'
    return b


svg(tree(), name='E08a-松树')
svg(log_(), name='E08b-原木')


# ---------- E09 价签 / E10 时钟 / E11 小票 / E12 思考泡 ----------
def pricetag():
    b = f'<path d="M110 60 L290 60 L340 200 L290 340 L110 340 L60 200 Z" fill="{ORANGE}" {STYLE} transform="rotate(-18 200 200)"/>'
    b += f'<circle cx="200" cy="105" r="16" fill="{CREAM}" {STYLE} transform="rotate(-18 200 200)"/>'
    b += f'<path d="M200 90 Q196 40 230 30" {STYLE} fill="none" transform="rotate(-18 200 200)"/>'
    return b


def clock():
    b = f'<circle cx="200" cy="200" r="150" fill="{TAN}" {STYLE}/>'
    b += f'<circle cx="200" cy="200" r="130" fill="{CREAM}" {st(4)}/>'
    for i in range(12):
        a = math.radians(i * 30)
        r1 = 118 if i % 3 else 104
        x1 = 200 + r1 * math.sin(a); y1 = 200 - r1 * math.cos(a)
        x2 = 200 + 124 * math.sin(a); y2 = 200 - 124 * math.cos(a)
        b += f'<path d="M{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f}" stroke="{NAVY}" stroke-width="{8 if i%3==0 else 5}" stroke-linecap="round"/>'
    b += f'<circle cx="200" cy="200" r="10" fill="{ORANGE}" {STYLE}/>'
    return b


def receipt():
    b = f'<path d="M110 40 L290 40 L290 360 L265 340 L240 360 L215 340 L190 360 L165 340 L140 360 L110 340 Z" fill="{CREAM}" {STYLE}/>'
    for y in (100, 140, 180, 220):
        b += f'<path d="M140 {y} L200 {y} M240 {y} L260 {y}" stroke="{NAVY}" stroke-width="8" stroke-linecap="round" opacity="0.5"/>'
    b += f'<path d="M140 270 L260 270" stroke="{NAVY}" stroke-width="5" stroke-dasharray="10 10"/>'
    b += f'<path d="M140 305 L190 305 M230 305 L260 305" stroke="{ORANGE}" stroke-width="10" stroke-linecap="round"/>'
    return b


def thought():
    b = f'<ellipse cx="220" cy="150" rx="150" ry="100" fill="{CREAM}" {STYLE}/>'
    b += f'<circle cx="110" cy="280" r="26" fill="{CREAM}" {STYLE}/><circle cx="70" cy="340" r="14" fill="{CREAM}" {STYLE}/>'
    return b


svg(pricetag(), name='E09-价签')
svg(clock(), name='E10-时钟')
svg(receipt(), name='E11-小票')
svg(thought(), name='E12-思考泡')


# ---------- E13 举手的人 / E14 举臂加油 ----------
def raise_hand():
    b = legs()
    b += torso(TEAL)
    b += arm(150, 168, 118, 262, TEAL)
    b += arm_bent(250, 168, 290, 120, 280, 40, TEAL)
    b += head('bob', NAVY, SKIN, 'o')
    return b


def flex():
    b = legs()
    b += torso(ORANGE)
    b += arm_bent(150, 168, 90, 150, 110, 60, ORANGE)
    b += arm_bent(250, 168, 310, 150, 290, 60, ORANGE)
    b += head('short', NAVY, SKIN, 'smile')
    return b


svg(raise_hand(), name='E13-举手')
svg(flex(), name='E14-举臂加油')


# ---------- 预览页 ----------
files = sorted(f for f in os.listdir(OUT) if f.endswith('.svg'))
cells = ''.join(f'<figure><img src="../elements/{f}"><figcaption>{f[:-4]}</figcaption></figure>' for f in files)
html = f'''<!doctype html><meta charset="utf-8"><style>
body{{background:{CREAM};margin:0;padding:24px;font-family:"Microsoft YaHei",sans-serif;color:{NAVY}}}
.grid{{display:grid;grid-template-columns:repeat(8,1fr);gap:18px}}
figure{{margin:0;text-align:center}} img{{width:100%;aspect-ratio:1;display:block;background:#fff8;border-radius:12px}}
figcaption{{font-size:12px;margin-top:4px}}
</style><div class="grid">{cells}</div>'''
with open(os.path.join(os.path.dirname(__file__), 'preview.html'), 'w', encoding='utf-8') as f:
    f.write(html)
print(len(files), 'svg files')
