// AI经济学 01「内存条为什么突然变贵」的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几句，at(p, i) 是第 i 句开始的帧。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {FlyIn, Sfx} from '../fx';
import {Box, FONTS, H, P, T, at, clamp, ease, SHADOW} from '../photo/kit';
import {CustomMap} from '../photo/engine';

const NUM = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: 0};
const grow = (f: number, a: number, len = 22) => interpolate(f, [a, a + len], [0, 1], {...clamp, easing: ease});
// 带一位小数的数字滚动（fx 里的 CountUp 只到整数）
const Dec: React.FC<{to: number; at: number; dur?: number}> = ({to, at: a, dur = 24}) => {
  const f = useCurrentFrame();
  return <>{interpolate(f, [a, a + dur], [0, to], {...clamp, easing: ease}).toFixed(1)}</>;
};

// ---------- 三家份额：横向柱，第 1 句逐根出现，第 2 句合计 88% ----------
const SHARE = [['三星', 39.4], ['SK 海力士', 24.9], ['美光', 23.3]] as const;
const ShareBars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 1) return null;
  const s1 = at(p, 1), s2 = at(p, 2);
  const W = 760; // 100% 对应的长度
  return (
    <>
      <Box x={90} y={250} w={1100}>
        <FlyIn at={s1} dir="left" dist={100}><T size={34} style={{letterSpacing: 4}}>全球内存芯片 · 市场份额（DRAM，2025）</T></FlyIn>
        <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 14}}>
          {SHARE.map(([name, v], i) => {
            const a = s1 + 14 + i * 16;
            const g = grow(f, a, 24);
            const hot = p.step >= 2;
            return (
              <div key={name} style={{display: 'flex', alignItems: 'center', gap: 24, opacity: Math.min(1, g * 3)}}>
                <Sfx at={a} name="swipe" vol={0.25} />
                <div style={{width: 230, fontFamily: C.title ?? C.font, fontWeight: 700, fontSize: 44, color: C.white, textShadow: SHADOW}}>{name}</div>
                <div style={{width: (v / 100) * W * g, height: 54, borderRadius: 10, background: hot ? C.gold : `${C.white}CC`, boxShadow: hot ? `0 0 28px ${C.gold}66` : 'none', transition: 'background .3s'}} />
                <div style={{fontSize: 46, fontWeight: 900, color: hot ? C.gold : C.white, textShadow: SHADOW, ...NUM, opacity: g}}><Dec to={v} at={a} dur={24} />%</div>
              </div>
            );
          })}
        </div>
      </Box>
      {p.step >= 2 && (
        <Box x={90} y={560} w={1100}>
          <Sfx at={s2} name="impact" vol={0.4} />
          <FlyIn at={s2} dir="left" dist={120}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
              <H size={60} color={C.white}>三家合计</H>
              <H size={110} color={C.gold} style={{lineHeight: 1, ...NUM}}>≈ 88%</H>
            </div>
          </FlyIn>
        </Box>
      )}
    </>
  );
};

