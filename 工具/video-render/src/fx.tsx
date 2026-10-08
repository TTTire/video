import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useC} from './ui';
import {Sfx} from './sfx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------- 音效 ----------
export {Sfx} from './sfx';
export type {SfxName} from './sfx';

// ---------- 背景：流动光斑 + 网格 + 漂浮粒子 + 暗角 ----------
export const FxBackground: React.FC = () => {
  const C = useC();
  const f = useCurrentFrame();
  const blobs = [
    {c: C.gold, x: 20, y: 30, r: 700, sp: 0.004},
    {c: C.teal, x: 80, y: 70, r: 800, sp: 0.003},
    {c: '#7C5CFF', x: 60, y: 10, r: 600, sp: 0.005},
  ];
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {blobs.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', width: b.r, height: b.r, borderRadius: '50%', background: b.c, opacity: 0.13, filter: 'blur(120px)',
          left: `calc(${b.x + Math.sin(f * b.sp + i) * 12}% - ${b.r / 2}px)`, top: `calc(${b.y + Math.cos(f * b.sp * 1.3 + i) * 10}% - ${b.r / 2}px)`,
        }} />
      ))}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(${C.white}0D 1px, transparent 1px), linear-gradient(90deg, ${C.white}0D 1px, transparent 1px)`,
        backgroundSize: '80px 80px', backgroundPosition: `0px ${(f * 0.3) % 80}px`,
      }} />
      {Array.from({length: 36}).map((_, i) => {
        const x = random(`x${i}`) * 1920, sp = 0.2 + random(`s${i}`) * 0.6, sz = 2 + random(`z${i}`) * 4;
        const y = (random(`y${i}`) * 1180 - f * sp) % 1180;
        return <div key={i} style={{position: 'absolute', left: x, top: (y + 1180) % 1180 - 50, width: sz, height: sz, borderRadius: '50%', background: C.gold, opacity: 0.25 + random(`o${i}`) * 0.35, boxShadow: `0 0 ${sz * 3}px ${C.gold}`}} />;
      })}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, #000A 100%)'}} />
    </AbsoluteFill>
  );
};

// ---------- 场景入场/出场 + 镜头缓推 ----------
export type Enter = 'zoom' | 'slideL' | 'slideUp' | 'blur' | 'flip';
export const SceneMotion: React.FC<{dur: number; enter: Enter; children: React.ReactNode; shake?: number[]}> = ({dur, enter, children, shake = []}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 18, stiffness: 110}});
  const out = interpolate(f, [dur - 10, dur], [0, 1], clamp);
  const push = interpolate(f, [0, dur], [1, 1.045]);
  let tf = '', filter = '';
  if (enter === 'zoom') tf = `scale(${1.18 - 0.18 * p})`;
  if (enter === 'slideL') tf = `translateX(${(1 - p) * 260}px)`;
  if (enter === 'slideUp') tf = `translateY(${(1 - p) * 180}px)`;
  if (enter === 'flip') tf = `perspective(1400px) rotateX(${(1 - p) * -70}deg)`;
  if (enter !== 'flip') filter = `blur(${(1 - p) * 14 + out * 10}px)`;
  // 镜头震动：在 shake 里的帧附近抖 8 帧
  let sx = 0, sy = 0;
  shake.forEach((s) => { const d = f - s; if (d >= 0 && d < 8) { const k = (8 - d) / 8; sx += Math.sin(d * 3.1) * 14 * k; sy += Math.cos(d * 2.7) * 10 * k; } });
  return (
    <AbsoluteFill style={{opacity: Math.min(p * 1.4, 1) * (1 - out), transform: `${tf} scale(${push + out * 0.06}) translate(${sx}px, ${sy}px)`, filter}}>
      {children}
    </AbsoluteFill>
  );
};

// ---------- 常用动效元件 ----------
export const useSpringAt = (at: number, cfg = {damping: 12, stiffness: 160}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - at, fps, config: cfg});
};

// 从远处砸下来的印章
export const Stamp: React.FC<{at: number; children: React.ReactNode; color?: string; rotate?: number; size?: number}> = ({at, children, color, rotate = -10, size = 90}) => {
  const C = useC();
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = interpolate(f - at, [0, 6], [3, 1], clamp);
  const o = interpolate(f - at, [0, 3], [0, 1], clamp);
  const col = color ?? C.coral;
  return (
    <div style={{transform: `rotate(${rotate}deg) scale(${s})`, opacity: o, border: `10px solid ${col}`, color: col, fontFamily: C.font, fontWeight: 900, fontSize: size, padding: '4px 34px', borderRadius: 18, letterSpacing: 6, boxShadow: `0 0 40px ${col}66`, background: '#0006'}}>{children}</div>
  );
};

// 荧光笔划过的重点词
export const Marker: React.FC<{at: number; children: React.ReactNode; color?: string; dur?: number}> = ({at, children, color, dur = 14}) => {
  const C = useC();
  const f = useCurrentFrame();
  const w = interpolate(f, [at, at + dur], [0, 100], clamp);
  return (
    <span style={{position: 'relative', display: 'inline-block', padding: '0 10px'}}>
      <span style={{position: 'absolute', left: 0, bottom: '8%', height: '42%', width: `${w}%`, background: color ?? C.gold, opacity: 0.45, borderRadius: 8}} />
      <span style={{position: 'relative'}}>{children}</span>
    </span>
  );
};

// 画出来的删除线
export const StrikeLine: React.FC<{at: number; color?: string}> = ({at, color}) => {
  const C = useC();
  const f = useCurrentFrame();
  const w = interpolate(f, [at, at + 12], [0, 104], clamp);
  return <div style={{position: 'absolute', left: '-2%', top: '50%', height: 14, width: `${w}%`, background: color ?? C.coral, borderRadius: 7, transform: 'rotate(-3deg)', boxShadow: `0 0 20px ${color ?? C.coral}`}} />;
};

// 数字滚动
export const CountUp: React.FC<{from?: number; to: number; at: number; dur?: number; format?: (n: number) => string}> = ({from = 0, to, at, dur = 30, format}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + dur], [from, to], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const n = Math.round(v);
  return <>{format ? format(n) : n.toLocaleString('en-US')}</>;
};

// 毛玻璃浮动卡片
export const GlassCard: React.FC<{children: React.ReactNode; style?: React.CSSProperties; float?: number; glow?: string}> = ({children, style, float = 1, glow}) => {
  const C = useC();
  const f = useCurrentFrame();
  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFFFFF1A, #FFFFFF08)', border: `2px solid ${glow ?? C.gold}66`, borderRadius: 28, padding: '36px 52px',
      boxShadow: `0 30px 80px #0009, 0 0 40px ${(glow ?? C.gold)}22, inset 0 1px 0 #FFFFFF22`, backdropFilter: 'blur(12px)',
      transform: `translateY(${Math.sin(f / 22) * 6 * float}px)`, ...style,
    }}>{children}</div>
  );
};

