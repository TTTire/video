// 第 6 期动效升级版：开头 4 个场景重做 + 关键场景加动画和手动音效。
// 其余场景沿用 scenes.tsx，由 Episode 的 fx 模式自动加转场声、pop 和入场动效。
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {LightLeak} from '@remotion/light-leaks';
import {Big, Chip, Person, useC} from '../ui';
import {CountUp, FlyIn, GlassCard, IconClock, Marker, Sfx, Stamp, StrikeLine, useSpringAt} from '../fx';
import {SCENES6} from './scenes';

type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const Center: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 40}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap, display: 'flex', flexDirection: 'column'}}>{children}</AbsoluteFill>
);

// ---------- 元件 ----------
const Cup: React.FC<{size?: number; color?: string}> = ({size = 46, color}) => {
  const C = useC();
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52">
      <rect x="4" y="2" width="32" height="6" rx="2" fill={C.white} />
      <path d="M6 10 L34 10 L30 50 L10 50 Z" fill={color ?? C.gold} />
      <circle cx="15" cy="42" r="3" fill="#3B2A22" /><circle cx="24" cy="44" r="3" fill="#3B2A22" /><circle cx="20" cy="37" r="3" fill="#3B2A22" />
    </svg>
  );
};

// 封口机：一直在闪、在“响”（声波圈）
const Sealer: React.FC<{glow?: number; label?: string; size?: number; ring?: boolean}> = ({glow = 1, label = '封口机 ×1', size = 1, ring = true}) => {
  const C = useC();
  const f = useCurrentFrame();
  const blink = 0.5 + 0.5 * Math.sin(f / 4);
  const press = Math.max(0, Math.sin(f / 6)) * 18; // 压头一上一下
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, transform: `scale(${size})`}}>
      <div style={{position: 'relative', width: 210, height: 240}}>
        {ring && [0, 1, 2].map((i) => {
          const k = ((f + i * 14) % 42) / 42;
          return <div key={i} style={{position: 'absolute', left: 105 - 60 - k * 90, top: 120 - 60 - k * 90, width: 120 + k * 180, height: 120 + k * 180, borderRadius: '50%', border: `4px solid ${C.gold}`, opacity: (1 - k) * 0.5 * glow}} />;
        })}
        <div style={{position: 'absolute', inset: 0, borderRadius: 26, background: 'linear-gradient(#C3CED2,#6E7F84)', boxShadow: `0 0 ${70 * glow}px ${C.gold}99`}}>
          <div style={{position: 'absolute', left: 50, top: 20 + press, width: 110, height: 40, borderRadius: 10, background: '#37484C'}} />
          <div style={{position: 'absolute', left: 30, top: 90, width: 150, height: 70, borderRadius: 12, background: '#1B2B2F'}} />
          <div style={{position: 'absolute', right: 26, top: 178, width: 30, height: 30, borderRadius: 15, background: C.gold, opacity: 0.35 + 0.65 * blink * glow, boxShadow: `0 0 20px ${C.gold}`}} />
        </div>
      </div>
      {label && <div style={{fontFamily: C.font, fontSize: 34, color: C.dim}}>{label}</div>}
    </div>
  );
};

