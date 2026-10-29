// 实物感卡片（2026-10-29 起，style.cardSkin = "tactile" 时启用）
// 卡不再是半透明色块，而是"一张能拿起来的牌"：厚度（底部双层硬边）、细金边、四角角花、悬浮漂动、入场从侧面飞入 + 轻回弹。
// 四种语义不变（solid / paper / notch / tab），新增 photo 卡（上图下字，一个实体一张）。
import React from 'react';
import {Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useC} from '../ui';
import {CardCtx, CardKind, FONTS, H, INK, INK_EM, T} from './kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 漂动：每张卡用自己的种子，相位错开，±6px，周期约 4 秒
export const useFloat = (seed = 0, amp = 6) => {
  const f = useCurrentFrame();
  return Math.sin(f / 38 + seed * 1.7) * amp;
};

// 角花：四角细线 L 形 + 一个小点，小Lin说那种"证书感"。color 走金色，opacity 低一点别抢字
export const Corners: React.FC<{color: string; inset?: number; len?: number; opacity?: number}> = ({color, inset = 14, len = 26, opacity = 0.75}) => {
  const L = (rot: number, pos: React.CSSProperties) => (
    <svg key={rot} width={len} height={len} viewBox="0 0 30 30" style={{position: 'absolute', ...pos, transform: `rotate(${rot}deg)`, opacity}}>
      <path d="M2 28 V2 H28" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill={color} />
    </svg>
  );
  return (
    <>
      {L(0, {left: inset, top: inset})}
      {L(90, {right: inset, top: inset})}
      {L(180, {right: inset, bottom: inset})}
      {L(270, {left: inset, bottom: inset})}
    </>
  );
};

// 卡片的"物理壳"：厚底边 + 金细边 + 内高光 + 漂动。各种卡都套这一层，只换颜色
export const TactileShell: React.FC<{
  bg: string; edge: string; thick?: string; w?: number; radius?: number; pad?: string; seed?: number; corners?: boolean; float?: boolean; style?: React.CSSProperties; children: React.ReactNode;
}> = ({bg, edge, thick, w, radius = 22, pad = '36px 52px 40px', seed = 0, corners = true, float = true, style, children}) => {
  const dy = float ? useFloat(seed) : 0;
  const thickColor = thick ?? '#00000088';
  return (
    <div style={{
      position: 'relative', width: w, boxSizing: 'border-box', borderRadius: radius, padding: pad, background: bg,
      border: `1.5px solid ${edge}`,
      boxShadow: `0 10px 0 ${thickColor}, 0 12px 0 ${edge}55, 0 40px 90px #000000B8, inset 0 1px 0 #FFFFFF33`,
      transform: `translateY(${dy}px)`, ...style,
    }}>
      {corners && <Corners color={edge} />}
      {children}
    </div>
  );
};

// 入场：从侧面飞入 + 轻回弹（卡片是"物"，所以有重量感：damping 高一点，不乱弹）
export const CardEnter: React.FC<{at: number; dir?: 'left' | 'right' | 'up' | 'down'; dist?: number; children: React.ReactNode}> = ({at, dir = 'up', dist = 160, children}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - at, fps, config: {damping: 16, stiffness: 120, mass: 1.1}});
  const o = interpolate(f, [at, at + 8], [0, 1], clamp);
  const d = (1 - p) * dist;
  const t = dir === 'left' ? `translateX(${-d}px) rotate(${(1 - p) * -3}deg)` : dir === 'right' ? `translateX(${d}px) rotate(${(1 - p) * 3}deg)` : dir === 'up' ? `translateY(${d}px)` : `translateY(${-d}px)`;
  return <div style={{opacity: o, transform: `${t} scale(${0.94 + 0.06 * p})`}}>{children}</div>;
};

