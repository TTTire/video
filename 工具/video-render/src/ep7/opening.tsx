import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {LightLeak} from '@remotion/light-leaks';
import {Big, C, Chip, Person} from '../ui';
import {CountUp, FlyIn, GlassCard, IconBag, IconClock, IconFire, IconPin, IconTea, Marker, Sfx, StrikeLine, Stamp, useSpringAt} from '../fx';

type P = {steps: number[]; step: number; dur: number};
const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const Center: React.FC<{children: React.ReactNode; gap?: number}> = ({children, gap = 36}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap, display: 'flex', flexDirection: 'column'}}>{children}</AbsoluteFill>
);

// 走进画面的队伍 + 发光店门
const WalkQueue: React.FC<{at?: number; n?: number; gold?: number; top?: number}> = ({at: a = 0, n = 13, gold = -1, top = 430}) => {
  const f = useCurrentFrame();
  const doorPulse = 0.75 + 0.25 * Math.sin(f / 10);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, height: 360}}>
      <div style={{position: 'absolute', right: 160, top: -40, width: 200, height: 320, borderRadius: '100px 100px 10px 10px', background: `radial-gradient(circle at 50% 40%, #FFF1CC, ${C.gold} 45%, #6E4E1A)`, boxShadow: `0 0 ${140 * doorPulse}px ${C.gold}AA`}} />
      <div style={{position: 'absolute', right: 160, top: 292, width: 200, textAlign: 'center', fontFamily: C.font, color: C.gold, fontSize: 28, letterSpacing: 8}}>BOUTIQUE</div>
      <div style={{position: 'absolute', right: 390, top: 90, display: 'flex', flexDirection: 'row-reverse', gap: 14}}>
        {Array.from({length: n}).map((_, i) => {
          const start = a + i * 4;
          const x = interpolate(f, [start, start + 26], [-900, 0], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
          const walking = f < start + 26;
          const bob = walking ? Math.abs(Math.sin((f + i * 5) / 3)) * -10 : Math.sin((f + i * 7) / 18) * 2;
          const isGold = gold >= 0 && f >= gold + i * 3;
          return <div key={i} style={{transform: `translate(${x}px, ${bob}px)`}}><Person color={isGold ? C.gold : C.dim} size={62} /></div>;
        })}
      </div>
    </div>
  );
};

// 1. 热搜榜
const Hot: React.FC<P> = () => {
  const f = useCurrentFrame();
  const row = useSpringAt(18);
  const rows = [0, 1, 2, 3];
  return (
    <AbsoluteFill>
      <Sfx at={0} name="pop" />
      <Sfx at={18} name="whoosh" />
      <Sfx at={26} name="typing" dur={0.6} vol={0.25} />
      <Sfx at={60} name="ding" vol={0.25} />
      <div style={{position: 'absolute', left: 190, top: 170}}>
        <FlyIn at={0} dir="left">
          <GlassCard style={{width: 900, padding: '30px 40px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22}}>
              <IconFire size={56} /><Big size={46} style={{textAlign: 'left'}}>热搜榜</Big>
              <div style={{marginLeft: 'auto'}}><Chip size={30} color={C.dim}>2023 年 2 月</Chip></div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '18px 24px', borderRadius: 18, background: `${C.coral}22`, border: `2px solid ${C.coral}`, transform: `translateY(${(1 - row) * -80}px)`, opacity: row, boxShadow: `0 0 ${30 + Math.sin(f / 5) * 10}px ${C.coral}55`}}>
              <Big size={50} color={C.coral}>1</Big><Big size={52} style={{textAlign: 'left'}}>LV 将涨价 20%</Big>
              <div style={{marginLeft: 'auto', background: C.coral, color: C.white, fontFamily: C.font, fontWeight: 900, fontSize: 32, borderRadius: 10, padding: '4px 14px'}}>爆</div>
            </div>
            {rows.map((r) => (
              <div key={r} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '16px 24px', transform: `translateY(${(1 - row) * -80}px)`}}>
                <Big size={40} color={C.dim}>{r + 2}</Big>
                <div style={{height: 22, width: 420 - r * 60, borderRadius: 11, background: `${C.white}22`}} />
              </div>
            ))}
          </GlassCard>
        </FlyIn>
      </div>
      <div style={{position: 'absolute', right: 180, top: 300, textAlign: 'center'}}>
        <FlyIn at={50} dir="right">
          <Big size={60} color={C.dim}>最多涨</Big>
          <Big size={230} color={C.gold} style={{textShadow: `0 0 60px ${C.gold}88`}}><CountUp to={20} at={55} dur={24} />%</Big>
        </FlyIn>
      </div>
    </AbsoluteFill>
  );
};