// 弹射入场：dir 从哪边飞进来
export const FlyIn: React.FC<{at: number; dir?: 'left' | 'right' | 'up' | 'down'; dist?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, dir = 'up', dist = 300, children, style}) => {
  const p = useSpringAt(at);
  const d = (1 - p) * dist;
  const t = dir === 'left' ? `translateX(${-d}px)` : dir === 'right' ? `translateX(${d}px)` : dir === 'up' ? `translateY(${d}px)` : `translateY(${-d}px)`;
  return <div style={{opacity: Math.min(1, p * 1.5), transform: `${t} scale(${0.85 + 0.15 * p})`, ...style}}>{children}</div>;
};

// ---------- 图标 ----------
export const IconBag: React.FC<{size?: number; color?: string}> = ({size = 160, color}) => {
  const C = useC();
  const c = color ?? C.gold;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M32 38 C32 18, 68 18, 68 38" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" />
      <path d="M18 38 H82 L76 88 H24 Z" fill={c} />
      <rect x="42" y="52" width="16" height="10" rx="3" fill={C.bg} opacity="0.7" />
    </svg>
  );
};
export const IconTea: React.FC<{size?: number}> = ({size = 160}) => {
  const C = useC();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <rect x="56" y="4" width="6" height="30" rx="3" fill={C.coral} transform="rotate(14 59 19)" />
      <rect x="24" y="24" width="52" height="8" rx="3" fill={C.white} />
      <path d="M27 34 H73 L67 94 H33 Z" fill="#E9C9A0" />
      {[[40, 82], [52, 86], [60, 78], [46, 72]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" fill="#3B2A22" />)}
    </svg>
  );
};
export const IconFire: React.FC<{size?: number}> = ({size = 90}) => {
  const f = useCurrentFrame();
  const s = 1 + Math.sin(f / 3) * 0.05;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{transform: `scale(${s})`}}>
      <path d="M50 6 C62 26, 82 36, 80 62 C78 84, 62 96, 50 96 C34 96, 20 84, 20 64 C20 48, 30 40, 36 30 C38 44, 44 48, 48 50 C44 34, 44 20, 50 6 Z" fill="#FF5A36" />
      <path d="M50 52 C58 62, 66 68, 64 80 C62 90, 56 94, 50 94 C42 94, 36 88, 36 80 C36 70, 44 64, 50 52 Z" fill="#FFC23D" />
    </svg>
  );
};
export const IconClock: React.FC<{size?: number; at: number}> = ({size = 120, at}) => {
  const C = useC();
  const f = useCurrentFrame();
  const a = interpolate(f, [at, at + 45], [0, 360], clamp);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke={C.gold} strokeWidth="7" />
      <line x1="50" y1="50" x2="50" y2="26" stroke={C.white} strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="16" stroke={C.gold} strokeWidth="4" strokeLinecap="round" transform={`rotate(${a} 50 50)`} />
      <circle cx="50" cy="50" r="5" fill={C.white} />
    </svg>
  );
};
export const IconPin: React.FC<{size?: number; color?: string}> = ({size = 56, color}) => {
  const C = useC();
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d="M50 94 C50 94, 18 58, 18 38 C18 20, 32 6, 50 6 C68 6, 82 20, 82 38 C82 58, 50 94, 50 94 Z" fill={color ?? C.coral} />
      <circle cx="50" cy="38" r="13" fill={C.bg} />
    </svg>
  );
};
