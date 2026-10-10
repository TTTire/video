// 照片铺底风格的公共元件：主题、字体、照片底、文字、标签、面板、聚光、响声圈、时钟。
// 第 6 期 photo.tsx 和通用引擎 engine.tsx 都用这一套，保证每期长得像同一个栏目。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, interpolate, useCurrentFrame} from 'remotion';
import {Theme, useC} from '../ui';
import {FlyIn} from '../fx';
import smileyWoff2 from '../../assets/fonts/SmileySans-Oblique.ttf.woff2';

// ---------- 主题 ----------
// 暖黑底 + 陶土橙强调 + 米白字；dim 是次要文字，teal 表示"正常/增长"，coral 表示"问题/瓶颈"
export const PHOTO_THEME: Theme = {
  bg: '#0B0907', bg2: '#1A1410', gold: '#E07B45', white: '#F4EFE6', dim: '#CFC4B6',
  coral: '#E85D3A', teal: '#8FBFB0', font: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif',
};
// 标题字体：得意黑（assets/fonts/，OFL 开源可商用）
export const TITLE_FONT = '"Smiley","Microsoft YaHei","PingFang SC",sans-serif';

// 加载得意黑（在合成根部调用一次）
export const useTitleFont = () => {
  const [h] = useState(() => delayRender('load Smiley Sans'));
  useEffect(() => {
    const ff = new FontFace('Smiley', `url(${smileyWoff2}) format('woff2')`);
    ff.load().then((f) => { document.fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

export type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
export const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = (t: number) => 1 - Math.pow(1 - t, 3);
export const SHADOW = '0 4px 28px #000D, 0 1px 4px #000A';

// ---------- 照片底：缓慢推拉 + 文字侧压暗 ----------
export type Grad = 'left' | 'right' | 'top' | 'bottom' | 'none' | 'all';
export const Photo: React.FC<{
  src: string; dur: number; zoom?: [number, number]; origin?: string; grad?: Grad; dim?: number; blur?: number; opacity?: number; pos?: string;
}> = ({src, dur, zoom = [1.02, 1.1], origin = '50% 50%', grad = 'none', dim = 0, blur = 0, opacity = 1, pos = 'center'}) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], zoom, clamp);
  const g: Record<Grad, string> = {
    none: 'none',
    left: 'linear-gradient(90deg, #0B0907E6 0%, #0B0907B3 38%, #0B090700 62%)',
    right: 'linear-gradient(270deg, #0B0907E6 0%, #0B0907B3 38%, #0B090700 62%)',
    top: 'linear-gradient(180deg, #0B0907E0 0%, #0B090799 32%, #0B090700 58%)',
    bottom: 'linear-gradient(0deg, #0B0907E0 0%, #0B090799 32%, #0B090700 58%)',
    all: '#0B0907B8',
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${z})`, transformOrigin: origin, filter: blur ? `blur(${blur}px)` : undefined}} />
      {dim > 0 && <AbsoluteFill style={{background: '#0B0907', opacity: dim}} />}
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

// ---------- 文字元件 ----------
export const H: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; align?: 'left' | 'center' | 'right'}> = ({children, size = 92, color, style, align = 'left'}) => {
  const C = useC();
  return <div style={{fontFamily: TITLE_FONT, fontSize: size, color: color ?? C.white, lineHeight: 1.18, textAlign: align, textShadow: SHADOW, letterSpacing: 1, ...style}}>{children}</div>;
};
export const T: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; weight?: number}> = ({children, size = 40, color, style, weight = 700}) => {
  const C = useC();
  return <div style={{fontFamily: C.font, fontWeight: weight, fontSize: size, color: color ?? C.dim, lineHeight: 1.4, textShadow: SHADOW, ...style}}>{children}</div>;
};
export const Tag: React.FC<{children: React.ReactNode; color?: string; size?: number; dark?: boolean; style?: React.CSSProperties}> = ({children, color, size = 38, dark, style}) => {
  const C = useC();
  return <div style={{display: 'inline-block', fontFamily: C.font, fontWeight: 800, fontSize: size, color: dark ? C.white : C.bg, background: dark ? '#0B0907CC' : (color ?? C.gold), border: dark ? `2px solid ${C.white}44` : 'none', borderRadius: 14, padding: '10px 28px', boxShadow: '0 10px 30px #0008', ...style}}>{children}</div>;
};
export const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const C = useC();
  return <div style={{background: '#0B0907D0', border: `1.5px solid ${C.white}2E`, borderRadius: 26, padding: '34px 44px', boxShadow: '0 30px 80px #000A', backdropFilter: 'blur(10px)', ...style}}>{children}</div>;
};
export const Box: React.FC<{x?: number; y?: number; w?: number; right?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y = 0, w, right, children, style}) => (
  <div style={{position: 'absolute', left: x, right, top: y, width: w, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start', ...style}}>{children}</div>
);
// 得意黑金句里的强调字
export const Em: React.FC<{children: React.ReactNode; color?: string}> = ({children, color}) => { const C = useC(); return <span style={{color: color ?? C.gold}}>{children}</span>; };

// 时钟牌
export const Clock: React.FC<{at: number; h: number; m0: number; m1?: number; dur?: number}> = ({at: a, h, m0, m1, dur = 40}) => {
  const f = useCurrentFrame();
  const m = m1 === undefined ? m0 : Math.round(interpolate(f, [a, a + dur], [m0, m1], clamp));
  return <FlyIn at={a} dir="down" dist={100}><Tag size={46} dark style={{fontVariantNumeric: 'tabular-nums', letterSpacing: 3}}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</Tag></FlyIn>;
};