// 奶茶店：店面 + 吧台里的人 + 门口走进来的队伍
const ShopFx: React.FC<{n?: number; workers?: number; newWorkerAt?: number; walkAt?: number; shrink?: number; clock?: React.ReactNode}> = ({n = 12, workers = 3, newWorkerAt = -1, walkAt = -999, shrink = 0, clock}) => {
  const C = useC();
  const f = useCurrentFrame();
  const shown = Math.round(n * (1 - shrink));
  const nw = useSpringAt(newWorkerAt, {damping: 10, stiffness: 160});
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', right: 110, top: 240, width: 540, height: 440, borderRadius: 32, background: `linear-gradient(160deg, ${C.bg2}, ${C.bg})`, border: `4px solid ${C.gold}99`, boxShadow: `0 0 80px ${C.gold}33`}}>
        <div style={{position: 'absolute', top: -84, left: 0, right: 0, textAlign: 'center', fontFamily: C.font, fontWeight: 900, fontSize: 56, color: C.gold, textShadow: `0 0 ${24 + 10 * Math.sin(f / 8)}px ${C.gold}`}}>🧋 奶茶</div>
        <div style={{position: 'absolute', left: 30, right: 30, top: 300, height: 14, borderRadius: 7, background: `${C.white}33`}} />
        <div style={{position: 'absolute', bottom: 40, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8}}>
          {Array.from({length: workers}).map((_, i) => <div key={i} style={{transform: `translateX(${Math.sin((f + i * 11) / 5) * 7}px)`}}><Person color={C.teal} size={68} /></div>)}
          {newWorkerAt >= 0 && f >= newWorkerAt && <div style={{transform: `translateY(${(1 - nw) * -200}px) scale(${nw})`}}><Person color={C.gold} size={68} /></div>}
        </div>
      </div>
      <div style={{position: 'absolute', right: 690, top: 470, display: 'flex', flexDirection: 'row-reverse', gap: 12}}>
        {Array.from({length: n}).map((_, i) => {
          const s = walkAt + i * 4;
          const x = interpolate(f, [s, s + 26], [-1100, 0], {...clamp, easing: ease});
          const walking = f < s + 26;
          const bob = walking ? Math.abs(Math.sin((f + i * 5) / 3)) * -10 : Math.sin((f + i * 7) / 18) * 2;
          const gone = i >= shown;
          return <div key={i} style={{opacity: gone ? 0.08 : 1, transform: `translate(${x}px, ${bob + (gone ? 30 : 0)}px)`}}><Person size={56} /></div>;
        })}
      </div>
      {clock && <div style={{position: 'absolute', left: 120, top: 130}}>{clock}</div>}
    </AbsoluteFill>
  );
};

const ClockChip: React.FC<{children: React.ReactNode; at?: number}> = ({children, at: a = 0}) => (
  <FlyIn at={a} dir="down" dist={120}><div style={{display: 'flex', alignItems: 'center', gap: 18}}><IconClock size={80} at={a} /><Chip size={52}>{children}</Chip></div></FlyIn>
);

// ---------- 开头 ----------
// 1. 晚上七点，门口排队；老板又叫一个人；“这下总该快了”
const Shop: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1), s2 = at(p, 2);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="ambience" dur={p.dur / 30} fade={0.8} vol={0.22} />
      <Sfx at={6} name="whoosh" vol={0.25} />
      <Sfx at={16} name="pop" vol={0.25} />
      <ShopFx workers={3} walkAt={14} newWorkerAt={p.step >= 1 ? s1 + 12 : -1} clock={<ClockChip at={0}>19:00</ClockChip>} />
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="pop" vol={0.3} /><Sfx at={s1 + 12} name="impact" vol={0.35} />
          <div style={{position: 'absolute', right: 140, top: 720}}><FlyIn at={s1} dir="up"><Chip color={C.teal} size={50}>老板：再叫一个人！ <span style={{color: C.bg}}>+1</span></Chip></FlyIn></div>
        </>
      )}
      {p.step >= 2 && (
        <>
          <Sfx at={s2} name="pop" vol={0.3} />
          <div style={{position: 'absolute', left: 120, top: 270}}><FlyIn at={s2} dir="left"><GlassCard style={{padding: '24px 40px'}}><Big size={58} style={{textAlign: 'left'}}>💭 这下总该快了吧？</Big></GlassCard></FlyIn></div>
        </>
      )}
    </AbsoluteFill>
  );
};

// 2. 十分钟过去，队伍还是那么长
const TenMin: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="tick" dur={0.9} vol={0.35} /><Sfx at={30} name="ding" vol={0.25} />
      <Sfx at={50} name="pop" vol={0.3} /><Sfx at={80} name="error" vol={0.35} />
      <ShopFx workers={4} clock={<ClockChip at={0}>19:<CountUp from={0} to={10} at={2} dur={26} format={(n) => String(n).padStart(2, '0')} /></ClockChip>} />
      <div style={{position: 'absolute', left: 120, top: 270}}>
        <FlyIn at={50} dir="left"><GlassCard style={{padding: '24px 40px'}}><Big size={58} style={{textAlign: 'left'}}>十分钟后，队伍<Marker at={80} color={C.coral}>还是那么长</Marker></Big></GlassCard></FlyIn>
      </div>
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="impact" vol={0.45} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 800}}><FlyIn at={s1}><Big size={76} color={C.gold} style={{textShadow: `0 0 40px ${C.gold}66`}}>人多了一个，怎么没快多少？</Big></FlyIn></div>
        </>
      )}
    </AbsoluteFill>
  );
};

