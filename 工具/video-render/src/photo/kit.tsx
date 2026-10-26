// 照片铺底风格的公共元件：主题、字体、照片底、文字、标签、面板、聚光、响声圈、时钟。
// 第 6 期 photo.tsx 和通用引擎 engine.tsx 都用这一套，保证每期长得像同一个栏目。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, interpolate, useCurrentFrame} from 'remotion';
import {Theme, useC} from '../ui';
import {FlyIn} from '../fx';
import smileyWoff2 from '../../assets/fonts/SmileySans-Oblique.ttf.woff2';
import wenkaiWoff2 from '../../assets/fonts/LXGWWenKai-Medium.woff2';
import jinshuWoff2 from '../../assets/fonts/ChillJinshuSong-Heavy.woff2';
import alimamaWoff2 from '../../assets/fonts/AlimamaShuHeiTi-Bold.woff2';
import notoRegularWoff2 from '../../assets/fonts/NotoSansSC-Regular.woff2';
import notoBoldWoff2 from '../../assets/fonts/NotoSansSC-Bold.woff2';

// ---------- 字体（全部打包在 assets/fonts/，都是免费商用：OFL / 阿里免费商用授权） ----------
// 五款字体各管一个岗位，一期之内不要再加：
//   得意黑   场景标题 h、章节卡、栏目名（频道识别，不随期换）
//   数黑体   所有数字：big / count / nums、角标期号
//   锦书宋   定义卡的大词（font: "song"），一期只出现一两次
//   文楷     对白、人说的话（quote: true）、角标里的"像素呼吸"
//   思源黑   小字 t / tag / panel / 字幕（替掉微软雅黑，跨机器一致）
export const FONTS = {
  title: '"Smiley","NotoSansSC","PingFang SC","Microsoft YaHei",sans-serif',
  num: '"Alimama","Smiley","NotoSansSC",sans-serif',
  song: '"Jinshu","Noto Serif SC","Source Han Serif SC",serif',
  kai: '"WenKai","Jinshu","NotoSansSC",serif',
  sans: '"NotoSansSC","PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif',
};
export type FontKey = keyof typeof FONTS;

// ---------- 主题 ----------
// 暖黑底 + 陶土橙强调 + 米白字；dim 是次要文字，teal 表示"正常/增长"，coral 表示"问题/瓶颈"
export const PHOTO_THEME: Theme = {
  bg: '#0B0907', bg2: '#1A1410', gold: '#E07B45', white: '#F4EFE6', dim: '#CFC4B6',
  coral: '#E85D3A', teal: '#8FBFB0', font: FONTS.sans,
};
// 标题字体：默认得意黑。style.titleFont 这个开关保留，只在用户明确要求时用
export const TITLE_FONT = FONTS.title;
export const TITLE_FONTS: Record<string, string> = {
  smiley: FONTS.title,   // 得意黑：斜体无衬线，轻快、有速度感（默认，不随期换）
  song: FONTS.song,      // 寒蝉锦书宋 Heavy：端庄、有分量；平时只给定义卡大词用
  kai: FONTS.kai,        // 霞鹜文楷 Medium：手写楷感；平时只给对白用
  hei: FONTS.sans,       // 思源黑体 Bold：中性
  serif: FONTS.song,     // 兼容旧写法
};

// 加载全部字体（在合成根部调用一次）
const FACES: [string, string, FontFaceDescriptors?][] = [
  ['Smiley', smileyWoff2], ['WenKai', wenkaiWoff2], ['Jinshu', jinshuWoff2], ['Alimama', alimamaWoff2],
  ['NotoSansSC', notoRegularWoff2, {weight: '400'}], ['NotoSansSC', notoBoldWoff2, {weight: '700'}],
];
export const useFonts = () => {
  const [h] = useState(() => delayRender('load fonts'));
  useEffect(() => {
    Promise.all(FACES.map(([name, url, desc]) => new FontFace(name, `url(${url}) format('woff2')`, desc).load().then((f) => document.fonts.add(f)).catch(() => undefined)))
      .then(() => continueRender(h));
  }, [h]);
};
export const useTitleFont = useFonts;

export type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
export const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const SHADOW = '0 4px 28px #000D, 0 1px 4px #000A';