// ---------- 四种语义卡的实物版 ----------
export const TSolid: React.FC<{label?: string; w?: number; seed?: number; children: React.ReactNode}> = ({label, w = 900, seed, children}) => {
  const C = useC();
  return (
    <TactileShell bg={`linear-gradient(170deg, ${C.gold} 0%, ${C.gold} 70%, ${C.gold}DD 100%)`} edge="#FFFFFF66" thick="#5A3A14" w={w} seed={seed} pad="42px 60px 48px">
      {label && <div style={{fontFamily: C.font, fontWeight: 900, fontSize: 30, letterSpacing: 6, color: INK_EM, opacity: 0.8, marginBottom: 10}}>{label}</div>}
      {children}
    </TactileShell>
  );
};
// paper：纸纹 + 顶部一条胶带；微斜。原文 / 新闻 / 账单
const PAPER_NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45 0 0 0 0 0.40 0 0 0 0 0.33 0 0 0 0.18 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")";
export const TPaper: React.FC<{w?: number; seed?: number; tape?: boolean; children: React.ReactNode}> = ({w = 900, seed = 1, tape = true, children}) => {
  const dy = useFloat(seed, 3);
  return (
    <div style={{position: 'relative', width: w, boxSizing: 'border-box', transform: `rotate(-1.6deg) translateY(${dy}px)`}}>
      {tape && <div style={{position: 'absolute', left: '50%', top: -22, width: 190, height: 46, marginLeft: -95, background: 'linear-gradient(180deg, #F6EBC8CC, #E8D9A8CC)', transform: 'rotate(2deg)', boxShadow: '0 4px 10px #0004', zIndex: 2, opacity: 0.9}} />}
      <div style={{position: 'relative', borderRadius: 6, padding: '50px 60px 54px', background: '#F2E8D8', backgroundImage: `${PAPER_NOISE}, linear-gradient(180deg, #00000000 0%, #00000010 100%)`, color: '#1F1710', boxShadow: '0 6px 0 #C9B99A, 0 36px 80px #000000B8', border: '1px solid #FFFFFF99'}}>
        {children}
      </div>
    </div>
  );
};
// notch：深底 + 左竖条 + 角花 + 中英双标（label 下面可以放 sub 英文小字）
export const TNotch: React.FC<{label?: string; sub?: string; w?: number; seed?: number; children: React.ReactNode}> = ({label, sub, w = 900, seed, children}) => {
  const C = useC();
  return (
    <TactileShell bg={`linear-gradient(160deg, ${C.bg}F4 0%, ${C.bg2 ?? C.bg}F4 100%)`} edge={`${C.gold}66`} w={w} seed={seed} pad="38px 56px 42px 82px">
      <div style={{position: 'absolute', left: 30, top: 40, bottom: 44, width: 8, borderRadius: 4, background: C.gold, boxShadow: `0 0 22px ${C.gold}99`}} />
      {label && (
        <div style={{marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 16}}>
          <span style={{fontFamily: C.font, fontWeight: 800, fontSize: 32, color: C.gold, letterSpacing: 5}}>{label}</span>
          {sub && <span style={{fontFamily: C.font, fontWeight: 500, fontSize: 22, color: C.dim, letterSpacing: 2, opacity: 0.8}}>{sub}</span>}
        </div>
      )}
      {children}
    </TactileShell>
  );
};
// tab：顶上挂签 + 实物壳
export const TTab: React.FC<{label: string; color?: string; w?: number; seed?: number; children: React.ReactNode}> = ({label, color, w = 900, seed, children}) => {
  const C = useC();
  const bg = color ? ((C as any)[color] ?? color) : C.dim;
  return (
    <div style={{width: w, boxSizing: 'border-box', position: 'relative'}}>
      <div style={{display: 'inline-block', background: bg, color: C.bg, fontFamily: C.font, fontWeight: 900, fontSize: 32, letterSpacing: 4, padding: '10px 30px 14px', borderRadius: '14px 14px 0 0', position: 'relative', top: 6, zIndex: 2, boxShadow: '0 -2px 0 #FFFFFF44 inset, 0 8px 24px #0008'}}>{label}</div>
      <TactileShell bg={`linear-gradient(160deg, ${C.bg}F6 0%, ${C.bg2 ?? C.bg}F6 100%)`} edge={`${C.gold}55`} w={w} seed={seed} radius={20} pad="36px 52px 40px" style={{borderTopLeftRadius: 0}}>
        {children}
      </TactileShell>
    </div>
  );
};