// 3. 第一反应“新人不熟练”被划掉 → 问题在那台机器
const Tease: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1);
  const hit = s1 + 40;
  return (
    <Center gap={50}>
      <Sfx at={4} name="pop" vol={0.3} />
      <FlyIn at={4}>
        <div style={{position: 'relative'}}><Big size={84} color={C.dim}>第一反应：新人不熟练？</Big>{p.step >= 1 && <StrikeLine at={s1} />}</div>
      </FlyIn>
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="swipe" vol={0.5} /><Sfx at={hit} name="impact" vol={0.6} />
          <FlyIn at={hit - 6} dist={200}>
            <div style={{display: 'flex', alignItems: 'center', gap: 70}}>
              <Big size={100}>问题在<Marker at={hit + 6}><span style={{color: C.gold}}>那台机器</span></Marker></Big>
              <Sealer label="" />
            </div>
          </FlyIn>
        </>
      )}
    </Center>
  );
};

// 4. 栏目卡：3D 翻入 + 编号滚到 06 + 关键词荧光笔
const Series: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const flip = useSpringAt(0, {damping: 16, stiffness: 90});
  const s1 = at(p, 1), s2 = at(p, 2);
  const num = Math.min(6, Math.max(1, Math.floor(interpolate(f, [s1, s1 + 18], [1, 6.99], clamp))));
  return (
    <AbsoluteFill>
      <Sfx at={0} name="flip" vol={0.45} />
      {p.step >= 1 && <><Sfx at={s1} name="tick" dur={0.65} vol={0.4} /><Sfx at={s1 + 20} name="ding" vol={0.3} /></>}
      {p.step >= 2 && <Sfx at={s2} name="cash" vol={0.3} />}
      <AbsoluteFill style={{opacity: 0.55}}><LightLeak durationInFrames={60} seed={6} hueShift={150} /></AbsoluteFill>
      <Center gap={40}>
        <div style={{transform: `perspective(1600px) rotateY(${(1 - flip) * 90}deg)`, opacity: flip}}>
          <GlassCard style={{textAlign: 'center', padding: '44px 90px'}}>
            <Big size={50} color={C.dim}>像素呼吸 ·《100个经济学原理》</Big>
            {p.step >= 1 && (
              <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 30, marginTop: 10}}>
                <Big size={200} color={C.gold} style={{textShadow: `0 0 60px ${C.gold}77`}}>0{num}</Big>
                <Big size={110}><Marker at={s1 + 22}>边际报酬递减</Marker></Big>
              </div>
            )}
          </GlassCard>
        </div>
        {p.step >= 2 && <FlyIn at={s2}><Big size={64}>不背概念，只算 <span style={{color: C.gold}}>一笔账</span> 🧾</Big></FlyIn>}
      </Center>
    </AbsoluteFill>
  );
};

