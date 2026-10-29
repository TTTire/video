// 数值动效（2026-10-29）。CountUp 以外的六种"数怎么变"：
//   Odometer    每一位像里程表独立上滚，右位先动左位后动（价格 ¥16 → ¥23、年份 2011 → 2024）
//   Flap        机场翻牌：旧值翻下去、新值翻上来（一个值被另一个值替换；和划线同语义、另一种长相）
//   Slam        大数从远处砸下来，到位震一下（本期核心数字，一期 1–2 次）
//   Rank        几行并列项按新值重排，行与行交换位置（排名 / 谁先走）
//   StackUnits  实物堆叠表量：一个一个落下（人数、钱数这种可数的量）
//   Fill        容器里液面升到百分比（占比 / 份额）
// 验收标准（Heer & Robertson 2007）：每帧都是合法状态、复杂变化分阶段、慢进慢出、同一数据项位置恒常。
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../sfx';
import {FONTS, T} from './kit';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};

// ---------- Odometer ----------
// from/to 是字符串（允许 "¥16"、"2011"、"4,100"）；非数字字符原位不动，数字位各自上滚。
// 右边位先动、左边位每位晚 3 帧；每位滚 dur 帧，过程中间经过 0–9 的正确序列（里程表的"合法状态"）。
const Digit: React.FC<{from: number; to: number; at: number; dur: number; size: number; color: string}> = ({from, to, at: a, dur, size, color}) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [a, a + dur], [0, 1], {...clamp, easing: easeInOut});
  // 涨：from → to 往上滚，经过中间每个数字；跌：往下滚。都不绕圈（价格从 2 到 0 不该经过 9）
  const steps = Math.abs(to - from);
  const dir = to >= from ? 1 : -1;
  const v = steps * k;                      // 已滚过的格数
  const h = size * 1.05;
  const seq = Array.from({length: steps + 1}, (_, i) => from + dir * i);
  return (
    <span style={{display: 'inline-block', position: 'relative', width: size * 0.62, height: h, overflow: 'hidden', verticalAlign: 'bottom'}}>
      <span style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${-v * h}px)`, display: 'flex', flexDirection: 'column'}}>
        {seq.map((d, i) => <span key={i} style={{height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size, color, ...NUM}}>{d}</span>)}
      </span>
    </span>
  );
};
export const Odometer: React.FC<{from: string; to: string; at: number; dur?: number; size?: number; color?: string; stagger?: number; sfx?: boolean}> = ({from, to, at: a, dur = 28, size = 120, color, stagger = 3, sfx = true}) => {
  const C = useC();
  const col = color ?? C.gold;
  // 右对齐补位：from 比 to 短时左边补空格（用 0 占位但不显示会更复杂，直接补空格）
  const L = Math.max(from.length, to.length);
  const F = from.padStart(L, ' '), Tt = to.padStart(L, ' ');
  const chars = Tt.split('');
  // 数字位从右往左编号，第 j 位延迟 j*stagger
  let digitIdx = 0;
  const total = chars.filter((c) => /\d/.test(c)).length;
  return (
    <span style={{display: 'inline-flex', alignItems: 'baseline', fontSize: size, color: col, ...NUM}}>
      {sfx && <Sfx at={a} name="tick" dur={(dur + total * stagger) / 30} vol={0.3} />}
      {chars.map((c, i) => {
        const fc = F[i];
        if (/\d/.test(c)) {
          const j = total - 1 - digitIdx++;                // 从右数第几位
          const fromD = /\d/.test(fc) ? parseInt(fc) : 0;
          return <Digit key={i} from={fromD} to={parseInt(c)} at={a + j * stagger} dur={dur} size={size} color={col} />;
        }
        if (c === ' ') return <span key={i} style={{display: 'inline-block', width: size * 0.3}} />;
        return <span key={i} style={{fontSize: size * (/[¥$€%]/.test(c) ? 0.72 : 1), color: col}}>{c}</span>;
      })}
    </span>
  );
};

// ---------- Flap ----------
// 真·翻牌：牌从中线分成上下两半。上半静止显示新值的上半（翻板过了 90° 才露出来），下半显示旧值的下半直到翻板落下；
// 翻板本身绕中线转：前半程正面 = 旧值上半，后半程背面 = 新值下半。中途能清楚看到"一张牌正在翻"。
// 字宽估算：汉字 1 em、ASCII 0.55 em（翻牌要固定宽，absolute 层撑不开盒子）
const estW = (s: string, size: number) => Array.from(s.replace(/\*\*|\[\[|\]\]|\(\(|\)\)|~~/g, '')).reduce((n, ch) => n + (/[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? 1 : 0.56), 0) * size;
export const Flap: React.FC<{from: React.ReactNode; to: React.ReactNode; fromText?: string; toText?: string; at: number; dur?: number; size?: number; color?: string; toColor?: string; w?: number; sfx?: boolean}> = ({from, to, fromText, toText, at: a, dur = 16, size = 96, color, toColor, w: w0, sfx = true}) => {
  const C = useC();
  const f = useCurrentFrame();
  const w = w0 ?? Math.ceil(Math.max(estW(fromText ?? String(from), size), estW(toText ?? String(to), size)) + 72);
  const k = interpolate(f, [a, a + dur], [0, 1], {...clamp, easing: easeInOut});
  const rot = k * 180;
  const h = size * 1.3;
  const base: React.CSSProperties = {width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 28px', boxSizing: 'border-box', fontSize: size, fontFamily: FONTS.title, fontWeight: 800, whiteSpace: 'nowrap', background: `${C.bg}F4`, border: `1px solid ${C.white}22`};
  const fromC = color ?? C.dim, toC = toColor ?? C.gold;
  const topClip = {clipPath: `inset(0 0 50% 0)`}, botClip = {clipPath: `inset(50% 0 0 0)`};
  // 阴影随翻板角度变：翻到一半最暗
  const shade = Math.sin((rot / 180) * Math.PI) * 0.55;
  return (
    <span style={{display: 'inline-block', position: 'relative', width: w, height: h, perspective: 1100, borderRadius: 14, boxShadow: '0 14px 40px #000A', overflow: 'visible'}}>
      {sfx && <Sfx at={a} name="flip" vol={0.35} />}
      {/* 静止层：上半 = 新值上半（翻板过 90° 前被翻板挡住，但画着没关系），下半 = 旧值下半 → 翻板落下后被盖掉 */}
      <div style={{...base, ...topClip, position: 'absolute', inset: 0, color: toC, borderRadius: '14px 14px 0 0'}}>{to}</div>
      <div style={{...base, ...botClip, position: 'absolute', inset: 0, color: rot >= 90 ? toC : fromC, borderRadius: '0 0 14px 14px'}}>{rot >= 90 ? to : from}</div>
      {/* 翻板：前半程显示旧值上半（正面），后半程显示新值下半（背面，所以要先把内容上下镜像再整体转） */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `rotateX(${-rot}deg)`, transformStyle: 'preserve-3d'}}>
        {rot < 90
          ? <div style={{...base, ...topClip, position: 'absolute', inset: 0, color: fromC, borderRadius: '14px 14px 0 0', boxShadow: `inset 0 0 0 999px rgba(0,0,0,${shade})`}}>{from}</div>
          : <div style={{...base, ...botClip, position: 'absolute', inset: 0, color: toC, borderRadius: '0 0 14px 14px', transform: 'rotateX(180deg)', boxShadow: `inset 0 0 0 999px rgba(0,0,0,${shade})`}}>{to}</div>}
      </div>
      {/* 中线 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: h / 2 - 1, height: 2, background: '#000000AA'}} />
    </span>
  );
};

// ---------- Slam ----------
// 从 3× 缩到 1×（6 帧），到位时整体抖 6 帧 + impact；可带前缀后缀。给本期的核心数字。
export const Slam: React.FC<{children: React.ReactNode; at: number; size?: number; color?: string; shake?: number; sfx?: boolean}> = ({children, at: a, size = 180, color, shake = 10, sfx = true}) => {
  const C = useC();
  const f = useCurrentFrame();
  if (f < a) return null;
  const s = interpolate(f - a, [0, 7], [2.8, 1], {...clamp, easing: easeOut});
  const o = interpolate(f - a, [0, 4], [0, 1], clamp);
  const d = f - a - 7;
  const sx = d >= 0 && d < 6 ? Math.sin(d * 3.3) * shake * ((6 - d) / 6) : 0;
  const sy = d >= 0 && d < 6 ? Math.cos(d * 2.9) * shake * 0.6 * ((6 - d) / 6) : 0;
  const blur = interpolate(f - a, [0, 6], [8, 0], clamp);
  return (
    <div style={{display: 'inline-block', transform: `scale(${s}) translate(${sx}px, ${sy}px)`, opacity: o, filter: `blur(${blur}px)`, fontSize: size, color: color ?? C.gold, fontFamily: FONTS.num, fontWeight: 900, lineHeight: 1, letterSpacing: -2, textShadow: '0 6px 40px #000E, 0 2px 6px #000A'}}>
      {sfx && <Sfx at={a + 6} name="impact" vol={0.5} />}
      {children}
    </div>
  );
};

// ---------- Rank ----------
// rows 按 order[step] 的顺序排列；换序时每行平滑移到新位置（位置恒常：同一行始终是同一个 div）。
// value 可以随 step 变（valueAt(step, row)），变化用 Flap 或直接换。
export type RankRow = {id: string; label: string; value?: string; color?: string};
export const Rank: React.FC<{rows: RankRow[]; orders: string[][]; stepAt: (i: number) => number; step: number; w?: number; rowH?: number; size?: number; hi?: string}> = ({rows, orders, stepAt, step, w = 860, rowH = 92, size = 44, hi}) => {
  const C = useC();
  const f = useCurrentFrame();
  const si = Math.min(step, orders.length - 1);
  const cur = orders[si], prev = orders[Math.max(0, si - 1)];
  const t0 = stepAt(si);
  const k = si === 0 ? 1 : interpolate(f, [t0, t0 + 26], [0, 1], {...clamp, easing: easeInOut});
  return (
    <div style={{position: 'relative', width: w, height: rows.length * rowH}}>
      {rows.map((r) => {
        const a = prev.indexOf(r.id), b = cur.indexOf(r.id);
        const y = (a + (b - a) * k) * rowH;
        // 换位时往下走的行右移、往上走的行左移，中途错开不重叠
        const x = a !== b ? Math.sin(Math.PI * k) * 110 * (b > a ? 1 : -1) : 0;
        const col = r.color ? ((C as any)[r.color] ?? r.color) : C.white;
        const isHi = hi === r.id;
        const moving = a !== b && k < 1;
        return (
          <div key={r.id} style={{position: 'absolute', left: 0, top: y, width: w, height: rowH - 10, display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', boxSizing: 'border-box', borderRadius: 16, background: isHi ? `${C.gold}22` : `${C.bg}CC`, border: `1px solid ${isHi ? C.gold : C.white + '18'}`, boxShadow: moving ? '0 18px 40px #000A' : '0 6px 20px #0006', transform: `translateX(${x}px) scale(${moving ? 1.03 : 1})`, zIndex: moving ? 2 : 1}}>
            <span style={{fontSize: 30, color: C.dim, width: 44, ...NUM}}>{String(Math.round(b + 1)).padStart(2, '0')}</span>
            <span style={{fontFamily: FONTS.title, fontWeight: 800, fontSize: size, color: col, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{r.label}</span>
            {r.value && <span style={{fontSize: size * 0.9, color: isHi ? C.gold : C.dim, ...NUM}}>{r.value}</span>}
          </div>
        );
      })}
    </div>
  );
};

// ---------- StackUnits ----------
// n 个单位一个一个落下，每个晚 gap 帧；unit 可以是任何节点（emoji / svg / 小图）。cols 列换行；超过 max 的用 "+N" 标。
const Person: React.FC<{color: string}> = ({color}) => (
  <svg viewBox="0 0 40 40" width="100%" height="100%"><circle cx="20" cy="11" r="8" fill={color} /><path d="M6 40 C6 26, 34 26, 34 40 Z" fill={color} /></svg>
);
const Bill: React.FC<{color: string}> = ({color}) => (
  <svg viewBox="0 0 40 40" width="100%" height="100%"><rect x="2" y="12" width="36" height="18" rx="3" fill={color} /><circle cx="20" cy="21" r="5" fill="#00000055" /></svg>
);
export const UNIT_GLYPHS: Record<string, React.FC<{color: string}>> = {person: Person, bill: Bill};
// gap 不写时自动：整堆在约 40 帧内落完（n 大时一帧落好几个）
export const StackUnits: React.FC<{n: number; at: number; unit: React.ReactNode; cols?: number; gap?: number; size?: number; max?: number; label?: string; color?: string}> = ({n, at: a, unit, cols = 10, gap, size = 48, max = 50, label, color}) => {
  const C = useC();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shown = Math.min(n, max);
  const rows = Math.ceil(shown / cols);
  const g = gap ?? Math.max(0.4, 40 / shown);
  const col = color ?? C.gold;
  const Glyph = typeof unit === 'string' ? UNIT_GLYPHS[unit] : undefined;
  const node = Glyph ? <Glyph color={col} /> : unit;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start'}}>
      <Sfx at={a} name="drop" dur={(shown * g) / fps + 0.3} vol={0.25} />
      <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 6, direction: 'ltr'}}>
        {Array.from({length: shown}).map((_, i) => {
          // 从下往上、从左往右填
          const r = rows - 1 - Math.floor(i / cols), c = i % cols;
          const start = a + i * g;
          const p = spring({frame: f - start, fps, config: {damping: 14, stiffness: 180}});
          const y = (1 - p) * -size * 2.2;
          return (
            <div key={i} style={{gridRow: r + 1, gridColumn: c + 1, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.85, opacity: f >= start ? Math.min(1, p * 1.5) : 0, transform: `translateY(${y}px)`, color: col, filter: 'drop-shadow(0 6px 10px #0008)'}}>{node}</div>
          );
        })}
      </div>
      {(n > max || label) && (
        <T size={30} color={C.dim}>{label ?? ''}{n > max ? ` +${n - max}` : ''}</T>
      )}
    </div>
  );
};

// ---------- Fill ----------
// 容器（圆角竖筒或横条）里液面升到 pct（0–100），液面有轻微波动；数字跟着滚。
export const Fill: React.FC<{pct: number; at: number; dur?: number; w?: number; h?: number; color?: string; label?: string; horizontal?: boolean; showPct?: boolean}> = ({pct, at: a, dur = 40, w = 160, h = 320, color, label, horizontal = false, showPct = true}) => {
  const C = useC();
  const f = useCurrentFrame();
  const k = interpolate(f, [a, a + dur], [0, pct / 100], {...clamp, easing: easeOut});
  const col = color ?? C.gold;
  const wave = Math.sin(f / 6) * 3;
  const W = horizontal ? h : w, Hh = horizontal ? w : h;
  return (
    <div style={{display: 'flex', flexDirection: horizontal ? 'row' : 'column', alignItems: 'center', gap: 14}}>
      <Sfx at={a} name="riser" dur={dur / 30} vol={0.2} />
      <div style={{position: 'relative', width: W, height: Hh, borderRadius: 24, background: `${C.bg}E0`, border: `2px solid ${C.white}33`, overflow: 'hidden', boxShadow: 'inset 0 10px 30px #000A, 0 20px 50px #000A'}}>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: horizontal ? '100%' : `${k * 100}%`, width: horizontal ? `${k * 100}%` : '100%', background: `linear-gradient(180deg, ${col}FF, ${col}BB)`, boxShadow: `0 0 30px ${col}88`}}>
          {!horizontal && <div style={{position: 'absolute', left: -10, right: -10, top: -6 + wave, height: 12, background: `${col}`, borderRadius: '50%', opacity: 0.9}} />}
        </div>
        {/* 刻度 */}
        {[25, 50, 75].map((m) => <div key={m} style={{position: 'absolute', [horizontal ? 'left' : 'bottom']: `${m}%`, [horizontal ? 'top' : 'left']: 0, [horizontal ? 'bottom' : 'right']: 0, [horizontal ? 'width' : 'height']: 1, background: '#FFFFFF22'}} />)}
      </div>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
        {showPct && <span style={{fontSize: 56, color: col, ...NUM}}>{Math.round(k * 100)}%</span>}
        {label && <T size={26} color={C.dim}>{label}</T>}
      </div>
    </div>
  );
};

// ---------- 表格行扫光 ----------
// 新行出现时一道 20% 金色横光从左扫到右，再落到正常亮度。包在行外面用。
export const RowSweep: React.FC<{at: number; children: React.ReactNode; color?: string; dur?: number}> = ({at: a, children, color, dur = 16}) => {
  const C = useC();
  const f = useCurrentFrame();
  const k = interpolate(f, [a, a + dur], [-0.3, 1.3], clamp);
  const o = interpolate(f, [a, a + 8], [0, 1], clamp);
  const col = color ?? C.gold;
  return (
    <div style={{position: 'relative', opacity: o, overflow: 'hidden', borderRadius: 12}}>
      {children}
      {k > -0.3 && k < 1.3 && <div style={{position: 'absolute', top: 0, bottom: 0, left: `${k * 100 - 15}%`, width: '30%', background: `linear-gradient(90deg, transparent, ${col}33, transparent)`, pointerEvents: 'none'}} />}
    </div>
  );
};
