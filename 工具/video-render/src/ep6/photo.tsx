// 第 6 期写实版：AI 出的电影感照片铺底 + 得意黑标题 + 代码图表。
// 照片在 assets/ep6/photos/（由 webpack 打包，不走 public/）。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, continueRender, delayRender, interpolate, useCurrentFrame} from 'remotion';
import {Theme, useC} from '../ui';
import {CountUp, FlyIn, Sfx, Stamp, StrikeLine, useSpringAt} from '../fx';

import S01 from '../../assets/ep6/photos/S01.jpg';
import S02 from '../../assets/ep6/photos/S02.jpg';
import S03 from '../../assets/ep6/photos/S03.jpg';
import S04 from '../../assets/ep6/photos/S04.jpg';
import S08 from '../../assets/ep6/photos/S08.jpg';
import S09 from '../../assets/ep6/photos/S09.jpg';
import S10 from '../../assets/ep6/photos/S10.jpg';
import S14 from '../../assets/ep6/photos/S14.jpg';
import S15 from '../../assets/ep6/photos/S15.jpg';
import S16 from '../../assets/ep6/photos/S16.jpg';
import S17 from '../../assets/ep6/photos/S17.jpg';
import S20A from '../../assets/ep6/photos/S20A.jpg';
import S20B from '../../assets/ep6/photos/S20B.jpg';
import S21A from '../../assets/ep6/photos/S21A.jpg';
import S21B from '../../assets/ep6/photos/S21B.jpg';
import S22 from '../../assets/ep6/photos/S22.jpg';
import smileyWoff2 from '../../assets/ep6/fonts/SmileySans-Oblique.ttf.woff2';

// ---------- 主题 ----------
export const THEME6P: Theme = {
  bg: '#0B0907', bg2: '#1A1410', gold: '#E07B45', white: '#F4EFE6', dim: '#CFC4B6',
  coral: '#E85D3A', teal: '#8FBFB0', font: '"Microsoft YaHei","PingFang SC","Hiragino Sans GB",sans-serif',
};
const TITLE = '"Smiley","Microsoft YaHei","PingFang SC",sans-serif';

// 加载得意黑（只需在合成根部调用一次）
export const useSmiley = () => {
  const [h] = useState(() => delayRender('load Smiley Sans'));
  useEffect(() => {
    const ff = new FontFace('Smiley', `url(${smileyWoff2}) format('woff2')`);
    ff.load().then((f) => { document.fonts.add(f); continueRender(h); }).catch(() => continueRender(h));
  }, [h]);
};

type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const SHADOW = '0 4px 28px #000D, 0 1px 4px #000A';

// ---------- 照片底：缓慢推拉 + 文字侧压暗 ----------
type Grad = 'left' | 'right' | 'top' | 'bottom' | 'none' | 'all';
const Photo: React.FC<{
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
const Spot: React.FC<{x: number; y: number; r?: number; at: number; strength?: number}> = ({x, y, r = 260, at: a, strength = 0.72}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 24], [0, strength], clamp);
  return <AbsoluteFill style={{background: `radial-gradient(circle at ${x}px ${y}px, transparent ${r}px, #000 ${r + 320}px)`, opacity: o}} />;
};

// 响声圈：从 (x,y) 一圈圈扩散
const Rings: React.FC<{x: number; y: number; at: number; color?: string; n?: number; max?: number}> = ({x, y, at: a, color, n = 3, max = 360}) => {
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
const H: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; align?: 'left' | 'center' | 'right'}> = ({children, size = 92, color, style, align = 'left'}) => {
  const C = useC();
  return <div style={{fontFamily: TITLE, fontSize: size, color: color ?? C.white, lineHeight: 1.18, textAlign: align, textShadow: SHADOW, letterSpacing: 1, ...style}}>{children}</div>;
};
const T: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties; weight?: number}> = ({children, size = 40, color, style, weight = 700}) => {
  const C = useC();
  return <div style={{fontFamily: C.font, fontWeight: weight, fontSize: size, color: color ?? C.dim, lineHeight: 1.4, textShadow: SHADOW, ...style}}>{children}</div>;
};
const Tag: React.FC<{children: React.ReactNode; color?: string; size?: number; dark?: boolean; style?: React.CSSProperties}> = ({children, color, size = 38, dark, style}) => {
  const C = useC();
  return <div style={{display: 'inline-block', fontFamily: C.font, fontWeight: 800, fontSize: size, color: dark ? C.white : C.bg, background: dark ? '#0B0907CC' : (color ?? C.gold), border: dark ? `2px solid ${C.white}44` : 'none', borderRadius: 14, padding: '10px 28px', boxShadow: '0 10px 30px #0008', ...style}}>{children}</div>;
};
const Panel: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const C = useC();
  return <div style={{background: '#0B0907D0', border: `1.5px solid ${C.white}2E`, borderRadius: 26, padding: '34px 44px', boxShadow: '0 30px 80px #000A', backdropFilter: 'blur(10px)', ...style}}>{children}</div>;
};
const Box: React.FC<{x?: number; y?: number; w?: number; right?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y = 0, w, right, children, style}) => (
  <div style={{position: 'absolute', left: x, right, top: y, width: w, display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'flex-start', ...style}}>{children}</div>
);
// 得意黑金句里的强调字
const Em: React.FC<{children: React.ReactNode; color?: string}> = ({children, color}) => { const C = useC(); return <span style={{color: color ?? C.gold}}>{children}</span>; };