// ---------- 普通内存 ×1 vs HBM ×3：第 2 句右侧两根柱 ----------
const HbmBars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 2) return null;
  const s2 = at(p, 2);
  const base = 740, unit = 120;
  const bars = [['普通内存', 1, C.teal], ['HBM', 3, C.coral]] as const;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, ${C.bg}D9 0%, ${C.bg}99 40%, ${C.bg}00 65%)`}} />
      <div style={{position: 'absolute', left: 1080, width: 720, top: base - 3.4 * unit, height: 3.4 * unit, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `3px solid ${C.white}55`}}>
        {bars.map(([name, v, color], i) => {
          const a = s2 + 10 + i * 30;
          const g = grow(f, a, 26);
          return (
            <div key={name} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 200, position: 'relative'}}>
              <Sfx at={a} name={i ? 'impact' : 'tick'} vol={i ? 0.4 : 0.25} />
              <div style={{opacity: g, fontSize: i ? 76 : 56, fontWeight: 900, color, textShadow: SHADOW, marginBottom: 10, ...NUM}}>×{v}</div>
              <div style={{width: 150, height: v * unit * g, borderRadius: '14px 14px 0 0', background: color, boxShadow: `0 0 30px ${color}66`}} />
              <div style={{position: 'absolute', bottom: -52, fontFamily: C.font, fontSize: 32, color: C.dim, fontWeight: 700, whiteSpace: 'nowrap'}}>{name}</div>
            </div>
          );
        })}
      </div>
      <Box x={1080} y={200} w={720}>
        <FlyIn at={s2} dir="right" dist={100}><T size={32} style={{letterSpacing: 3, textAlign: 'right'}}>同样容量 · 吃掉的晶圆面积（美光口径）</T></FlyIn>
      </Box>
    </>
  );
};

// ---------- 美光毛利率 44.7% → 86.8%：第 2 句右侧两根柱 ----------
const MarginBars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 2) return null;
  const s2 = at(p, 2);
  const base = 740, unit = 5.6;
  const bars = [['一年前', 44.7, `${C.white}CC`], ['最新季度', 86.8, C.gold]] as const;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, ${C.bg}D9 0%, ${C.bg}99 40%, ${C.bg}00 65%)`}} />
      <Box x={1080} y={150} w={720}>
        <FlyIn at={s2} dir="right" dist={100}><T size={32} style={{letterSpacing: 3, textAlign: 'right'}}>美光 · 毛利率</T></FlyIn>
      </Box>
      <div style={{position: 'absolute', left: 1080, width: 720, top: base - 100 * unit, height: 100 * unit, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `3px solid ${C.white}55`}}>
        {bars.map(([name, v, color], i) => {
          const a = s2 + 10 + i * 36;
          const g = grow(f, a, 28);
          return (
            <div key={name} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 220, position: 'relative'}}>
              <Sfx at={a} name={i ? 'ding' : 'tick'} vol={i ? 0.35 : 0.25} />
              <div style={{opacity: g, fontSize: i ? 72 : 52, fontWeight: 900, color: i ? C.gold : C.white, textShadow: SHADOW, marginBottom: 10, ...NUM}}><Dec to={v} at={a} dur={28} />%</div>
              <div style={{width: 160, height: v * unit * g, borderRadius: '14px 14px 0 0', background: color, boxShadow: i ? `0 0 30px ${C.gold}66` : 'none'}} />
              <div style={{position: 'absolute', bottom: -52, fontFamily: C.font, fontSize: 32, color: C.dim, fontWeight: 700, whiteSpace: 'nowrap'}}>{name}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ---------- 蛋糕 80 / 20：饼图在右，第 0 句扫出来，第 2 句那两成变红并跳动 ----------
const polar = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos((deg - 90) * Math.PI / 180), cy + r * Math.sin((deg - 90) * Math.PI / 180)];
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  const big = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${big} 1 ${x1} ${y1} Z`;
};
const CakePie: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0), s2 = at(p, 2);
  const cx = 1300, cy = 470, r = 240;
  const sweep = interpolate(f, [s0 + 6, s0 + 50], [0, 360], {...clamp, easing: ease});
  const a80 = Math.min(sweep, 288);
  const a20 = Math.max(0, sweep - 288);
  const hot = p.step >= 2;
  const pulse = hot ? 1 + 0.05 * Math.sin((f - s2) / 4) : 1;
  const push = hot ? interpolate(f, [s2, s2 + 18], [0, 26], {...clamp, easing: ease}) : 0;
  const [dx, dy] = polar(0, 0, push, 288 + 36);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, ${C.bg}CC 0%, ${C.bg}80 40%, ${C.bg}00 65%)`}} />
      <Sfx at={s0 + 6} name="swipe" vol={0.3} />
      {hot && <Sfx at={s2} name="impact" vol={0.45} />}
      <svg style={{position: 'absolute', left: 0, top: 0}} width={1920} height={1080}>
        {a80 > 0 && <path d={arc(cx, cy, r, 0, a80)} fill={`${C.white}55`} stroke={C.bg} strokeWidth={4} />}
        {a20 > 0 && (
          <g transform={`translate(${dx} ${dy}) translate(${cx} ${cy}) scale(${pulse}) translate(${-cx} ${-cy})`}>
            <path d={arc(cx, cy, r, 288, 288 + a20)} fill={hot ? C.coral : C.teal} stroke={C.bg} strokeWidth={4} style={{filter: `drop-shadow(0 0 24px ${(hot ? C.coral : C.teal)}99)`}} />
          </g>
        )}
        {/* 8 块的切线 */}
        {Array.from({length: 8}, (_, i) => i * 36).filter((d) => d <= a80).map((d) => { const [x, y] = polar(cx, cy, r, d); return <line key={d} x1={cx} y1={cy} x2={x} y2={y} stroke={C.bg} strokeWidth={3} opacity={0.8} />; })}
      </svg>
      <div style={{position: 'absolute', left: cx + r + 30, top: cy + 20, width: 300, opacity: grow(f, s0 + 30, 16)}}>
        <div style={{fontSize: 84, fontWeight: 900, color: C.white, textShadow: SHADOW, lineHeight: 1, ...NUM}}>80%</div>
        <div style={{fontFamily: C.font, fontSize: 30, color: C.dim, fontWeight: 700}}>已签长协 · 先切走</div>
      </div>
      <div style={{position: 'absolute', left: cx - r - 300, top: cy - 290, width: 280, textAlign: 'right', opacity: grow(f, s0 + 50, 16)}}>
        <div style={{fontSize: 84, fontWeight: 900, color: hot ? C.coral : C.teal, textShadow: SHADOW, lineHeight: 1, ...NUM}}>20%</div>
        <div style={{fontFamily: C.font, fontSize: 30, color: C.dim, fontWeight: 700}}>没签合同的人抢</div>
      </div>
    </>
  );
};

