import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AutoSfxCtx, Sfx} from './sfx';

export const C = {
  bg: '#0B1020', bg2: '#141B33', gold: '#E8C27A', white: '#F5F3EE', dim: '#8A93B2',
  coral: '#FF6B6B', teal: '#5ED3C5', font: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
};
export type Theme = typeof C;
// 每期可以换一套配色：gold 是主强调色
export const ThemeCtx = React.createContext<Theme>(C);
export const useC = () => React.useContext(ThemeCtx);

// 当前已经开始的第几句（场景内）
export const useStep = (steps: number[]) => {
  const f = useCurrentFrame();
  let n = 0;
  steps.forEach((s) => { if (f >= s) n++; });
  return n - 1;
};

export const usePop = (at: number, delay = 0) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: f - at - delay, fps, config: {damping: 16, stiffness: 120}});
};

export const Pop: React.FC<{at?: number; delay?: number; style?: React.CSSProperties; children: React.ReactNode; y?: number; mute?: boolean}> = ({at = 0, delay = 0, style, children, y = 40, mute}) => {
  const p = usePop(at, delay);
  const auto = React.useContext(AutoSfxCtx);
  return (
    <div style={{opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${0.92 + 0.08 * p})`, ...style}}>
      {auto && !mute && at + delay > 3 && <Sfx at={at + delay} name="pop" vol={0.16} />}
      {children}
    </div>
  );
};

export const Big: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 96, color, style}) => {
  const C = useC();
  return (
  <div style={{fontFamily: C.font, fontWeight: 900, fontSize: size, color: color ?? C.white, lineHeight: 1.25, textAlign: 'center', letterSpacing: 2, ...style}}>{children}</div>
  );
};

export const Person: React.FC<{color?: string; size?: number; opacity?: number; dx?: number}> = ({color, size = 70, opacity = 1, dx = 0}) => {
  const C = useC();
  color = color ?? C.dim;
  return (
  <svg width={size} height={size * 1.9} viewBox="0 0 40 76" style={{opacity, transform: `translateX(${dx}px)`}}>
    <circle cx="20" cy="12" r="10" fill={color} />
    <rect x="6" y="26" width="28" height="48" rx="12" fill={color} />
  </svg>
  );
};

// 一条通向精品店门口的队伍；leave: 0..1 队尾离开的比例
export const Queue: React.FC<{n?: number; leave?: number; front?: number; frontColor?: string; tailColor?: string; y?: number}> = ({n = 13, leave = 0, front = 0, frontColor = C.gold, tailColor = C.dim, y = 0}) => {
  const f = useCurrentFrame();
  const people = Array.from({length: n});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 360 + y, height: 360}}>
      {/* 门 */}
      <div style={{position: 'absolute', right: 150, top: -20, width: 190, height: 300, borderRadius: '95px 95px 8px 8px', background: `radial-gradient(circle at 50% 40%, #FFE3A8, ${C.gold} 45%, #7A5A22)`, boxShadow: `0 0 120px ${C.gold}88`}} />
      <div style={{position: 'absolute', right: 150, top: 290, width: 190, textAlign: 'center', fontFamily: C.font, color: C.gold, fontSize: 30, letterSpacing: 6}}>BOUTIQUE</div>
      <div style={{position: 'absolute', right: 380, top: 110, display: 'flex', flexDirection: 'row-reverse', gap: 14}}>
        {people.map((_, i) => {
          const fromTail = n - 1 - i; // 0 = 队尾
          const leaving = fromTail < Math.round(leave * n);
          const o = leaving ? 0.12 : 1;
          const bob = Math.sin((f + i * 7) / 18) * 2;
          const col = i < front ? frontColor : tailColor;
          return <div key={i} style={{transform: `translateY(${bob + (leaving ? 30 : 0)}px)`}}><Person color={col} size={64} opacity={o} /></div>;
        })}
      </div>
    </div>
  );
};

export const Chip: React.FC<{children: React.ReactNode; color?: string; size?: number}> = ({children, color, size = 44}) => {
  const C = useC();
  return (
  <div style={{fontFamily: C.font, fontWeight: 800, fontSize: size, color: C.bg, background: color ?? C.gold, borderRadius: 999, padding: '14px 40px', display: 'inline-block'}}>{children}</div>
  );
};

export const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const C = useC();
  return (
  <div style={{background: C.bg2, border: `2px solid ${C.gold}55`, borderRadius: 28, padding: '40px 56px', boxShadow: '0 30px 80px #0008', ...style}}>{children}</div>
  );
};

export const fade = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