// ---------- 关键场景 ----------
// 吧台人数 → 一小时出杯：柱子长出来 + 数字滚动；第四个人只多 5 杯
const CUPS = [30, 60, 80, 85, 87];
const Bars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const showAt = [1, 3, 6, 9, 11];
  const H = 5.2;
  const five = at(p, 10);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 110}}><FlyIn at={0} dist={120}><Big size={56}>吧台人数 → 一小时出杯（假设）</Big></FlyIn></div>
      {showAt.map((k, i) => p.step >= k && (
        <React.Fragment key={i}>
          <Sfx at={at(p, k)} name="swipe" vol={0.3} />
          {i < 4 && <Sfx at={at(p, k) + 4} name="tick" dur={0.6} vol={0.25} />}
        </React.Fragment>
      ))}
      <div style={{position: 'absolute', left: 360, right: 360, top: 230, height: 560, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `4px solid ${C.dim}`}}>
        {CUPS.map((v, i) => {
          const s = at(p, showAt[i]);
          const on = p.step >= showAt[i];
          const g = on ? interpolate(f, [s, s + 25], [0, 1], {...clamp, easing: ease}) : 0;
          const last = i === 4;
          const add = i === 0 ? v : v - CUPS[i - 1];
          const hot = i === 3 && p.step >= 10;
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 170, position: 'relative'}}>
              <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: 56, color: C.white}}>{last ? '87?' : on ? <CountUp to={v} at={s + 4} dur={20} /> : v}</div>
              {on && i > 0 && <div style={{opacity: g, fontFamily: C.font, fontWeight: 800, fontSize: hot ? 52 : 38, color: add <= 5 ? C.coral : C.teal, transform: `scale(${hot ? 1 + 0.1 * Math.sin(f / 4) : 1})`}}>+{add}</div>}
              <div style={{width: 130, height: v * H * g, borderRadius: '14px 14px 0 0', background: last ? 'transparent' : i >= 3 ? C.coral : `linear-gradient(${C.gold}, ${C.gold}AA)`, border: last ? `4px dashed ${C.coral}` : 'none', boxShadow: on && !last ? `0 0 30px ${(i >= 3 ? C.coral : C.gold)}55` : 'none'}} />
              <div style={{position: 'absolute', bottom: -60, fontFamily: C.font, fontSize: 36, color: C.dim}}>{i + 1} 人</div>
            </div>
          );
        })}
      </div>
      {p.step >= 4 && p.step < 6 && <><Sfx at={at(p, 4)} name="ding" vol={0.25} /><div style={{position: 'absolute', left: 0, right: 0, top: 880}}><FlyIn at={at(p, 4)} dist={100}><Big size={52} color={C.teal}>直接翻倍，人多力量大 💪</Big></FlyIn></div></>}
      {p.step >= 7 && p.step < 9 && <><Sfx at={at(p, 7)} name="pop" vol={0.3} /><div style={{position: 'absolute', left: 0, right: 0, top: 880}}><FlyIn at={at(p, 7)} dist={100}><Big size={52} color={C.gold}>再加一个，能上 100？</Big></FlyIn></div></>}
      {p.step >= 10 && (
        <>
          <Sfx at={five} name="error" vol={0.45} /><Sfx at={five + 2} name="impact" vol={0.5} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', justifyContent: 'center'}}><Stamp at={five} size={64} rotate={-3}>第四个人：只多了 5 杯</Stamp></div>
        </>
      )}
    </AbsoluteFill>
  );
};

// 封口机是瓶颈：聚光在机器上，杯子在前面越堆越多
const MachineScene: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3), s4 = at(p, 4);
  const pile = p.step >= 3 ? Math.min(7, 1 + Math.floor((f - s3) / 22)) : 1;
  const spot = interpolate(f, [10, 40], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Sfx at={0} name="pop" vol={0.3} />
      <AbsoluteFill style={{background: `radial-gradient(circle at 1180px 470px, transparent 220px, #000B 520px)`, opacity: spot * 0.6}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 100}}><FlyIn at={0} dist={120}><Big size={60}>问题出在吧台 <Marker at={20}>最里面那个位子</Marker></Big></FlyIn></div>
      <div style={{position: 'absolute', left: 140, top: 340, display: 'flex', gap: 10}}>
        {[0, 1, 2, 3].map((i) => <div key={i} style={{transform: `translateY(${Math.abs(Math.sin((f + i * 9) / 4)) * -8}px)`}}><Person color={C.teal} size={70} /></div>)}
      </div>
      <div style={{position: 'absolute', left: 520, top: 450, display: 'flex', gap: 8}}>
        {Array.from({length: pile}).map((_, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Sfx at={s3 + (i - 1) * 22} name="pop" vol={0.22} />}
            <FlyIn at={i === 0 ? 0 : s3 + (i - 1) * 22} dir="left" dist={120}><Cup size={60} /></FlyIn>
          </React.Fragment>
        ))}
      </div>
      <div style={{position: 'absolute', left: 1075, top: 290}}><Sealer label="" glow={1 + 0.4 * spot} /></div>
      <div style={{position: 'absolute', left: 1400, top: 420, fontSize: 90}}>→ 🙋</div>
      {p.step >= 1 && <><Sfx at={s1} name="tick" dur={1.2} vol={0.3} /><div style={{position: 'absolute', left: 1000, top: 650}}><FlyIn at={s1} dir="right"><div style={{display: 'flex', alignItems: 'center', gap: 14}}><IconClock size={70} at={s1} /><Chip>一杯约 40 秒</Chip></div></FlyIn></div></>}
      {p.step >= 2 && <><Sfx at={s2} name="impact" vol={0.45} /><div style={{position: 'absolute', left: 1000, top: 760}}><FlyIn at={s2} dir="right"><Chip color={C.coral}>一小时顶天 <CountUp to={90} at={s2} dur={18} /> 杯</Chip></FlyIn></div></>}
      {p.step >= 4 && <><Sfx at={s4} name="pop" vol={0.3} /><div style={{position: 'absolute', left: 240, top: 640}}><FlyIn at={s4} dir="up"><GlassCard style={{padding: '20px 36px'}}><Big size={48} color={C.gold}>做好的杯子，排在机器前面</Big></GlassCard></FlyIn></div></>}
    </AbsoluteFill>
  );
};