// 2. 三城排队 + 1 小时 + 断货
const Queue: React.FC<P> = (p) => {
  const s1 = at(p, 1);
  return (
    <AbsoluteFill>
      <Sfx at={10} name="whoosh" vol={0.2} />
      <Sfx at={0} name="ambience" dur={p.dur / 30} fade={0.8} vol={0.25} />
      {['北京', '上海', '杭州'].map((c, i) => (
        <React.Fragment key={c}>
          <Sfx at={4 + i * 10} name="pop" vol={0.3} />
          <div style={{position: 'absolute', left: 150 + i * 280, top: 150}}>
            <FlyIn at={4 + i * 10} dir="down" dist={120}>
              <div style={{display: 'flex', alignItems: 'center', gap: 6}}><IconPin /><Big size={56}>{c}</Big></div>
            </FlyIn>
          </div>
        </React.Fragment>
      ))}
      <WalkQueue at={12} />
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="pop" />
          <div style={{position: 'absolute', left: 150, top: 280}}>
            <FlyIn at={s1} dir="left">
              <div style={{display: 'flex', alignItems: 'center', gap: 20}}><IconClock size={90} at={s1} /><Big size={70}>排队 <span style={{color: C.gold}}>1 小时</span> 才进店</Big></div>
            </FlyIn>
          </div>
          <Sfx at={s1 + 50} name="impact" vol={0.6} />
          <div style={{position: 'absolute', right: 150, top: 110}}><Stamp at={s1 + 50} size={96}>断货</Stamp></div>
        </>
      )}
    </AbsoluteFill>
  );
};

// 3. 越贵越抢？
const Question: React.FC<P> = () => {
  const f = useCurrentFrame();
  const a = useSpringAt(4), b = useSpringAt(16);
  const q = useSpringAt(30, {damping: 7, stiffness: 140});
  return (
    <Center>
      <Sfx at={4} name="impact" vol={0.45} /><Sfx at={16} name="impact" vol={0.45} /><Sfx at={30} name="pop" />
      <div style={{display: 'flex', alignItems: 'center'}}>
        <div style={{transform: `translateX(${(1 - a) * -500}px)`, opacity: a}}><Big size={190}>越贵</Big></div>
        <div style={{transform: `translateX(${(1 - b) * 500}px)`, opacity: b}}><Big size={190} color={C.gold}>越抢</Big></div>
        <div style={{transform: `translateY(${(1 - q) * -300}px) rotate(${(1 - q) * 40}deg)`, opacity: q}}><Big size={190} color={C.coral}>？</Big></div>
      </div>
      <FlyIn at={50}><Big size={56} color={C.dim}>有钱人真奇怪……</Big></FlyIn>
      <div style={{position: 'absolute', bottom: 120, fontSize: 1, opacity: interpolate(f, [0, 10], [0, 1])}} />
    </Center>
  );
};

// 4. 需求定律被划掉
const Strike: React.FC<P> = (p) => {
  const hit = Math.round(p.dur * 0.62);
  return (
    <Center gap={44}>
      <Sfx at={0} name="pop" /><Sfx at={hit} name="swipe" vol={0.5} /><Sfx at={hit + 14} name="impact" vol={0.5} />
      <FlyIn at={0}><Chip size={48}>需求定律</Chip></FlyIn>
      <FlyIn at={12}>
        <GlassCard style={{position: 'relative'}}>
          <div style={{position: 'relative'}}><Big size={130}>贵了 → 少买</Big><StrikeLine at={hit} /></div>
        </GlassCard>
      </FlyIn>
      <div style={{height: 110}}>{useCurrentFrame() >= hit + 14 && <Stamp at={hit + 14} size={70} rotate={-4}>对奢侈品不管用？</Stamp>}</div>
    </Center>
  );
};

// 5. 正好反过来：文字翻转
const Flip: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const s1 = at(p, 1);
  const flipAt = s1 + 45;
  const r = interpolate(f, [flipAt, flipAt + 18], [180, 0], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <Center gap={50}>
      <Sfx at={s1} name="pop" vol={0.25} /><Sfx at={flipAt} name="flip" vol={0.5} />
      <FlyIn at={0}><Big size={76} color={C.dim}>我一开始也是这么想的</Big></FlyIn>
      {p.step >= 1 && (
        <FlyIn at={s1}>
          <div style={{transform: `perspective(1200px) rotateX(${r}deg)`, transformOrigin: '50% 50%'}}>
            <Big size={170} color={C.gold} style={{textShadow: `0 0 50px ${C.gold}66`}}>正好反过来</Big>
          </div>
        </FlyIn>
      )}
    </Center>
  );
};