// 时钟牌
const Clock: React.FC<{at: number; h: number; m0: number; m1?: number; dur?: number}> = ({at: a, h, m0, m1, dur = 40}) => {
  const f = useCurrentFrame();
  const m = m1 === undefined ? m0 : Math.round(interpolate(f, [a, a + dur], [m0, m1], clamp));
  return <FlyIn at={a} dir="down" dist={100}><Tag size={46} dark style={{fontVariantNumeric: 'tabular-nums', letterSpacing: 3}}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</Tag></FlyIn>;
};

// ================= 场景 =================

// 1. 晚上七点排队；老板再叫一个人；这下总该快了
const Shop: React.FC<P> = (p) => {
  const s1 = at(p, 1), s2 = at(p, 2);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="ambience" dur={p.dur / 30} fade={0.8} vol={0.22} />
      <Photo src={S01} dur={p.dur} zoom={[1.0, 1.12]} origin="68% 62%" grad="top" />
      <Box x={90} y={120}>
        <Clock at={6} h={19} m0={0} />
        <FlyIn at={18} dir="left" dist={120}><H size={74}>门口排了<Em>十几个人</Em></H></FlyIn>
      </Box>
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="pop" vol={0.3} /><Sfx at={s1 + 14} name="impact" vol={0.35} />
          <Box x={1080} y={300}><FlyIn at={s1} dir="up" dist={160}><Tag size={44}>老板：再叫一个人！ +1</Tag></FlyIn></Box>
        </>
      )}
      {p.step >= 2 && (
        <>
          <Sfx at={s2} name="pop" vol={0.3} />
          <Box x={90} y={330}><FlyIn at={s2} dir="left" dist={140}><H size={60} color={THEME6P.dim}>这下总该快了吧？</H></FlyIn></Box>
        </>
      )}
    </AbsoluteFill>
  );
};

// 2. 十分钟后，四个人挤来挤去；老板纳闷
const TenMin: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="tick" dur={0.9} vol={0.3} /><Sfx at={32} name="ding" vol={0.22} />
      <Photo src={S02} dur={p.dur} zoom={[1.08, 1.0]} origin="40% 40%" grad="bottom" />
      <Box x={90} y={110}>
        <Clock at={2} h={19} m0={0} m1={10} dur={30} />
      </Box>
      <Box x={90} y={620} w={1700}>
        <FlyIn at={40} dir="up" dist={120}><H size={66}>队伍还是那么长，吧台里<Em>四个人挤来挤去</Em></H></FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="impact" vol={0.45} />
            <FlyIn at={s1} dir="up" dist={120}><H size={84} color={THEME6P.gold}>人多了一个，怎么没快多少？</H></FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 3. “新人不熟练？”划掉 → 问题在身后那台机器
const Tease: React.FC<P> = (p) => {
  const s1 = at(p, 1), hit = s1 + 36;
  return (
    <AbsoluteFill>
      <Sfx at={4} name="pop" vol={0.3} />
      <Photo src={S03} dur={p.dur} zoom={[1.0, 1.14]} origin="70% 32%" grad="left" />
      {p.step >= 1 && <Spot x={1400} y={330} r={300} at={hit - 10} strength={0.6} />}
      <Box x={90} y={150} w={820}>
        <FlyIn at={4} dir="left" dist={140}>
          <div style={{position: 'relative', display: 'inline-block'}}>
            <H size={64} color={THEME6P.dim}>第一反应：<Em color={THEME6P.white}>新人不熟练？</Em></H>
            {p.step >= 1 && <StrikeLine at={s1} />}
          </div>
        </FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="swipe" vol={0.5} /><Sfx at={hit} name="impact" vol={0.6} />
            <FlyIn at={hit - 6} dir="left" dist={200}><H size={88}>问题不在人身上<br />在他身后<Em>那台机器</Em></H></FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 4. 栏目卡
const Series: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2);
  const num = Math.min(6, Math.max(1, Math.floor(interpolate(f, [s1, s1 + 18], [1, 6.99], clamp))));
  return (
    <AbsoluteFill>
      <Sfx at={0} name="flip" vol={0.4} />
      {p.step >= 1 && <><Sfx at={s1} name="tick" dur={0.65} vol={0.4} /><Sfx at={s1 + 20} name="ding" vol={0.3} /></>}
      {p.step >= 2 && <Sfx at={s2} name="cash" vol={0.3} />}
      <Photo src={S04} dur={p.dur} zoom={[1.1, 1.0]} origin="62% 55%" grad="left" />
      <Box x={90} y={140} w={900}>
        <FlyIn at={0} dir="left" dist={120}><T size={40} style={{letterSpacing: 6}}>像素呼吸 ·《100 个经济学原理》</T></FlyIn>
        {p.step >= 1 && (
          <FlyIn at={s1} dir="up" dist={160}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 28}}>
              <H size={230} color={THEME6P.gold} style={{lineHeight: 1}}>0{num}</H>
              <H size={110}>边际报酬递减</H>
            </div>
          </FlyIn>
        )}
        {p.step >= 2 && <FlyIn at={s2} dir="up" dist={100}><H size={56} color={THEME6P.dim}>不背概念，只算<Em color={THEME6P.white}>一笔账</Em></H></FlyIn>}
      </Box>
    </AbsoluteFill>
  );
};

// 章节卡
const Chapter: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Photo src={S22} dur={p.dur} zoom={[1.05, 1.1]} blur={14} dim={0.55} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
        <FlyIn at={0} dir="down" dist={80}><Tag size={40}>第 {p.chapter} 章</Tag></FlyIn>
        <FlyIn at={6} dir="up" dist={120}><H size={110} align="center">{p.title}</H></FlyIn>
        <div style={{width: interpolate(f, [10, 40], [0, 420], clamp), height: 6, background: C.gold, borderRadius: 3}} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 6. 假设几个数；一杯 15 块