// 忙 ≠ 出杯
const Busy: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1), s3 = at(p, 3);
  return (
    <Center gap={50}>
      <Sfx at={0} name="pop" vol={0.3} />
      <FlyIn at={0}><Big size={80}>看到的忙，是<Marker at={20}>真的忙</Marker></Big></FlyIn>
      <div style={{height: 200, display: 'flex', alignItems: 'center'}}>
        {p.step >= 1 && <><Sfx at={s1} name="impact" vol={0.6} /><Stamp at={s1} size={130} rotate={-4}>忙 ≠ 出杯</Stamp></>}
      </div>
      {p.step >= 3 && (
        <>
          <Sfx at={s3} name="ding" vol={0.3} /><Sfx at={s3 + 16} name="error" vol={0.35} />
          <div style={{display: 'flex', gap: 60}}>
            <FlyIn at={s3} dir="left"><Chip color={C.teal} size={56}>第 2 个人 +30 杯</Chip></FlyIn>
            <FlyIn at={s3 + 16} dir="right"><Chip color={C.coral} size={56}>第 4 个人 +5 杯</Chip></FlyIn>
          </div>
        </>
      )}
    </Center>
  );
};

// 每个新人带来的增量：一根根落下来，再画一条往下的箭头
const Marginal: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const inc = [30, 30, 20, 5, 2];
  const s1 = at(p, 1), s2 = at(p, 2);
  const arrow = p.step >= 1 ? interpolate(f, [s1, s1 + 30], [0, 1], {...clamp, easing: ease}) : 0;
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 110}}><FlyIn at={0} dist={120}><Big size={56}>每个新人带来的增量</Big></FlyIn></div>
      {inc.map((_, i) => <Sfx key={i} at={10 + i * 18} name="pop" vol={0.22} />)}
      <div style={{position: 'absolute', left: 420, right: 420, top: 240, height: 420, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `4px solid ${C.dim}`}}>
        {inc.map((v, i) => {
          const g = interpolate(f, [10 + i * 18, 35 + i * 18], [0, 1], {...clamp, easing: ease});
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150}}>
              <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: 54, color: C.white}}>+{v}</div>
              <div style={{width: 110, height: v * 11 * g, borderRadius: '12px 12px 0 0', background: v <= 5 ? C.coral : C.gold, boxShadow: `0 0 26px ${(v <= 5 ? C.coral : C.gold)}55`}} />
              <div style={{fontFamily: C.font, fontSize: 32, color: C.dim, marginTop: 10}}>第 {i + 1} 人</div>
            </div>
          );
        })}
      </div>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <path d="M 560 250 Q 900 300 1360 560" fill="none" stroke={C.coral} strokeWidth="10" strokeLinecap="round" strokeDasharray={900} strokeDashoffset={900 * (1 - arrow)} />
        {arrow > 0.95 && <path d="M 1330 520 L 1370 566 L 1310 572" fill="none" stroke={C.coral} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      {p.step >= 1 && <><Sfx at={s1} name="swipe" vol={0.45} /><Sfx at={s1 + 30} name="impact" vol={0.5} /><div style={{position: 'absolute', left: 0, right: 0, top: 720}}><FlyIn at={s1 + 26} dist={140}><Big size={96} color={C.gold} style={{textShadow: `0 0 40px ${C.gold}66`}}><Marker at={s1 + 40}>边际报酬递减</Marker></Big></FlyIn></div></>}
      {p.step >= 2 && <><Sfx at={s2} name="pop" vol={0.3} /><div style={{position: 'absolute', left: 0, right: 0, top: 870}}><FlyIn at={s2} dist={80}><Big size={46} color={C.dim}>前提：吧台还是那张吧台，封口机还是那一台</Big></FlyIn></div></>}
    </AbsoluteFill>
  );
};