// ---------- 涨几年跌几年：第 2 句画一条波浪线，第 3 句标出转向点 ----------
const CycleLine: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 2) return null;
  const s2 = at(p, 2), s3 = at(p, 3);
  const x0 = 1000, x1 = 1820, yMid = 520, amp = 150;
  const N = 120;
  const pts: [number, number][] = Array.from({length: N + 1}, (_, i) => {
    const t = i / N;
    const x = x0 + (x1 - x0) * t;
    // 2.5 个周期，最后停在上升段末端（现在）
    const y = yMid - amp * Math.sin(t * Math.PI * 2 * 2.5 - Math.PI / 2) * (0.75 + 0.25 * t);
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const LEN = 2400;
  const drawn = interpolate(f, [s2 + 4, s2 + 70], [0, 1], {...clamp, easing: ease});
  const peaks = [0.2, 0.6, 1.0].map((t) => pts[Math.round(t * N)]);
  const troughs = [0.4, 0.8].map((t) => pts[Math.round(t * N)]);
  const head = pts[Math.min(N, Math.round(drawn * N))];
  const mark = p.step >= 3 ? grow(f, s3, 18) : 0;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: `linear-gradient(270deg, ${C.bg}D9 0%, ${C.bg}99 40%, ${C.bg}00 65%)`}} />
      <Sfx at={s2 + 4} name="swipe" vol={0.3} />
      <svg style={{position: 'absolute', left: 0, top: 0}} width={1920} height={1080}>
        <line x1={x0 - 20} y1={yMid + amp + 60} x2={x1 + 20} y2={yMid + amp + 60} stroke={`${C.white}55`} strokeWidth={3} />
        <path d={d} fill="none" stroke={C.gold} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - drawn)} style={{filter: `drop-shadow(0 0 14px ${C.gold}88)`}} />
        <circle cx={head[0]} cy={head[1]} r={12} fill={C.white} />
        {peaks.slice(0, 2).map(([x, y], i) => drawn * N >= [0.2, 0.6][i] * N && <text key={i} x={x} y={y - 26} textAnchor="middle" fontFamily={C.font} fontSize={30} fontWeight={700} fill={C.coral}>涨</text>)}
        {troughs.map(([x, y], i) => drawn * N >= [0.4, 0.8][i] * N && <text key={i} x={x} y={y + 50} textAnchor="middle" fontFamily={C.font} fontSize={30} fontWeight={700} fill={C.teal}>跌</text>)}
        {mark > 0 && (
          <g opacity={mark}>
            <circle cx={peaks[2][0]} cy={peaks[2][1]} r={22 + 10 * Math.sin(f / 5)} fill="none" stroke={C.coral} strokeWidth={4} />
            <text x={peaks[2][0] - 10} y={peaks[2][1] - 44} textAnchor="end" fontFamily={C.font} fontSize={34} fontWeight={900} fill={C.coral}>转向点在哪？</text>
          </g>
        )}
      </svg>
      {drawn >= 1 && (
        <Box x={1000} y={yMid + amp + 80} w={820}>
          <FlyIn at={s2 + 70} dir="up" dist={40}><T size={30} style={{letterSpacing: 3}}>内存行业 · 周期示意（非实际数据）</T></FlyIn>
        </Box>
      )}
    </>
  );
};

export const CUSTOMAI01: CustomMap = {shareBars: ShareBars, hbmBars: HbmBars, marginBars: MarginBars, cakePie: CakePie, cycleLine: CycleLine};