const Assume: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Photo src={S04} dur={p.dur} zoom={[1.25, 1.35]} origin="50% 45%" grad="left" />
      <Box x={90} y={200} w={900}>
        <FlyIn at={0} dir="left" dist={120}><H size={60} color={THEME6P.dim}>给这家店假设几个数</H></FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="cash" vol={0.35} />
            <FlyIn at={s1} dir="up" dist={140}><H size={120}>一杯奶茶 <Em>¥15</Em></H></FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 7. 吧台人数 → 一小时出杯（50 秒，12 句）
const CUPS = [30, 60, 80, 85, 87];
const ROLES = ['接单 · 加料 · 摇 · 封口 · 打包，全是一个人', '两人分工：接单配料 / 封口打包', '第三人：补冰 · 拿杯 · 提前备料', '第四个人进来了', '第五个？吧台已经挤满了'];
const Bars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const showAt = [1, 3, 6, 9, 11];   // 每根柱子出现的句子
  const roleAt = [0, 2, 5, 8, 11];    // 分工说明出现的句子
  const H0 = 4.6, base = 800;
  const five = at(p, 10);
  const swap = interpolate(f, [at(p, 2), at(p, 2) + 24], [0, 1], clamp);
  const role = roleAt.filter((k) => p.step >= k).length - 1;
  return (
    <AbsoluteFill>
      <Photo src={S08} dur={p.dur} zoom={[1.05, 1.15]} origin="30% 50%" grad="right" opacity={1 - swap} />
      <Photo src={S02} dur={p.dur} zoom={[1.0, 1.1]} origin="30% 45%" grad="right" opacity={swap} />
      <AbsoluteFill style={{background: 'linear-gradient(90deg, #0B090700 30%, #0B0907AA 55%, #0B0907D9 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #0B0907CC 0%, #0B090766 30%, #0B090700 55%)'}} />
      <Box x={90} y={110} w={800}>
        <FlyIn at={0} dir="left" dist={120}><T size={36} style={{letterSpacing: 4}}>吧台人数 → 一小时出杯（假设）</T></FlyIn>
        {role >= 0 && <FlyIn key={role} at={at(p, roleAt[role])} dir="left" dist={120}><H size={50}>{ROLES[role]}</H></FlyIn>}
      </Box>
      {showAt.map((k) => p.step >= k && <React.Fragment key={k}><Sfx at={at(p, k)} name="swipe" vol={0.3} />{k < 11 && <Sfx at={at(p, k) + 4} name="tick" dur={0.6} vol={0.25} />}</React.Fragment>)}
      {/* 柱状图 */}
      <div style={{position: 'absolute', left: 900, width: 940, top: base - 520, height: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `3px solid ${C.white}55`}}>
        {CUPS.map((v, i) => {
          const s = at(p, showAt[i]);
          const on = p.step >= showAt[i];
          const g = on ? interpolate(f, [s, s + 25], [0, 1], {...clamp, easing: ease}) : 0;
          const last = i === 4;
          const add = i === 0 ? v : v - CUPS[i - 1];
          const hot = i === 3 && p.step >= 10;
          const ghost = i === 3 && p.step >= 7;             // “能上 100？”的预期柱
          const gg = ghost ? interpolate(f, [at(p, 7), at(p, 7) + 20], [0, 1], {...clamp, easing: ease}) : 0;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150, position: 'relative', height: '100%', justifyContent: 'flex-end'}}>
              {ghost && (
                <div style={{position: 'absolute', bottom: 0, width: 110, height: 100 * H0 * gg, border: `4px dashed ${C.dim}`, borderBottom: 'none', borderRadius: '14px 14px 0 0', opacity: p.step >= 9 ? 0.35 : 0.8}}>
                  <div style={{position: 'absolute', top: -58, left: 0, right: 0, textAlign: 'center', fontFamily: C.font, fontWeight: 900, fontSize: 44, color: C.dim, textDecoration: p.step >= 9 ? 'line-through' : 'none'}}>100?</div>
                </div>
              )}
              <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: 54, color: C.white, textShadow: SHADOW}}>{last ? '87?' : on ? <CountUp to={v} at={s + 4} dur={20} /> : v}</div>
              {on && i > 0 && <div style={{opacity: g, fontFamily: C.font, fontWeight: 800, fontSize: hot ? 50 : 36, color: add <= 5 ? C.coral : C.teal, transform: `scale(${hot ? 1 + 0.08 * Math.sin(f / 4) : 1})`, textShadow: SHADOW}}>+{add}</div>}
              <div style={{width: 110, height: v * H0 * g, borderRadius: '14px 14px 0 0', background: last ? 'transparent' : i >= 3 ? C.coral : C.gold, border: last && on ? `4px dashed ${C.coral}` : 'none', borderBottom: 'none', boxShadow: on && !last ? `0 0 30px ${(i >= 3 ? C.coral : C.gold)}66` : 'none', position: 'relative', zIndex: 1}} />
              <div style={{position: 'absolute', bottom: -56, fontFamily: C.font, fontSize: 32, color: C.dim, fontWeight: 700}}>{i + 1} 人</div>
            </div>
          );
        })}
      </div>
      {p.step >= 4 && p.step < 6 && <><Sfx at={at(p, 4)} name="ding" vol={0.25} /><Box x={90} y={330}><FlyIn at={at(p, 4)} dir="left" dist={100}><Tag size={40} color={C.teal}>直接翻倍，人多力量大</Tag></FlyIn></Box></>}
      {p.step >= 7 && p.step < 9 && <><Sfx at={at(p, 7)} name="pop" vol={0.3} /><Box x={90} y={330}><FlyIn at={at(p, 7)} dir="left" dist={100}><Tag size={40} dark>老板：再加一个，能上 100？</Tag></FlyIn></Box></>}
      {p.step >= 10 && (
        <>
          <Sfx at={five} name="error" vol={0.45} /><Sfx at={five + 2} name="impact" vol={0.5} />
          <Box x={90} y={330}><Stamp at={five} size={56} rotate={-4}>第四个人：只多了 5 杯</Stamp></Box>
        </>
      )}
    </AbsoluteFill>
  );
};