// ---------- photo 卡：一个实体一张（公司 / 国家 / 人 / 商品）----------
// 上半张图（圆角、内阴影、轻微晕影），下半中文大词 + 英文小字；细金边 + 角花 + 漂动
export const TPhoto: React.FC<{src: string; title?: React.ReactNode; sub?: string; w?: number; imgH?: number; seed?: number; dimTitle?: boolean; children?: React.ReactNode}> = ({src, title, sub, w = 420, imgH, seed = 2, dimTitle, children}) => {
  const C = useC();
  const ih = imgH ?? Math.round(w * 0.72);
  return (
    <TactileShell bg={`linear-gradient(160deg, ${C.bg}F6 0%, ${C.bg2 ?? C.bg}F6 100%)`} edge={`${C.gold}77`} w={w} seed={seed} radius={24} pad="14px 14px 20px">
      <div style={{position: 'relative', width: '100%', height: ih, borderRadius: 16, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px #FFFFFF22, inset 0 -30px 50px #00000066'}}>
        <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 55%, #00000088 100%)'}} />
      </div>
      {(title || sub) && (
        <div style={{padding: '18px 10px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
          {title && <H size={46} color={dimTitle ? C.dim : C.white} align="center" style={{letterSpacing: 4, lineHeight: 1.1}}>{title}</H>}
          {sub && <T size={20} color={C.dim} style={{letterSpacing: 3, opacity: 0.8}}>{sub}</T>}
        </div>
      )}
      {children}
    </TactileShell>
  );
};

// 实物壳的分发：engine 在 style.cardSkin === 'tactile' 时用这个替代 kit 的 CardShell
export const TactileCardShell: React.FC<{kind?: CardKind; label?: string; sub?: string; color?: string; w?: number; seed?: number; children: React.ReactNode}> = ({kind, label, sub, color, w, seed, children}) => {
  if (!kind) return <>{children}</>;
  const inner = <CardCtx.Provider value={{kind}}>{children}</CardCtx.Provider>;
  if (kind === 'solid') return <TSolid label={label} w={w} seed={seed}>{inner}</TSolid>;
  if (kind === 'paper') return <TPaper w={w} seed={seed}>{inner}</TPaper>;
  if (kind === 'notch') return <TNotch label={label} sub={sub} w={w} seed={seed}>{inner}</TNotch>;
  return <TTab label={label ?? ''} color={color} w={w} seed={seed}>{inner}</TTab>;
};

// ---------- graph：卡片之间拉发光连线，表示关系 ----------
// nodes 的位置用相对于容器的像素；edges 在两端节点都出现后，从 a 向 b 生长（stroke-dashoffset）
export type GraphNode = {id: string; x: number; y: number; w?: number; h?: number; at: number; node: React.ReactNode};
export type GraphEdge = {from: string; to: string; at?: number; label?: string; color?: string};
export const Graph: React.FC<{w: number; h: number; nodes: GraphNode[]; edges: GraphEdge[]; stepAt: (i: number) => number; step: number}> = ({w, h, nodes, edges, stepAt, step}) => {
  const C = useC();
  const f = useCurrentFrame();
  const pos: Record<string, {cx: number; cy: number}> = {};
  // 连线锚在卡片中心：photo 卡高 ≈ 图高 + 字区，纯字 notch 卡 ≈ 150；也可以每个节点自己给 h
  nodes.forEach((n) => { pos[n.id] = {cx: n.x + (n.w ?? 360) / 2, cy: n.y + (n.h ?? 150) / 2}; });
  return (
    <div style={{position: 'relative', width: w, height: h}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <filter id="gglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from)!, b = nodes.find((n) => n.id === e.to)!;
          const start = stepAt(e.at ?? Math.max(a.at, b.at)) + 10;
          if (step < (e.at ?? Math.max(a.at, b.at))) return null;
          const k = interpolate(f, [start, start + 26], [0, 1], clamp);
          const p1 = pos[e.from], p2 = pos[e.to];
          const dx = p2.cx - p1.cx, dy = p2.cy - p1.cy;
          const len = Math.hypot(dx, dy);
          const mx = (p1.cx + p2.cx) / 2, my = (p1.cy + p2.cy) / 2 - Math.min(80, len * 0.15);
          const col = e.color ? ((C as any)[e.color] ?? e.color) : C.gold;
          const d = `M ${p1.cx} ${p1.cy} Q ${mx} ${my} ${p2.cx} ${p2.cy}`;
          return (
            <g key={i} filter="url(#gglow)">
              <path d={d} fill="none" stroke={col} strokeWidth="3" strokeLinecap="round" strokeDasharray={len * 1.1} strokeDashoffset={len * 1.1 * (1 - k)} opacity={0.9} />
              {k >= 1 && <circle cx={p2.cx} cy={p2.cy} r="6" fill={col} />}
              {e.label && k >= 0.6 && <text x={mx} y={my - 10} textAnchor="middle" fill={C.dim} fontFamily={FONTS.sans} fontSize="24" fontWeight="700" opacity={interpolate(k, [0.6, 1], [0, 1], clamp)}>{e.label}</text>}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => step >= n.at ? (
        <div key={n.id} style={{position: 'absolute', left: n.x, top: n.y, width: n.w}}>
          <CardEnter at={stepAt(n.at)} dir={n.x < w / 2 ? 'left' : 'right'} dist={120}>{n.node}</CardEnter>
        </div>
      ) : null)}
    </div>
  );
};

export {INK, INK_EM};