// ---------- 照片底：缓慢推拉 + 文字侧压暗 ----------
export type Grad = 'left' | 'right' | 'top' | 'bottom' | 'none' | 'all';
export const Photo: React.FC<{
  src: string; dur: number; zoom?: [number, number]; origin?: string; grad?: Grad; dim?: number; blur?: number; opacity?: number; pos?: string; tint?: string; tintOpacity?: number;
}> = ({src, dur, zoom = [1.02, 1.1], origin = '50% 50%', grad = 'none', dim = 0, blur = 0, opacity = 1, pos = 'center', tint, tintOpacity = 0.35}) => {
  const C = useC();
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], zoom, clamp);
  const B = C.bg; // 压暗色跟主题走
  const g: Record<Grad, string> = {
    none: 'none',
    left: `linear-gradient(90deg, ${B}E6 0%, ${B}B3 38%, ${B}00 62%)`,
    right: `linear-gradient(270deg, ${B}E6 0%, ${B}B3 38%, ${B}00 62%)`,
    top: `linear-gradient(180deg, ${B}E0 0%, ${B}99 32%, ${B}00 58%)`,
    bottom: `linear-gradient(0deg, ${B}E0 0%, ${B}99 32%, ${B}00 58%)`,
    all: `${B}B8`,
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${z})`, transformOrigin: origin, filter: blur ? `blur(${blur}px)` : undefined}} />
      {tint && <AbsoluteFill style={{background: tint, opacity: tintOpacity, mixBlendMode: 'color'}} />}
      {dim > 0 && <AbsoluteFill style={{background: B, opacity: dim}} />}
      {grad !== 'none' && <AbsoluteFill style={{background: g[grad]}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, #00000099 100%)'}} />
    </AbsoluteFill>
  );
};

// 聚光：把 (x,y) 以外压暗
export const Spot: React.FC<{x: number; y: number; r?: number; at: number; strength?: number}> = ({x, y, r = 260, at: a, strength = 0.72}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 24], [0, strength], clamp);
  return <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 320}px)`, opacity: o}} />;
};

// 响声圈：从 (x,y) 一圈圈扩散
export const Rings: React.FC<{x: number; y: number; at: number; color?: string; n?: number; max?: number}> = ({x, y, at: a, color, n = 3, max = 360}) => {
  const C = useC();
  const f = useCurrentFrame();
  if (f < a) return null;
  return (
    <>
      {Array.from({length: n}).map((_, i) => {
        const k = (((f - a) + i * 18) % 54) / 54;
        const d = 60 + k * max;
        return <div key={i} style={{position: 'absolute', left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: '50%', border: `5px solid ${color ?? C.gold}`, opacity: (1 - k) * 0.75}} />;
      })}
    </>
  );
};

// ---------- 卡片 ----------
// 卡片是 box 的一层壳：box 里写了 card，字自动套上这张卡，不用每个场景自己摆像素。
// 宽度走栅格：主卡 900（对齐 L 列），数字卡 780，四张卡左边缘都在 box.x 上，右边缘因此也是齐的。
export type CardKind = 'solid' | 'paper' | 'notch' | 'tab';
export const CardCtx = React.createContext<{kind?: CardKind}>({});

export const INK = '#1A0E06';          // 浅底卡上的主字色
export const INK_EM = '#7A2C0C';       // 浅底卡上的强调色（比金底深，压得住）
// 卡内卡外两套字色，元素默认色都从这里取，别再硬写 C.white
export const useInk = () => {
  const C = useC();
  const kind = React.useContext(CardCtx).kind;
  const light = kind === 'solid' || kind === 'paper';
  return {light, main: light ? INK : C.white, sub: light ? INK_EM : C.dim, em: light ? INK_EM : C.gold, shadow: light ? 'none' : SHADOW};
};
const CARD_GRID = {card: 900, num: 780};
export const cardWidth = (kind: CardKind | undefined, w?: number) => w ?? ((kind === 'tab' || kind === 'notch') ? CARD_GRID.card : CARD_GRID.card);