// 8. 第四个人在偷懒吗
const Lazy: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="pop" vol={0.3} />
      <Photo src={S08} dur={p.dur} zoom={[1.0, 1.12]} origin="30% 45%" grad="right" />
      <Box x={960} y={200} w={880}>
        <FlyIn at={4} dir="right" dist={140}><H size={84}>第四个人<br />在<Em>偷懒</Em>吗？</H></FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="impact" vol={0.5} />
            <Stamp at={s1} size={76} rotate={-8} color={THEME6P.teal}>没有</Stamp>
            <FlyIn at={s1 + 10} dir="up" dist={100}><H size={56} color={THEME6P.dim}>他一直在动，手上一直有活</H></FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 9. 封口机是瓶颈（26 秒）
const Machine: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3), s4 = at(p, 4);
  const swap = interpolate(f, [s4, s4 + 24], [0, 1], clamp);
  const sec = Math.min(40, Math.floor(interpolate(f, [s1 + 10, s1 + 10 + 40 * 4], [0, 40], clamp)));
  return (
    <AbsoluteFill>
      <Sfx at={0} name="pop" vol={0.3} />
      <Photo src={S09} dur={p.dur} zoom={[1.0, 1.12]} origin="25% 45%" grad="right" opacity={1 - swap} />
      <Photo src={S17} dur={p.dur} zoom={[1.05, 1.15]} origin="75% 60%" grad="left" opacity={swap} />
      {p.step < 4 && <Spot x={430} y={520} r={340} at={12} strength={0.5} />}
      {p.step < 4 && (
        <Box x={1000} y={150} w={840}>
          <FlyIn at={6} dir="right" dist={140}><H size={62} color={THEME6P.dim}>问题出在吧台<Em color={THEME6P.white}>最里面那个位子</Em></H></FlyIn>
          {p.step >= 1 && (
            <>
              <Sfx at={s1} name="pop" vol={0.3} /><Sfx at={s1 + 10} name="tick" dur={1.4} vol={0.3} />
              <FlyIn at={s1} dir="right" dist={120}><Tag size={46}>封口机 ×1</Tag></FlyIn>
              <FlyIn at={s1 + 8} dir="up" dist={100}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
                  <H size={150} color={THEME6P.gold} style={{fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{sec}</H>
                  <H size={60}>秒 / 杯</H>
                </div>
              </FlyIn>
            </>
          )}
          {p.step >= 2 && (
            <>
              <Sfx at={s2} name="ding" vol={0.3} />
              <FlyIn at={s2} dir="up" dist={100}><H size={76}>一小时顶天 <Em>90 杯</Em></H></FlyIn>
            </>
          )}
          {p.step >= 3 && <FlyIn at={s3} dir="up" dist={100}><H size={52} color={THEME6P.dim}>前面做得再快，杯子都得在它前面排队</H></FlyIn>}
        </Box>
      )}
      {p.step >= 4 && (
        <>
          <Sfx at={s4} name="whoosh" vol={0.3} /><Sfx at={s4 + 30} name="impact" vol={0.4} />
          <Box x={90} y={170} w={900}>
            <FlyIn at={s4 + 6} dir="left" dist={140}><H size={64} color={THEME6P.dim}>第四个人做好的那杯奶茶</H></FlyIn>
            <FlyIn at={s4 + 26} dir="left" dist={140}><H size={84}>没交到顾客手里<br />排在了<Em>机器前面</Em></H></FlyIn>
          </Box>
        </>
      )}
    </AbsoluteFill>
  );
};

// 10. 忙不等于出杯
const Busy: React.FC<P> = (p) => {
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3);
  return (
    <AbsoluteFill>
      <Photo src={S10} dur={p.dur} zoom={[1.0, 1.1]} origin="50% 70%" grad="top" />
      <Box x={90} y={110} w={1740} style={{alignItems: 'center'}}>
        {p.step < 2 && <FlyIn at={4} dir="down" dist={100}><H size={60} color={THEME6P.dim}>队伍外面看到的忙，是真的忙</H></FlyIn>}
        {p.step >= 1 && p.step < 2 && <><Sfx at={s1} name="impact" vol={0.5} /><FlyIn at={s1} dir="up" dist={160}><H size={140}>忙 <Em>≠</Em> 出杯</H></FlyIn></>}
        {p.step >= 2 && (
          <>
            <Sfx at={s2} name="pop" vol={0.3} />
            <FlyIn at={s2} dir="down" dist={100}><H size={56} color={THEME6P.dim}>那问题就来了</H></FlyIn>
            {p.step >= 3 && (
              <>
                <Sfx at={s3} name="swipe" vol={0.4} />
                <FlyIn at={s3} dir="up" dist={140}>
                  <div style={{display: 'flex', gap: 80, alignItems: 'center'}}>
                    <H size={72} align="center">第二个人<br /><Em color={THEME6P.teal}>值 30 杯</Em></H>
                    <H size={110} color={THEME6P.dim}>vs</H>
                    <H size={72} align="center">第四个人<br /><Em color={THEME6P.coral}>只值 5 杯</Em></H>
                  </div>
                </FlyIn>
              </>
            )}
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 12. 边际报酬定义
const Define: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1), s2 = at(p, 2);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="pop" vol={0.3} />
      <Photo src={S02} dur={p.dur} zoom={[1.05, 1.12]} blur={10} dim={0.55} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 36}}>
        <FlyIn at={0} dir="up" dist={120}>
          <div style={{textAlign: 'center'}}>
            <T size={34} style={{letterSpacing: 8}}>MARGINAL RETURN</T>
            <H size={150} align="center">边际<Em>报酬</Em></H>
          </div>
        </FlyIn>
        {p.step >= 1 && <><Sfx at={s1} name="ding" vol={0.25} /><FlyIn at={s1} dir="up" dist={100}><H size={64} align="center">= 新加这个人，<Em>多做出了</Em>多少杯</H></FlyIn></>}
        {p.step >= 2 && (
          <>
            <Sfx at={s2} name="swipe" vol={0.4} />
            <FlyIn at={s2} dir="up" dist={100}>
              <div style={{display: 'flex', gap: 40, alignItems: 'center'}}>
                <Tag size={44} color={C.teal}>多做出多少</Tag>
                <T size={44}>不是</T>
                <div style={{position: 'relative'}}><Tag size={44} dark>店里一共做了多少</Tag><StrikeLine at={s2 + 14} /></div>
              </div>
            </FlyIn>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 13. 增量一路往下掉：30 30 20 5 2
const Drop: React.FC<{at: number; children: React.ReactNode}> = ({at: a, children}) => {
  const sp = useSpringAt(a, {damping: 12, stiffness: 140});
  return <div style={{opacity: sp, transform: `translateY(${(1 - sp) * -120}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>{children}</div>;
};
const Marginal: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3);
  const nums = [30, 30, 20, 5, 2];
  return (
    <AbsoluteFill>
      <Photo src={S04} dur={p.dur} zoom={[1.0, 1.1]} origin="55% 60%" grad="top" />
      <Box x={90} y={130} w={1740}>
        <div style={{display: 'flex', gap: 40, alignItems: 'flex-end'}}>
          {nums.map((n, i) => (
            <React.Fragment key={i}>
              <Sfx at={10 + i * 14} name="pop" vol={0.25} />
              <Drop at={10 + i * 14}>
                <T size={30}>第 {i + 1} 人</T>
                <H size={120 - i * 10} color={n >= 20 ? C.teal : C.coral} style={{lineHeight: 1}}>+{n}</H>
              </Drop>
              {i < 4 && <H size={60} color={C.dim} style={{paddingBottom: 14}}>→</H>}
            </React.Fragment>
          ))}
        </div>
        {p.step >= 1 && <><Sfx at={s1} name="impact" vol={0.45} /><Stamp at={s1} size={64} rotate={-4}>边际报酬递减</Stamp></>}
        {p.step >= 2 && (
          <FlyIn at={s2} dir="left" dist={120}>
            <Panel style={{padding: '24px 36px'}}>
              <T size={34} color={THEME6P.gold} style={{letterSpacing: 4}}>前提</T>
              <H size={50}>吧台还是那张吧台，封口机还是那一台</H>
              {p.step >= 3 && <FlyIn at={s3} dir="up" dist={60}><H size={50} color={THEME6P.dim}>人在加，其他东西都没跟着加</H></FlyIn>}
            </Panel>
          </FlyIn>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 14. 伐木：双人锯（27 秒，8 句）
const SAW = [[1, 4, 4], [2, 10, 6], [3, 12, 2], [4, 13, 1], [5, 13, 0]];
const SawRow: React.FC<{i: number; n: number; tot: number; add: number; on: boolean; at: number}> = ({i, n, tot, add, on, at: a}) => {
  const C = useC();
  const sp = useSpringAt(a, {damping: 14, stiffness: 150});
  const o = on ? sp : 0.18;
  const col = add >= 4 ? C.teal : add >= 2 ? C.white : C.coral;
  return (
    <>
      {on && <Sfx at={a} name={add === 0 ? 'error' : 'tick'} dur={0.5} vol={add === 0 ? 0.4 : 0.25} />}
      <H size={54} style={{opacity: o}}>{n} 人</H>
      <H size={54} align="right" style={{opacity: o}}>{on ? <CountUp from={i ? SAW[i - 1][1] : 0} to={tot} at={a} dur={18} /> : tot} 棵</H>
      <H size={54} align="right" color={col} style={{opacity: o, transform: `translateX(${(1 - (on ? sp : 1)) * 60}px)`}}>+{add}</H>
    </>
  );
};
const Saw: React.FC<P> = (p) => {
  const C = useC();
  const rowAt = [3, 4, 5, 6, 7];
  return (
    <AbsoluteFill>
      <Photo src={S14} dur={p.dur} zoom={[1.0, 1.12]} origin="30% 60%" grad="right" />
      <Box x={90} y={110} w={800}>
        {p.step < 2 && <FlyIn at={4} dir="left" dist={120}><H size={60} color={THEME6P.dim}>这不是奶茶店的专利</H></FlyIn>}
        {p.step >= 1 && p.step < 3 && <FlyIn at={at(p, 1)} dir="left" dist={120}><Tag size={38} dark>OpenStax《经济学原理》· 伐木的例子</Tag></FlyIn>}
        {p.step >= 2 && <FlyIn at={at(p, 2)} dir="left" dist={120}><H size={66}>一把<Em>双人锯</Em><br />一个一个往里加工人</H></FlyIn>}
      </Box>
      {p.step >= 3 && (
        <Box x={1000} y={130} w={840}>
          <FlyIn at={at(p, 3)} dir="right" dist={140}>
            <Panel style={{padding: '20px 36px 28px', width: 760}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '8px 20px', alignItems: 'baseline'}}>
                {['工人', '一天砍树', '多了'].map((h, i) => <T key={h} size={30} style={{textAlign: i ? 'right' : 'left', letterSpacing: 3, paddingBottom: 8, borderBottom: `2px solid ${C.white}33`}}>{h}</T>)}
                {SAW.map(([n, tot, add], i) => <SawRow key={i} i={i} n={n} tot={tot} add={add} on={p.step >= rowAt[i]} at={at(p, rowAt[i])} />)}
              </div>
            </Panel>
          </FlyIn>
        </Box>
      )}
    </AbsoluteFill>
  );
};

// 15. 第五个人站着看
const Fifth: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Photo src={S15} dur={p.dur} zoom={[1.0, 1.12]} origin="88% 50%" grad="top" />
      {p.step >= 1 && <Spot x={1700} y={560} r={220} at={s1} strength={0.6} />}
      <Box x={90} y={110} w={1300}>
        <FlyIn at={4} dir="left" dist={120}><H size={60} color={THEME6P.dim}>我第一次看这张表，盯了半天<Em color={THEME6P.white}>第五个人那一栏</Em></H></FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="pop" vol={0.3} /><Sfx at={s1 + 40} name="error" vol={0.35} />
            <FlyIn at={s1} dir="left" dist={140}><H size={72}>锯子只有一把<br />第五个人除了搬搬树枝，<Em>基本就是站着看</Em></H></FlyIn>
          </>
        )}
      </Box>
      {p.step >= 1 && <Box x={1560} y={250}><FlyIn at={s1 + 40} dir="down" dist={120}><Tag size={56} color={THEME6P.coral}>+0</Tag></FlyIn></Box>}
    </AbsoluteFill>
  );
};

// 16. 总量 vs 新增
const TotalVs: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3);
  const tot = [4, 10, 12, 13, 13], add = [4, 6, 2, 1, 0];
  const base = 760, Hh = 32;
  return (
    <AbsoluteFill>
      <Photo src={S16} dur={p.dur} zoom={[1.0, 1.1]} origin="70% 50%" grad="left" />
      <AbsoluteFill style={{background: 'linear-gradient(90deg, #0B0907D9 0%, #0B0907AA 45%, #0B090700 70%)'}} />
      <Box x={90} y={100} w={1000}>
        <FlyIn at={0} dir="left" dist={120}><H size={58}>总产量<Em color={THEME6P.teal}>一直在涨</Em>：4 → 13 棵，没有掉</H></FlyIn>
        {p.step >= 1 && <FlyIn at={s1} dir="left" dist={120}><H size={58}>掉下来的，是每个新人带来的<Em color={THEME6P.coral}>那一截</Em></H></FlyIn>}
      </Box>
      <div style={{position: 'absolute', left: 120, width: 1000, top: base - 440, height: 440, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `3px solid ${C.white}55`}}>
        {tot.map((t, i) => {
          const a = 10 + i * 16;
          const g = interpolate(f, [a, a + 20], [0, 1], {...clamp, easing: ease});
          const ga = p.step >= 1 ? interpolate(f, [s1 + i * 12, s1 + i * 12 + 16], [0, 1], {...clamp, easing: ease}) : 0;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'flex-end', gap: 8, position: 'relative', height: '100%'}}>
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%'}}>
                <T size={40} color={C.white} style={{opacity: g}}>{t}</T>
                <div style={{width: 90, height: t * Hh * g, background: C.teal, borderRadius: '10px 10px 0 0', boxShadow: `0 0 24px ${C.teal}55`}} />
              </div>
              {p.step >= 1 && (
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', opacity: ga}}>
                  <T size={36} color={C.coral}>+{add[i]}</T>
                  <div style={{width: 46, height: Math.max(4, add[i] * Hh * ga), background: C.coral, borderRadius: '8px 8px 0 0'}} />
                </div>
              )}
              <div style={{position: 'absolute', bottom: -50, left: 0, right: 0, textAlign: 'center', fontFamily: C.font, fontSize: 30, color: C.dim, fontWeight: 700}}>{i + 1} 人</div>
            </div>
          );
        })}
      </div>
      {p.step >= 1 && <Sfx at={s1} name="swipe" vol={0.35} />}
      {p.step >= 2 && (
        <Box x={1150} y={330} w={720}>
          <FlyIn at={s2} dir="right" dist={120}><Tag size={38} dark>这一点很多人会搞混</Tag></FlyIn>
          {p.step >= 3 && (
            <>
              <Sfx at={s3} name="impact" vol={0.4} />
              <FlyIn at={s3} dir="up" dist={120}>
                <Panel style={{padding: '22px 34px'}}>
                  <H size={56}>递减 <Em color={THEME6P.coral}>≠</Em> 总量少了</H>
                  <H size={56} color={THEME6P.dim}>而是后面的人<Em>越来越不值</Em></H>
                </Panel>
              </FlyIn>
            </>
          )}
        </Box>
      )}
    </AbsoluteFill>
  );
};

// 17. 回到奶茶店：5 杯被封口机吃掉了
const Back: React.FC<P> = (p) => {
  const s1 = at(p, 1), s2 = at(p, 2);
  return (
    <AbsoluteFill>
      <Photo src={S17} dur={p.dur} zoom={[1.0, 1.12]} origin="78% 45%" grad="left" />
      {p.step >= 1 && <Rings x={1560} y={470} at={s1 + 10} />}
      <Box x={90} y={160} w={900}>
        <FlyIn at={4} dir="left" dist={120}><H size={66}>第四个人那 <Em color={THEME6P.teal}>5 杯</Em> 是真的<br />他没白干</H></FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="impact" vol={0.45} />
            <FlyIn at={s1} dir="left" dist={140}><H size={72}>只是大部分被那台<br />一直响的封口机<Em>吃掉了</Em></H></FlyIn>
          </>
        )}
        {p.step >= 2 && <><Sfx at={s2} name="pop" vol={0.3} /><FlyIn at={s2} dir="up" dist={100}><Tag size={44} dark>那老板该怎么办？</Tag></FlyIn></>}
      </Box>
    </AbsoluteFill>
  );
};

// 19. 前提：只加了人
const Premise: React.FC<P> = (p) => {
  const s1 = at(p, 1), s2 = at(p, 2);
  return (
    <AbsoluteFill>
      <Photo src={S09} dur={p.dur} zoom={[1.1, 1.0]} origin="30% 50%" grad="right" dim={0.2} />
      <Box x={960} y={150} w={880}>
        <FlyIn at={0} dir="right" dist={120}><Tag size={36}>先说一句前提</Tag></FlyIn>
        {p.step >= 1 && <FlyIn at={s1 + 6} dir="right" dist={140}><H size={66}>这笔账成立，是因为老板<Em>只加了人</Em><br />店面和机器都没动</H></FlyIn>}
        {p.step >= 2 && (
          <>
            <Sfx at={s2} name="swipe" vol={0.4} />
            <FlyIn at={s2} dir="up" dist={120}>
              <Panel style={{padding: '22px 34px', opacity: 0.9}}>
                <H size={46} color={THEME6P.dim}>如果同时换了一台快一倍的封口机</H>
                <H size={46} color={THEME6P.dim}>那是另一笔账，<Em>今天不算</Em></H>
              </Panel>
            </FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 20. 等的是人还是机器（34 秒）：后半分屏
const Fork: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3), s4 = at(p, 4);
  const splitL = p.step >= 2 ? interpolate(f, [s2, s2 + 26], [0, 1], {...clamp, easing: ease}) : 0;
  const splitR = p.step >= 3 ? interpolate(f, [s3, s3 + 26], [0, 1], {...clamp, easing: ease}) : 0;
  const Half: React.FC<{src: string; side: 'left' | 'right'; k: number; pos: string}> = ({src, side, k, pos}) => (
    <div style={{position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 960, overflow: 'hidden', transform: `translateX(${(side === 'left' ? -1 : 1) * (1 - k) * 960}px)`, borderRight: side === 'left' ? `3px solid ${C.bg}` : undefined}}>
      <Img src={src} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${1.02 + 0.08 * ((f - (side === 'left' ? s2 : s3)) / 700)})`}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0B0907D9 0%, #0B090766 35%, #0B090700 60%)'}} />
    </div>
  );
  return (
    <AbsoluteFill>
      <Photo src={S02} dur={p.dur} zoom={[1.0, 1.1]} origin="50% 50%" grad="top" dim={0.25} />
      {p.step < 2 && (
        <Box x={90} y={120} w={1740} style={{alignItems: 'center'}}>
          <FlyIn at={4} dir="down" dist={100}><H size={56} color={THEME6P.dim} align="center">在什么都没变的情况下，下次想加人，先做一件事</H></FlyIn>
          {p.step >= 1 && <><Sfx at={s1} name="pop" vol={0.3} /><FlyIn at={s1} dir="up" dist={140}><H size={80} align="center">跟着新人走一遍<br />看他在<Em>哪一步停下来等</Em></H></FlyIn></>}
        </Box>
      )}
      {p.step >= 2 && <Sfx at={s2} name="whoosh" vol={0.35} />}
      {p.step >= 3 && <Sfx at={s3} name="whoosh" vol={0.35} />}
      {p.step >= 2 && <Half src={S20A} side="left" k={splitL} pos="left center" />}
      {p.step >= 3 && <Half src={S20B} side="right" k={splitR} pos="right center" />}
      {p.step >= 2 && (
        <Box x={70} y={100} w={820} style={{opacity: splitL}}>
          <Tag size={40} color={C.teal}>等的是人</Tag>
          <H size={48}>点单口一直空着，顾客没人理</H>
          <H size={56}>→ 加个人接单，<Em color={THEME6P.teal}>确实能多出几杯</Em></H>
        </Box>
      )}
      {p.step >= 3 && (
        <Box x={1030} y={100} w={820} style={{opacity: splitR}}>
          <Tag size={40} color={C.coral}>等的是机器</Tag>
          <H size={48}>封口机前一直排着五六个杯子</H>
          <H size={56}>→ 再加人，只是把队伍<Em color={THEME6P.coral}>挪进了吧台</Em></H>
        </Box>
      )}
      {p.step >= 4 && (
        <>
          <Sfx at={s4} name="impact" vol={0.45} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 200}}>
            <FlyIn at={s4} dir="up" dist={120}><Panel style={{padding: '22px 60px'}}><H size={64} align="center">队伍还是那条队伍，只是<Em>换了个地方排</Em></H></Panel></FlyIn>
          </AbsoluteFill>
        </>
      )}
    </AbsoluteFill>
  );
};

// 21. 二手封口机：85 → 120；队伍散了
const Fix: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3);
  const swap = interpolate(f, [s3, s3 + 26], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Photo src={S21A} dur={p.dur} zoom={[1.0, 1.1]} origin="80% 50%" grad="top" opacity={1 - swap} />
      <Photo src={S21B} dur={p.dur} zoom={[1.06, 1.14]} origin="50% 60%" grad="top" opacity={swap} />
      {p.step >= 1 && p.step < 3 && <Rings x={1690} y={430} at={s1 + 10} n={2} max={260} />}
      {p.step < 3 && (
        <Box x={90} y={110} w={1500}>
          <FlyIn at={4} dir="left" dist={120}><H size={56} color={THEME6P.dim}>这家店的老板后来是这么干的</H></FlyIn>
          {p.step >= 1 && (
            <>
              <Sfx at={s1} name="cash" vol={0.35} />
              <FlyIn at={s1} dir="left" dist={140}><H size={66}>没再叫人，花两千多买了台<Em>二手封口机</Em>，放在吧台另一头</H></FlyIn>
            </>
          )}
          {p.step >= 2 && (
            <>
              <Sfx at={s2} name="riser" endAt={s2 + 40} vol={0.3} /><Sfx at={s2 + 40} name="ding" vol={0.35} />
              <FlyIn at={s2} dir="up" dist={140}>
                <div style={{display: 'flex', alignItems: 'baseline', gap: 30}}>
                  <T size={40}>还是那四个人，一小时出杯</T>
                  <H size={110} color={THEME6P.dim} style={{lineHeight: 1}}>85</H>
                  <H size={80} color={THEME6P.dim}>→</H>
                  <H size={150} color={THEME6P.gold} style={{lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}><CountUp from={85} to={120} at={s2 + 6} dur={36} />+</H>
                </div>
              </FlyIn>
            </>
          )}
        </Box>
      )}
      {p.step >= 3 && (
        <>
          <Sfx at={s3} name="whoosh" vol={0.3} /><Sfx at={s3 + 30} name="notify" vol={0.3} />
          <Box x={90} y={120} w={900}>
            <Clock at={s3 + 10} h={19} m0={30} />
            <FlyIn at={s3 + 26} dir="left" dist={140}><H size={80}>门口的队伍，第一次<br />在七点半之前<Em color={THEME6P.teal}>散了</Em></H></FlyIn>
          </Box>
        </>
      )}
    </AbsoluteFill>
  );
};

