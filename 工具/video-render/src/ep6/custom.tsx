// 第 6 期的特殊图表：photo.json 里用 {"type":"custom","name":"bars"} 引用。
// 每个组件拿到场景的 P（steps/step/dur）和 spec，自己决定在哪一句出现什么。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {CountUp, FlyIn, Sfx, Stamp, useSpringAt} from '../fx';
import {Box, H, P, Panel, Tag, T, at, clamp, ease, SHADOW} from '../photo/kit';
import {CustomMap} from '../photo/engine';

// 吧台人数 → 一小时出杯：柱状图长在右半边，分工说明在左上
const CUPS = [30, 60, 80, 85, 87];
const ROLES = ['接单 · 加料 · 摇 · 封口 · 打包，全是一个人', '两人分工：接单配料 / 封口打包', '第三人：补冰 · 拿杯 · 提前备料', '第四个人进来了', '第五个？吧台已经挤满了'];
const Bars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const showAt = [1, 3, 6, 9, 11];   // 每根柱子出现的句子
  const roleAt = [0, 2, 5, 8, 11];    // 分工说明出现的句子
  const H0 = 4.6, base = 800;
  const five = at(p, 10);
  const role = roleAt.filter((k) => p.step >= k).length - 1;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0B090700 30%, #0B0907AA 55%, #0B0907D9 100%)'}} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0B0907CC 0%, #0B090766 30%, #0B090700 55%)'}} />
      <Box x={90} y={110} w={800}>
        <FlyIn at={0} dir="left" dist={120}><T size={36} style={{letterSpacing: 4}}>吧台人数 → 一小时出杯（假设）</T></FlyIn>
        {role >= 0 && <FlyIn key={role} at={at(p, roleAt[role])} dir="left" dist={120}><H size={50}>{ROLES[role]}</H></FlyIn>}
      </Box>
      {showAt.map((k) => p.step >= k && <React.Fragment key={k}><Sfx at={at(p, k)} name="swipe" vol={0.3} />{k < 11 && <Sfx at={at(p, k) + 4} name="tick" dur={0.6} vol={0.25} />}</React.Fragment>)}
      <div style={{position: 'absolute', left: 900, width: 940, top: base - 520, height: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `3px solid ${C.white}55`}}>
        {CUPS.map((v, i) => {
          const s = at(p, showAt[i]);
          const on = p.step >= showAt[i];
          const g = on ? interpolate(f, [s, s + 25], [0, 1], {...clamp, easing: ease}) : 0;
          const last = i === 4;
          const add = i === 0 ? v : v - CUPS[i - 1];
          const hot = i === 3 && p.step >= 10;
          const ghost = i === 3 && p.step >= 7;
          const gg = ghost ? interpolate(f, [at(p, 7), at(p, 7) + 20], [0, 1], {...clamp, easing: ease}) : 0;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150, position: 'relative', height: '100%', justifyContent: 'flex-end'}}>
              {ghost && (
                <div style={{position: 'absolute', bottom: 0, width: 110, height: 100 * H0 * gg, border: `4px dashed ${C.dim}`, borderBottom: 'none', borderRadius: '14px 14px 0 0', opacity: p.step >= 9 ? 0.35 : 0.8}}>
                  <div style={{position: 'absolute', top: -58, left: 0, right: 0, textAlign: 'center', fontFamily: C.font, fontWeight: 900, fontSize: 44, color: C.dim, opacity: p.step >= 9 ? 0 : 1}}>100?</div>
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
      {p.step >= 10 && <><Sfx at={five} name="error" vol={0.45} /><Sfx at={five + 2} name="impact" vol={0.5} /><Box x={90} y={330}><Stamp at={five} size={56} rotate={-4}>第四个人：只多了 5 杯</Stamp></Box></>}
    </>
  );
};

// 伐木表：右侧面板，按句逐行出现，第五行 +0 配 error
const SAW = [[1, 4, 4], [2, 10, 6], [3, 12, 2], [4, 13, 1], [5, 13, 0]];
const SawRow: React.FC<{i: number; n: number; tot: number; add: number; on: boolean; at: number}> = ({i, n, tot, add, on, at: a}) => {
  const C = useC();
  const sp = useSpringAt(a, {damping: 14, stiffness: 150});
  const o = on ? sp : 0.18;
  const colr = add >= 4 ? C.teal : add >= 2 ? C.white : C.coral;
  return (
    <>
      {on && <Sfx at={a} name={add === 0 ? 'error' : 'tick'} dur={0.5} vol={add === 0 ? 0.4 : 0.25} />}
      <H size={54} style={{opacity: o}}>{n} 人</H>
      <H size={54} align="right" style={{opacity: o}}>{on ? <CountUp from={i ? SAW[i - 1][1] : 0} to={tot} at={a} dur={18} /> : tot} 棵</H>
      <H size={54} align="right" color={colr} style={{opacity: o, transform: `translateX(${(1 - (on ? sp : 1)) * 60}px)`}}>+{add}</H>
    </>
  );
};
const SawTable: React.FC<P> = (p) => {
  const C = useC();
  const rowAt = [3, 4, 5, 6, 7];
  if (p.step < 3) return null;
  return (
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
  );
};

// 总量 vs 新增：左下双柱图
const TotalVsChart: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1);
  const tot = [4, 10, 12, 13, 13], add = [4, 6, 2, 1, 0];
  const base = 760, Hh = 32;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0B0907D9 0%, #0B0907AA 45%, #0B090700 70%)'}} />
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
    </>
  );
};

export const CUSTOM6: CustomMap = {bars: Bars, sawTable: SawTable, totalVsChart: TotalVsChart};