// 伐木表：沿用原画面，补上逐行出现的音效
const SAW_ROWS = [3, 4, 5, 6, 7];
const SawFx: React.FC<P> = (p) => (
  <AbsoluteFill>
    {p.step >= 2 && <Sfx at={at(p, 2)} name="swipe" vol={0.35} />}
    {SAW_ROWS.map((k, i) => p.step >= k && <Sfx key={k} at={at(p, k)} name={i === 4 ? 'error' : 'tick'} dur={i === 4 ? undefined : 0.4} vol={i === 4 ? 0.4 : 0.3} />)}
    {React.createElement(SCENES6.saw, p)}
  </AbsoluteFill>
);

// 总量 vs 新增：两条线画出来
const TotalVsFx: React.FC<P> = (p) => (
  <AbsoluteFill>
    <Sfx at={10} name="swipe" vol={0.4} />
    {p.step >= 1 && <Sfx at={at(p, 1)} name="swipe" vol={0.4} />}
    {p.step >= 3 && <Sfx at={at(p, 3)} name="ding" vol={0.3} />}
    {React.createElement(SCENES6.totalvs, p)}
  </AbsoluteFill>
);

// 分岔：等的是人 / 等的是机器
const ForkFx: React.FC<P> = (p) => (
  <AbsoluteFill>
    {p.step >= 2 && <Sfx at={at(p, 2)} name="ding" vol={0.3} />}
    {p.step >= 3 && <Sfx at={at(p, 3)} name="error" vol={0.35} />}
    {React.createElement(SCENES6.fork, p)}
  </AbsoluteFill>
);

// 老板的解法：第二台封口机砸下来 → 85 滚到 120 → 门口的队散了
const Fix: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3);
  const drop = useSpringAt(s1, {damping: 11, stiffness: 170});
  return (
    <AbsoluteFill>
      {p.step < 3 ? (
        <Center gap={44}>
          <Sfx at={0} name="pop" vol={0.3} />
          <FlyIn at={0} dist={100}><Big size={60} color={C.dim}>这家店的老板后来是这么干的</Big></FlyIn>
          <div style={{display: 'flex', gap: 90, alignItems: 'center'}}>
            <Sealer label="" ring={false} size={0.9} />
            {p.step >= 1 && <div style={{transform: `translateY(${(1 - drop) * -700}px)`}}><Sealer label="" size={0.9} /></div>}
          </div>
          {p.step >= 1 && <><Sfx at={s1 + 8} name="impact" vol={0.6} /><Sfx at={s1 + 22} name="cash" vol={0.35} /><FlyIn at={s1 + 20} dist={80}><Chip size={50}>+1 台二手封口机 · 两千多块</Chip></FlyIn></>}
          {p.step >= 2 && (
            <>
              <Sfx at={s2} name="tick" dur={1.4} vol={0.35} /><Sfx at={s2 + 44} name="ding" vol={0.35} />
              <FlyIn at={s2} dist={100}><Big size={104}>还是 4 个人：<span style={{color: C.gold, textShadow: `0 0 40px ${C.gold}88`}}><CountUp from={85} to={120} at={s2 + 2} dur={42} />{f >= s2 + 44 ? '+' : ''} 杯</span></Big></FlyIn>
            </>
          )}
        </Center>
      ) : (
        <>
          <Sfx at={s3} name="whoosh" vol={0.3} /><Sfx at={s3 + 64} name="ding" vol={0.35} />
          <ShopFx workers={4} n={12} shrink={interpolate(f, [s3, s3 + 60], [0, 1], {...clamp, easing: ease})} clock={<ClockChip at={s3}>19:30</ClockChip>} />
          <div style={{position: 'absolute', left: 120, top: 270}}><FlyIn at={s3 + 10} dir="left"><GlassCard style={{padding: '24px 40px'}}><Big size={60} style={{textAlign: 'left'}}>七点半之前，<Marker at={s3 + 64} color={C.teal}>队伍散了</Marker></Big></GlassCard></FlyIn></div>
        </>
      )}
    </AbsoluteFill>
  );
};