// 22. 金句
const Takeaway: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="ambience" dur={p.dur / 30} fade={0.8} vol={0.18} />
      <Photo src={S22} dur={p.dur} zoom={[1.0, 1.1]} origin="85% 50%" grad="none" />
      {p.step >= 1 && <Rings x={1655} y={500} at={s1 + 10} max={420} />}
      <Box x={90} y={200} w={1100}>
        <FlyIn at={6} dir="left" dist={120}>
          <T size={38} style={{letterSpacing: 4}}>以后再看到一支忙乱的队伍</T>
          <H size={76} color={THEME6P.dim}>先少问一句：<span style={{textDecoration: 'line-through', textDecorationColor: THEME6P.coral}}>还差几个人？</span></H>
        </FlyIn>
        {p.step >= 1 && (
          <>
            <Sfx at={s1} name="impact" vol={0.45} />
            <FlyIn at={s1} dir="left" dist={160}><H size={96}>多看一眼<br /><Em>哪台机器一直在响</Em></H></FlyIn>
          </>
        )}
      </Box>
    </AbsoluteFill>
  );
};

// 23. 下期预告
const Next: React.FC<P> = (p) => {
  return (
    <AbsoluteFill>
      <Photo src={S01} dur={p.dur} zoom={[1.08, 1.0]} origin="30% 60%" blur={6} dim={0.5} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40}}>
        <FlyIn at={0} dir="down" dist={100}><Tag size={38}>下期</Tag></FlyIn>
        <FlyIn at={10} dir="up" dist={140}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 36, justifyContent: 'center'}}>
            <H size={76} color={THEME6P.dim}>如果变的不是人手，而是价格</H>
          </div>
        </FlyIn>
        <FlyIn at={40} dir="up" dist={140}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 36, justifyContent: 'center'}}>
            <H size={130} color={THEME6P.dim} style={{lineHeight: 1, textDecoration: 'line-through', textDecorationColor: THEME6P.coral}}>¥15</H>
            <H size={90} color={THEME6P.dim}>→</H>
            <H size={170} color={THEME6P.gold} style={{lineHeight: 1}}>¥18</H>
          </div>
        </FlyIn>
        <Sfx at={40} name="cash" vol={0.35} /><Sfx at={100} name="pop" vol={0.3} />
        <FlyIn at={100} dir="up" dist={100}><H size={70} align="center">你还会站在这个队里吗？</H></FlyIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SCENES6P: Record<string, React.FC<any>> = {
  shop: Shop, tenmin: TenMin, tease: Tease, series: Series, chapter: Chapter, assume: Assume, bars: Bars, lazy: Lazy, machine: Machine, busy: Busy,
  define: Define, marginal: Marginal, saw: Saw, fifth: Fifth, totalvs: TotalVs, back: Back, premise: Premise, fork: Fork, fix: Fix, takeaway: Takeaway, next: Next,
};

// 入场方式：照片用淡入 + 缓推，章节卡翻入
export const ENTER6P: Record<string, 'zoom' | 'slideL' | 'slideUp' | 'blur' | 'flip'> = Object.fromEntries(Object.keys(SCENES6P).map((k) => [k, k === 'chapter' ? 'flip' : 'blur'])) as any;
// 所有场景都自己放音效，不要自动的 whoosh / pop
export const MANUAL6P = Object.keys(SCENES6P);