// ---------- 文字元件 ----------
// 卡里卡外两套字色：CardCtx 有值就是浅底卡（黑字、无投影），没值就是照片上（白字 + 投影）。
export const H: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; align?: 'left' | 'center' | 'right'}> = ({children, size = 92, color, style, align = 'left'}) => {
  const C = useC();
  const inCard = React.useContext(CardCtx).kind;
  const light = inCard === 'solid' || inCard === 'paper';
  return <div style={{fontFamily: C.title ?? TITLE_FONT, fontWeight: 800, fontSize: size, color: color ?? (light ? INK : C.white), lineHeight: 1.18, textAlign: align, textShadow: light ? 'none' : SHADOW, letterSpacing: 1, ...style}}>{children}</div>;
};
export const T: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; weight?: number}> = ({children, size = 40, color, style, weight = 700}) => {
  const C = useC();
  const inCard = React.useContext(CardCtx).kind;
  const light = inCard === 'solid' || inCard === 'paper';
  return <div style={{fontFamily: C.font, fontWeight: weight, fontSize: size, color: color ?? (light ? INK_EM : C.dim), lineHeight: 1.4, textShadow: light ? 'none' : SHADOW, ...style}}>{children}</div>;
};
export const Tag: React.FC<{children: React.ReactNode; color?: string; size?: number; dark?: boolean; style?: React.CSSProperties}> = ({children, color, size = 38, dark, style}) => {
  const C = useC();
  return <div style={{display: 'inline-block', fontFamily: C.font, fontWeight: 800, fontSize: size, color: dark ? C.white : C.bg, background: dark ? `${C.bg}CC` : (color ?? C.gold), border: dark ? `2px solid ${C.white}44` : 'none', borderRadius: 14, padding: '10px 28px', boxShadow: '0 10px 30px #0008', ...style}}>{children}</div>;
};
export const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const C = useC();
  return <div style={{background: `${C.bg}D0`, border: `1.5px solid ${C.white}2E`, borderRadius: 26, padding: '34px 44px', boxShadow: '0 30px 80px #000A', backdropFilter: 'blur(10px)', ...style}}>{children}</div>;
};