// 收尾金句
const Takeaway: React.FC<P> = (p) => {
  const C = useC();
  const s1 = at(p, 1);
  return (
    <Center gap={60}>
      <Sfx at={4} name="pop" vol={0.3} />
      <FlyIn at={4}><div style={{position: 'relative'}}><Big size={74} color={C.dim}>少问一句：还差几个人？</Big>{p.step >= 1 && <StrikeLine at={s1 - 10} color={C.dim} />}</div></FlyIn>
      {p.step >= 1 && (
        <>
          <Sfx at={s1 - 10} name="swipe" vol={0.35} />
          <Sfx at={0} name="riser" endAt={s1 + 14} vol={0.35} /><Sfx at={s1 + 14} name="ding" vol={0.35} />
          <FlyIn at={s1} dist={160}>
            <div style={{display: 'flex', alignItems: 'center', gap: 50}}>
              <Big size={92}>多看一眼：<Marker at={s1 + 16}><span style={{color: C.gold}}>哪台机器一直在响</span></Marker></Big>
              <Sealer label="" size={0.7} />
            </div>
          </FlyIn>
        </>
      )}
    </Center>
  );
};

// 下期预告：15 → 18
const Next: React.FC<P> = () => {
  const C = useC();
  return (
    <Center gap={50}>
      <Sfx at={4} name="pop" vol={0.3} /><Sfx at={30} name="tick" dur={0.6} vol={0.3} /><Sfx at={52} name="cash" vol={0.35} />
      <Sfx at={95} name="pop" vol={0.3} /><Sfx at={150} name="riser" endAt={185} vol={0.3} /><Sfx at={185} name="notify" vol={0.4} />
      <FlyIn at={4}><div style={{display: 'flex', alignItems: 'center', gap: 30}}><Cup size={110} /><Big size={120}>¥15 → <span style={{color: C.coral}}>¥<CountUp from={15} to={18} at={30} dur={20} /></span></Big></div></FlyIn>
      <FlyIn at={95}><Big size={72}>你还会站在这个队里吗？</Big></FlyIn>
      <FlyIn at={185} dist={120}><Chip size={56}>下一期 · No.7 需求定律</Chip></FlyIn>
    </Center>
  );
};

// 章节卡：玻璃卡 + 光效
const Chapter: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center gap={30}>
      <AbsoluteFill style={{opacity: 0.4}}><LightLeak durationInFrames={50} seed={(p.chapter ?? 1) * 7} hueShift={150} /></AbsoluteFill>
      <FlyIn at={0} dist={80}><Chip>第 {p.chapter} 章</Chip></FlyIn>
      <FlyIn at={8} dist={120}><GlassCard style={{padding: '30px 70px'}}><Big size={104}>{p.title}</Big></GlassCard></FlyIn>
    </Center>
  );
};

export const FX6: Record<string, React.FC<P>> = {
  shop: Shop, tenmin: TenMin, tease: Tease, series: Series, chapter: Chapter, bars: Bars, machine: MachineScene, busy: Busy,
  marginal: Marginal, saw: SawFx, totalvs: TotalVsFx, fork: ForkFx, fix: Fix, takeaway: Takeaway, next: Next,
};
// 自己放了全部音效的场景：不再自动加转场声和 pop
export const MANUAL6 = ['shop', 'tenmin', 'tease', 'series', 'bars', 'machine', 'busy', 'marginal', 'fix', 'takeaway', 'next'];
export const ENTER6: Record<string, 'zoom' | 'slideL' | 'slideUp' | 'blur' | 'flip'> = {
  shop: 'zoom', tenmin: 'blur', tease: 'slideUp', series: 'flip', bars: 'slideL', machine: 'zoom', busy: 'blur',
  marginal: 'slideL', fix: 'zoom', takeaway: 'blur', next: 'slideUp',
};
export const SHAKE6 = (sc: any): number[] => {
  if (sc.scene === 'tease') return [sc.steps[1] + 40];
  if (sc.scene === 'bars') return [sc.steps[10]];
  if (sc.scene === 'busy') return [sc.steps[1]];
  if (sc.scene === 'marginal') return [sc.steps[1] + 30];
  if (sc.scene === 'fix') return [sc.steps[1] + 8];
  return [];
};