// 6. 队伍逐个变金 = 需求定律
const QueueLaw: React.FC<P> = () => (
  <AbsoluteFill>
    <Sfx at={0} name="riser" endAt={58} vol={0.4} /><Sfx at={58} name="ding" vol={0.3} />
    <WalkQueue at={-100} gold={10} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 150}}>
      <FlyIn at={30}><Big size={96}>这支队伍 = <Marker at={55}><span style={{color: C.gold}}>需求定律</span></Marker></Big></FlyIn>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 830}}><FlyIn at={70}><Big size={50} color={C.dim}>最标准的样子</Big></FlyIn></div>
  </AbsoluteFill>
);

// 7. 栏目卡：3D 翻入 + 编号滚动 + 奶茶→包
const Series: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const flip = useSpringAt(0, {damping: 16, stiffness: 90});
  const s1 = at(p, 1), s2 = at(p, 2);
  const num = Math.min(7, Math.max(1, Math.floor(interpolate(f, [s1, s1 + 21], [1, 7.99], clamp))));
  const tea = useSpringAt(s2), arrow = useSpringAt(s2 + 12), bag = useSpringAt(s2 + 22, {damping: 9, stiffness: 150});
  return (
    <AbsoluteFill>
      <Sfx at={0} name="flip" vol={0.45} />
      {p.step >= 1 && <Sfx at={s1} name="tick" dur={0.75} vol={0.4} />}
      {p.step >= 1 && <Sfx at={s1 + 22} name="ding" vol={0.3} />}
      {p.step >= 2 && <><Sfx at={s2} name="pop" /><Sfx at={s2 + 22} name="pop" /></>}
      <AbsoluteFill style={{opacity: 0.6}}><LightLeak durationInFrames={60} seed={3} hueShift={10} /></AbsoluteFill>
      <Center gap={30}>
        <div style={{transform: `perspective(1600px) rotateY(${(1 - flip) * 90}deg)`, opacity: flip}}>
          <GlassCard style={{textAlign: 'center', padding: '44px 90px'}}>
            <Big size={50} color={C.dim}>像素呼吸 ·《100个经济学原理》</Big>
            {p.step >= 1 && (
              <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 30, marginTop: 10}}>
                <Big size={200} color={C.gold} style={{textShadow: `0 0 60px ${C.gold}77`}}>0{num}</Big>
                <Big size={120}><Marker at={s1 + 24}>需求定律</Marker></Big>
              </div>
            )}
          </GlassCard>
        </div>
        {p.step >= 2 && (
          <div style={{display: 'flex', alignItems: 'center', gap: 50, marginTop: 10}}>
            <div style={{opacity: tea, transform: `translateX(${(1 - tea) * -200}px)`}}><IconTea size={150} /></div>
            <div style={{opacity: arrow, transform: `scaleX(${arrow})`}}><Big size={90} color={C.dim}>→</Big></div>
            <div style={{opacity: bag, transform: `scale(${bag})`}}><IconBag size={150} /></div>
            <div style={{opacity: bag}}><Big size={50} color={C.dim} style={{textAlign: 'left'}}>换一支<br />贵得多的队伍</Big></div>
          </div>
        )}
      </Center>
    </AbsoluteFill>
  );
};

export const OPENING7: Record<string, React.FC<P>> = {hot: Hot, queue: Queue, question: Question, strike: Strike, flip: Flip, queueLaw: QueueLaw, series: Series};
// 每个场景用哪种入场方式
export const ENTER7: Record<string, 'zoom' | 'slideL' | 'slideUp' | 'blur' | 'flip'> = {hot: 'zoom', queue: 'slideL', question: 'zoom', strike: 'slideUp', flip: 'blur', queueLaw: 'slideL', series: 'flip'};
// 镜头震动的时间点（场景内帧）
export const MANUAL7 = Object.keys(OPENING7);
export const SHAKE7 = (sc: any): number[] => {
  if (sc.scene === 'bill') return [25];
  if (sc.scene === 'fifty') return [sc.steps[0] + 262];
  if (sc.scene === 'queue') return [sc.steps[1] + 50];
  if (sc.scene === 'question') return [4, 16];
  if (sc.scene === 'strike') return [Math.round(sc.dur * 0.62) + 14];
  return [];
};