// ---------- 四种卡片 ----------
// 语义固定，别乱用：solid 结论/揭晓 · paper 原文/书/新闻 · notch 前提/定义/边界 · tab 一条数据/一个例子
export const SolidCard: React.FC<{label?: string; w?: number; children: React.ReactNode}> = ({label, w = CARD_GRID.card, children}) => {
  const C = useC();
  return (
    <div style={{width: w, boxSizing: 'border-box', background: C.gold, color: INK, borderRadius: 26, padding: '40px 56px 46px', boxShadow: '0 18px 0 #00000066, 0 40px 90px #000000AA'}}>
      {label && <div style={{fontFamily: C.font, fontWeight: 900, fontSize: 30, letterSpacing: 6, color: INK_EM, opacity: 0.75, marginBottom: 10}}>{label}</div>}
      {children}
    </div>
  );
};
export const PaperCard: React.FC<{w?: number; children: React.ReactNode}> = ({w = CARD_GRID.card, children}) => (
  <div style={{width: w, boxSizing: 'border-box', background: '#F2E8D8', color: '#1F1710', borderRadius: 6, padding: '46px 60px 50px', transform: 'rotate(-1.6deg)', boxShadow: '0 34px 80px #000000B0', backgroundImage: 'linear-gradient(180deg, #00000000 0%, #0000000A 100%)'}}>{children}</div>
);
export const NotchCard: React.FC<{label?: string; w?: number; children: React.ReactNode}> = ({label, w = CARD_GRID.card, children}) => {
  const C = useC();
  return (
    <div style={{position: 'relative', width: w, boxSizing: 'border-box', background: `${C.bg}E6`, borderRadius: 20, padding: '36px 56px 40px 78px', boxShadow: '0 30px 80px #000000AA', backdropFilter: 'blur(14px)', border: `1px solid ${C.white}14`, color: C.white}}>
      <div style={{position: 'absolute', left: 28, top: 36, bottom: 40, width: 10, borderRadius: 5, background: C.gold, boxShadow: `0 0 24px ${C.gold}AA`}} />
      {label && <div style={{fontFamily: C.font, fontWeight: 800, fontSize: 32, color: C.gold, letterSpacing: 5, marginBottom: 12}}>{label}</div>}
      {children}
    </div>
  );
};
// tab：上面挂分类签。签色只有两种 —— 中性信息（时间/地域/数据来源）用 dim 黑底白字，判断/结论用 gold；teal/coral 只留给正负对比。
export const TabCard: React.FC<{label: string; color?: string; w?: number; children: React.ReactNode}> = ({label, color, w = CARD_GRID.card, children}) => {
  const C = useC();
  // 签色允许写语义名（dim / gold / teal / coral），这里解析成真颜色
  const bg = color ? ((C as any)[color] ?? color) : C.dim;
  const fg = (color && (C as any)[color]) ? C.bg : C.bg;
  return (
    <div style={{width: w, boxSizing: 'border-box'}}>
      <div style={{display: 'inline-block', background: bg, color: fg, fontFamily: C.font, fontWeight: 900, fontSize: 32, letterSpacing: 4, padding: '10px 30px 14px', borderRadius: '16px 16px 0 0', position: 'relative', top: 4, boxShadow: '0 10px 30px #0008'}}>{label}</div>
      <div style={{background: `${C.bg}F0`, borderRadius: '0 20px 20px 20px', padding: '36px 52px 40px', boxShadow: '0 30px 80px #000000AA', backdropFilter: 'blur(14px)', border: `1px solid ${C.white}14`, color: C.white}}>{children}</div>
    </div>
  );
};
// 卡片壳：box / item 写了 card 时用它把内容包起来，并让里面的 H/T 自动切到卡内字色
export const CardShell: React.FC<{kind?: CardKind; label?: string; color?: string; w?: number; children: React.ReactNode}> = ({kind, label, color, w, children}) => {
  if (!kind) return <>{children}</>;
  const inner = (
    <CardCtx.Provider value={{kind: kind}}>
      {children}
    </CardCtx.Provider>
  );
  if (kind === 'solid') return <SolidCard label={label} w={w}>{inner}</SolidCard>;
  if (kind === 'paper') return <PaperCard w={w}>{inner}</PaperCard>;
  if (kind === 'notch') return <NotchCard label={label} w={w}>{inner}</NotchCard>;
  return <TabCard label={label ?? ''} color={color} w={w}>{inner}</TabCard>;
};
export const Box: React.FC<{x?: number; y?: number; w?: number; right?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, right, children, style}) => (
  <div style={{position: 'absolute', left: x, right, top: y, width: w, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start', ...style}}>{children}</div>
);
// 得意黑金句里的强调字
export const Em: React.FC<{children: React.ReactNode; color?: string}> = ({children, color}) => { const C = useC(); const light = React.useContext(CardCtx).kind; const inLight = light === 'solid' || light === 'paper'; return <span style={{color: color ?? (inLight ? INK_EM : C.gold)}}>{children}</span>; };
// 对白：文楷 + 金色引号。h / t / tag 加 quote: true 就走这个
export const Quote: React.FC<{children: React.ReactNode; size?: number; color?: string; align?: 'left' | 'center' | 'right'; style?: React.CSSProperties}> = ({children, size = 52, color, align = 'left', style}) => {
  const C = useC();
  return (
    <div style={{fontFamily: FONTS.kai, fontWeight: 500, fontSize: size, color: color ?? C.white, lineHeight: 1.4, textAlign: align, textShadow: SHADOW, letterSpacing: 1, ...style}}>
      <span style={{color: C.gold}}>“</span>{children}<span style={{color: C.gold}}>”</span>
    </div>
  );
};

// ---------- 画面区域（锚点）：photo.json 里 box / origin / spot / rings 可以直接写区域名，不用算像素 ----------
// 3 列 × 3 行，底部 y > 820 是字幕区不放字。W = 整行宽、居中。
//   TL  TC  TR     TW
//   ML  MC  MR     MW
//   BL  BC  BR     BW
export type BoxSpec = {x?: number; y?: number; w?: number; right?: number; bottom?: number; align?: 'left' | 'center' | 'right';
  // 卡片：这一组字装进哪种卡，标签和签色
  card?: CardKind; label?: string; tabColor?: string; cardW?: number;};
// 抖音右侧图标列（头像 / 点赞 / 评论 / 分享）会盖住横屏视频右边约 15% 的宽度：右边 300px 不放字、不放图表的关键部分。
// 右对齐的 R 列和 layout=right 母版都以 SAFE_RIGHT_X 为右边界；自定义图表里也用它。
export const SAFE_RIGHT = 300;
export const SAFE_RIGHT_X = 1920 - SAFE_RIGHT;   // 1620
const COLS: Record<string, Pick<BoxSpec, 'x' | 'w' | 'align'>> = {L: {x: 90, w: 900}, C: {x: 510, w: 900, align: 'center'}, R: {x: SAFE_RIGHT_X - 860, w: 860, align: 'right'}, W: {x: 90, w: 1740, align: 'center'}};
const ROWS: Record<string, Pick<BoxSpec, 'y' | 'bottom'>> = {T: {y: 120}, M: {y: 400}, B: {bottom: 270}};
export const REGIONS: Record<string, BoxSpec> = {};
Object.keys(ROWS).forEach((r) => Object.keys(COLS).forEach((c) => { REGIONS[r + c] = {...COLS[c], ...ROWS[r]}; }));
// 区域中心点（给 origin / spot / rings 用）
export const REGION_CENTER: Record<string, [number, number]> = {};
Object.keys(ROWS).forEach((r, i) => Object.keys(COLS).forEach((c) => { const col = COLS[c]; REGION_CENTER[r + c] = [(col.x ?? 0) + (col.w ?? 0) / 2, [280, 540, 760][i]]; }));
export const SUBTITLE_Y = 820;
export const regionBox = (b: BoxSpec | string | undefined, dflt: BoxSpec): BoxSpec => {
  if (!b) return dflt;
  if (typeof b === 'string') return REGIONS[b.toUpperCase()] ?? dflt;
  return {...dflt, ...b};
};
export const regionXY = (v: {x?: number; y?: number; at?: string}): [number, number] => {
  if (v.at && REGION_CENTER[v.at.toUpperCase()]) return REGION_CENTER[v.at.toUpperCase()];
  return [v.x ?? 960, v.y ?? 540];
};
export const regionOrigin = (s: string | undefined): string => {
  if (!s) return '50% 50%';
  const c = REGION_CENTER[s.toUpperCase()];
  return c ? `${Math.round(c[0] / 19.2)}% ${Math.round(c[1] / 10.8)}%` : s;
};

// 审查用网格：拼图里叠在每格上，标出区域名和字幕禁区
export const GridOverlay: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {[90, 1830].map((x) => <div key={'v' + x} style={{position: 'absolute', left: x, top: 0, bottom: 0, width: 1, background: '#8FBFB055'}} />)}
    {[670, 1250].map((x) => <div key={'v' + x} style={{position: 'absolute', left: x, top: 0, bottom: 0, width: 1, background: '#8FBFB033'}} />)}
    {[120, 400, 680].map((y) => <div key={'h' + y} style={{position: 'absolute', top: y, left: 0, right: 0, height: 1, background: '#8FBFB033'}} />)}
    <div style={{position: 'absolute', top: SUBTITLE_Y, left: 0, right: 0, height: 2, background: '#E85D3A99', borderTop: '2px dashed #E85D3A'}} />
    <div style={{position: 'absolute', top: SUBTITLE_Y + 6, right: 30, fontFamily: FONTS.sans, fontSize: 22, color: '#E85D3A', fontWeight: 700}}>字幕区 y&gt;{SUBTITLE_Y}</div>
    <div style={{position: 'absolute', left: SAFE_RIGHT_X, top: 0, bottom: 0, width: SAFE_RIGHT, background: '#E85D3A14', borderLeft: '2px dashed #E85D3A'}} />
    <div style={{position: 'absolute', left: SAFE_RIGHT_X + 8, top: 40, fontFamily: FONTS.sans, fontSize: 22, color: '#E85D3A', fontWeight: 700}}>抖音图标区 x&gt;{SAFE_RIGHT_X}</div>
    {Object.entries(REGION_CENTER).filter(([k]) => !k.endsWith('W')).map(([k, [x, y]]) => (
      <div key={k} style={{position: 'absolute', left: x - 30, top: y - 18, width: 60, textAlign: 'center', fontFamily: FONTS.num, fontSize: 30, color: '#8FBFB0', opacity: 0.55, textShadow: '0 0 6px #000'}}>{k}</div>
    ))}
  </AbsoluteFill>
);

// 时钟牌
export const Clock: React.FC<{at: number; h: number; m0: number; m1?: number; dur?: number}> = ({at: a, h, m0, m1, dur = 40}) => {
  const f = useCurrentFrame();
  const m = m1 === undefined ? m0 : Math.round(interpolate(f, [a, a + dur], [m0, m1], clamp));
  return <FlyIn at={a} dir="down" dist={100}><Tag size={46} dark style={{fontVariantNumeric: 'tabular-nums', letterSpacing: 3}}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</Tag></FlyIn>;
};
