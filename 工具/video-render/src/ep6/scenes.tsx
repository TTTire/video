import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Big, Card, Chip, Person, Pop, Theme, useC} from '../ui';

export const THEME6: Theme = {
  bg: '#071619', bg2: '#0E2A2F', gold: '#FF8A65', white: '#F3F1EC', dim: '#86A3A8',
  coral: '#FF5252', teal: '#4FD1C5', font: '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif',
};

type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const Center: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, display: 'flex', flexDirection: 'column'}}>{children}</AbsoluteFill>
);

const Cup: React.FC<{size?: number; color?: string; opacity?: number}> = ({size = 46, color, opacity = 1}) => {
  const C = useC();
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" style={{opacity}}>
      <rect x="4" y="2" width="32" height="6" rx="2" fill={C.white} />
      <path d="M6 10 L34 10 L30 50 L10 50 Z" fill={color ?? C.gold} />
      <circle cx="15" cy="42" r="3" fill="#3B2A22" /><circle cx="24" cy="44" r="3" fill="#3B2A22" /><circle cx="20" cy="37" r="3" fill="#3B2A22" />
    </svg>
  );
};

const Machine: React.FC<{glow?: number; label?: boolean}> = ({glow = 1, label = true}) => {
  const C = useC();
  const f = useCurrentFrame();
  const blink = 0.5 + 0.5 * Math.sin(f / 5);
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
      <div style={{width: 200, height: 220, borderRadius: 24, background: 'linear-gradient(#B8C4C8,#6E7F84)', position: 'relative', boxShadow: `0 0 ${60 * glow}px ${C.gold}88`}}>
        <div style={{position: 'absolute', left: 30, top: 30, width: 140, height: 70, borderRadius: 12, background: '#1B2B2F'}} />
        <div style={{position: 'absolute', right: 26, top: 120, width: 28, height: 28, borderRadius: 14, background: C.gold, opacity: 0.4 + 0.6 * blink * glow}} />
        <div style={{position: 'absolute', left: 50, bottom: 20, width: 100, height: 16, borderRadius: 8, background: '#2A3A3E'}} />
      </div>
      {label && <div style={{fontFamily: C.font, fontSize: 34, color: C.dim}}>封口机 ×1</div>}
    </div>
  );
};

// 奶茶店窗口 + 门口的队
const Shop: React.FC<{n?: number; workers?: number; clock?: string; shrink?: number}> = ({n = 12, workers = 3, clock = '19:00', shrink = 0}) => {
  const C = useC();
  const f = useCurrentFrame();
  const shown = Math.round(n * (1 - shrink));
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', right: 120, top: 250, width: 520, height: 420, borderRadius: 30, background: C.bg2, border: `4px solid ${C.gold}88`}}>
        <div style={{position: 'absolute', top: -70, left: 0, right: 0, textAlign: 'center', fontFamily: C.font, fontWeight: 900, fontSize: 52, color: C.gold}}>🧋 奶茶</div>
        <div style={{position: 'absolute', bottom: 30, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6}}>
          {Array.from({length: workers}).map((_, i) => <div key={i} style={{transform: `translateX(${Math.sin((f + i * 11) / 6) * 6}px)`}}><Person color={C.teal} size={70} /></div>)}
        </div>
      </div>
      <div style={{position: 'absolute', right: 680, top: 470, display: 'flex', flexDirection: 'row-reverse', gap: 12}}>
        {Array.from({length: n}).map((_, i) => (
          <div key={i} style={{opacity: i < shown ? 1 : 0.08, transform: `translateY(${Math.sin((f + i * 7) / 18) * 2}px)`}}><Person size={56} /></div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 120, top: 140}}><Chip size={52}>⏰ {clock}</Chip></div>
    </AbsoluteFill>
  );
};

const ShopScene: React.FC<P> = (p) => {
  const C = useC();
  return (
    <AbsoluteFill>
      <Shop workers={p.step >= 1 ? 4 : 3} />
      {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', right: 300, top: 70}}><Chip color={C.teal} size={52}>老板：再叫一个人！ +1</Chip></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 120, top: 250}}><Big size={60} style={{textAlign: 'left'}}>这下总该快了吧？</Big></Pop>}
    </AbsoluteFill>
  );
};

const TenMin: React.FC<P> = (p) => {
  const C = useC();
  return (
    <AbsoluteFill>
      <Shop workers={4} clock="19:10" />
      <Pop style={{position: 'absolute', left: 120, top: 250}}><Big size={60} style={{textAlign: 'left'}}>十分钟后，队伍<span style={{color: C.coral}}>还是那么长</span></Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', left: 0, right: 0, top: 800}}><Big size={72} color={C.gold}>人多了一个，怎么没快多少？</Big></Pop>}
    </AbsoluteFill>
  );
};

const Tease: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={70} color={C.dim}>第一反应：新人不熟练？</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><div style={{display: 'flex', alignItems: 'center', gap: 60}}><Big size={90}>问题在那台</Big><Machine /></div></Pop>}
    </Center>
  );
};

const Series: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={54} color={C.dim}>像素呼吸 ·《100个经济学原理》</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={140} color={C.gold}>No.6 边际报酬递减</Big></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)}><Big size={64}>不背概念，只算一笔账</Big></Pop>}
    </Center>
  );
};

const Chapter: React.FC<P> = (p) => (
  <Center><Pop><Chip>第 {p.chapter} 章</Chip></Pop><Pop delay={10}><Big size={110}>{p.title}</Big></Pop></Center>
);

const Assume: React.FC<P> = (p) => (
  <Center>
    <Pop><Chip>假设</Chip></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)}><div style={{display: 'flex', alignItems: 'center', gap: 30}}><Cup size={110} /><Big size={140}>¥15 / 杯</Big></div></Pop>}
  </Center>
);

// 1—5 个人，一小时出杯
const CUPS = [30, 60, 80, 85, 87];
const Bars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  // 第几根柱子在第几句出现
  const showAt = [1, 3, 6, 9, 11];
  const H = 5.2;
  return (
    <AbsoluteFill>
      <Pop style={{position: 'absolute', left: 0, right: 0, top: 110}}><Big size={56}>吧台人数 → 一小时出杯（假设）</Big></Pop>
      <div style={{position: 'absolute', left: 360, right: 360, top: 230, height: 560, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `4px solid ${C.dim}`}}>
        {CUPS.map((v, i) => {
          const s = at(p, showAt[i]);
          const on = p.step >= showAt[i];
          const g = on ? interpolate(f, [s, s + 25], [0, 1], clamp) : 0;
          const last = i === 4;
          const add = i === 0 ? v : v - CUPS[i - 1];
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 170, position: 'relative'}}>
              <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: 56, color: C.white}}>{last ? '87?' : v}</div>
              {on && i > 0 && <div style={{opacity: g, fontFamily: C.font, fontWeight: 800, fontSize: 38, color: add <= 5 ? C.coral : C.teal}}>+{add}</div>}
              <div style={{width: 130, height: v * H * g, borderRadius: '14px 14px 0 0', background: last ? 'transparent' : i >= 3 ? C.coral : C.gold, border: last ? `4px dashed ${C.coral}` : 'none'}} />
              <div style={{position: 'absolute', bottom: -60, fontFamily: C.font, fontSize: 36, color: C.dim}}>{i + 1} 人</div>
            </div>
          );
        })}
      </div>
      {p.step >= 4 && p.step < 6 && <Pop at={at(p, 4)} style={{position: 'absolute', left: 0, right: 0, top: 880}}><Big size={52} color={C.teal}>直接翻倍，人多力量大</Big></Pop>}
      {p.step >= 7 && p.step < 9 && <Pop at={at(p, 7)} style={{position: 'absolute', left: 0, right: 0, top: 880}}><Big size={52} color={C.gold}>再加一个，能上 100？</Big></Pop>}
      {p.step >= 10 && <Pop at={at(p, 10)} style={{position: 'absolute', left: 0, right: 0, top: 880}}><Big size={60} color={C.coral}>第四个人：只多了 5 杯</Big></Pop>}
    </AbsoluteFill>
  );
};

const Lazy: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={90}>第四个人在偷懒吗？</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={80} color={C.teal}>没有，一直在动，手上一直有活</Big></Pop>}
    </Center>
  );
};

const MachineScene: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const pile = p.step >= 3 ? Math.min(7, 1 + Math.floor((f - at(p, 3)) / 25)) : 1;
  return (
    <AbsoluteFill>
      <Pop style={{position: 'absolute', left: 0, right: 0, top: 110}}><Big size={60}>问题出在吧台最里面那个位子</Big></Pop>
      <div style={{position: 'absolute', left: 140, top: 330, display: 'flex', gap: 10}}>
        {[0, 1, 2, 3].map((i) => <Person key={i} color={C.teal} size={70} />)}
      </div>
      <div style={{position: 'absolute', left: 540, top: 440, display: 'flex', gap: 8, flexDirection: 'row'}}>
        {Array.from({length: pile}).map((_, i) => <Cup key={i} size={60} />)}
      </div>
      <div style={{position: 'absolute', left: 1080, top: 300}}><Machine /></div>
      <div style={{position: 'absolute', left: 1400, top: 420, fontSize: 90}}>→ 🙋</div>
      {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', left: 1020, top: 620}}><Chip>一杯约 40 秒</Chip></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 1020, top: 720}}><Chip color={C.coral}>一小时顶天 90 杯</Chip></Pop>}
      {p.step >= 4 && <Pop at={at(p, 4)} style={{position: 'absolute', left: 300, top: 640}}><Big size={52} color={C.gold}>做好的杯子，排在机器前面</Big></Pop>}
    </AbsoluteFill>
  );
};

const Busy: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={80}>看到的忙，是真的忙</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={140} color={C.gold}>忙 ≠ 出杯</Big></Pop>}
      {p.step >= 3 && (
        <Pop at={at(p, 3)}><div style={{display: 'flex', gap: 60}}><Chip color={C.teal} size={56}>第 2 个人 +30 杯</Chip><Chip color={C.coral} size={56}>第 4 个人 +5 杯</Chip></div></Pop>
      )}
    </Center>
  );
};

const Define: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={120} color={C.gold}>边际报酬</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><Card><Big size={70}>= 新加这个人，<span style={{color: C.teal}}>多做出</span>了多少杯</Big></Card></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)}><Big size={56} color={C.dim}>不是：店里一共做了多少</Big></Pop>}
    </Center>
  );
};

const Marginal: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const inc = [30, 30, 20, 5, 2];
  return (
    <AbsoluteFill>
      <Pop style={{position: 'absolute', left: 0, right: 0, top: 110}}><Big size={56}>每个新人带来的增量</Big></Pop>
      <div style={{position: 'absolute', left: 420, right: 420, top: 240, height: 420, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: `4px solid ${C.dim}`}}>
        {inc.map((v, i) => {
          const g = interpolate(f, [10 + i * 18, 35 + i * 18], [0, 1], clamp);
          return (
            <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 150}}>
              <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: 54, color: C.white}}>+{v}</div>
              <div style={{width: 110, height: v * 11 * g, borderRadius: '12px 12px 0 0', background: v <= 5 ? C.coral : C.gold}} />
              <div style={{fontFamily: C.font, fontSize: 32, color: C.dim, marginTop: 10}}>第 {i + 1} 人</div>
            </div>
          );
        })}
      </div>
      {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', left: 0, right: 0, top: 730}}><Big size={90} color={C.gold}>边际报酬递减</Big></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 0, right: 0, top: 860}}><Big size={46} color={C.dim}>前提：吧台还是那张吧台，封口机还是那一台</Big></Pop>}
    </AbsoluteFill>
  );
};

const SAW = [[1, 4, 4], [2, 10, 6], [3, 12, 2], [4, 13, 1], [5, 13, 0]];
const Saw: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Chip>OpenStax《经济学原理》· 双人锯的例子</Chip></Pop>
      {p.step >= 2 && (
        <Card style={{padding: '24px 60px'}}>
          <table style={{fontFamily: C.font, fontSize: 52, color: C.white, borderCollapse: 'collapse', textAlign: 'center'}}>
            <thead><tr style={{color: C.dim, fontSize: 40}}><td style={{padding: '8px 50px'}}>工人</td><td style={{padding: '8px 50px'}}>一共锯了</td><td style={{padding: '8px 50px'}}>多出来</td></tr></thead>
            <tbody>
              {SAW.map((r, i) => (
                p.step >= 3 + i ? (
                  <tr key={i}><td>{r[0]} 人</td><td>{r[1]} 棵</td><td style={{color: r[2] <= 2 ? C.coral : C.teal, fontWeight: 900}}>{i === 0 ? '—' : `+${r[2]}`}</td></tr>
                ) : <tr key={i}><td>&nbsp;</td><td /><td /></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {p.step >= 1 && p.step < 2 && <Pop at={at(p, 1)}><Big size={70}>🪚 一把双人锯，一个一个加工人</Big></Pop>}
    </Center>
  );
};

const Fifth: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 30}}>
        <Person color={C.teal} size={90} /><div style={{fontSize: 120}}>🪚</div><Person color={C.teal} size={90} />
        <div style={{width: 80}} /><Person color={C.dim} size={90} opacity={0.6} />
      </div>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={70}>锯子只有一把，第五个人<span style={{color: C.coral}}>站着看</span></Big></Pop>}
    </Center>
  );
};

const TotalVs: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const d = interpolate(f, [10, 90], [0, 1], clamp);
  const tot = SAW.map((r, i) => [100 + i * 200, 440 - r[1] * 28]);
  const mar = SAW.map((r, i) => [100 + i * 200, 440 - (i === 0 ? 4 : r[2]) * 28]);
  const path = (pts: number[][]) => pts.map((q, i) => `${i ? 'L' : 'M'} ${q[0]} ${q[1]}`).join(' ');
  return (
    <Center>
      <svg width={1000} height={470} viewBox="0 0 1000 470">
        <line x1="60" y1="445" x2="960" y2="445" stroke={C.dim} strokeWidth="4" />
        <path d={path(tot)} fill="none" stroke={C.gold} strokeWidth="12" strokeLinecap="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - d)} />
        {p.step >= 1 && <path d={path(mar)} fill="none" stroke={C.coral} strokeWidth="12" strokeLinecap="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - interpolate(f, [at(p, 1), at(p, 1) + 80], [0, 1], clamp))} />}
        <text x="820" y="60" fill={C.gold} fontSize="44" fontWeight="900" fontFamily={C.font}>总产量 ↑</text>
        {p.step >= 1 && <text x="780" y="420" fill={C.coral} fontSize="44" fontWeight="900" fontFamily={C.font}>新增 ↓</text>}
      </svg>
      {p.step >= 3 && <Pop at={at(p, 3)}><Big size={64}>递减的是后面的人，<span style={{color: C.gold}}>不是总量</span></Big></Pop>}
    </Center>
  );
};

const Back: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <div style={{display: 'flex', alignItems: 'center', gap: 80}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}><Cup size={120} /><Big size={60} color={C.teal}>这 5 杯是真的</Big></div>
        {p.step >= 1 && <Pop at={at(p, 1)}><Machine glow={1.4} /></Pop>}
      </div>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={64}>大部分被那台一直响的机器“吃”掉了</Big></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)}><Big size={70} color={C.gold}>那老板该怎么办？</Big></Pop>}
    </Center>
  );
};

const Premise: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Chip color={C.dim}>先说一句前提</Chip></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><Big size={76}>只加了人，店面和机器都没动</Big></Pop>}
      {p.step >= 2 && <Pop at={at(p, 2)}><Big size={56} color={C.dim}>换了快一倍的封口机？那是另一笔账</Big></Pop>}
    </Center>
  );
};

const Fork: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={66}>跟着新人走一遍：他在哪一步<span style={{color: C.gold}}>停下来等</span>？</Big></Pop>
      <div style={{display: 'flex', gap: 70}}>
        {p.step >= 2 && <Pop at={at(p, 2)}><Card style={{width: 700, borderColor: C.teal}}><Big size={56} color={C.teal}>等的是人</Big><Big size={44} color={C.dim}>点单口没人理</Big><Big size={50}>→ 加人有用</Big></Card></Pop>}
        {p.step >= 3 && <Pop at={at(p, 3)}><Card style={{width: 700, borderColor: C.coral}}><Big size={56} color={C.coral}>等的是机器</Big><Big size={44} color={C.dim}>封口机前排着五六杯</Big><Big size={50}>→ 队伍挪进了吧台</Big></Card></Pop>}
      </div>
    </Center>
  );
};

const Fix: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const n = p.step >= 2 ? Math.round(interpolate(f, [at(p, 2), at(p, 2) + 60], [85, 120], clamp)) : 85;
  return (
    <AbsoluteFill>
      {p.step < 3 ? (
        <Center>
          <div style={{display: 'flex', gap: 80, alignItems: 'center'}}>
            <Machine label={false} />
            {p.step >= 1 && <Pop at={at(p, 1)}><Machine label={false} /></Pop>}
          </div>
          {p.step >= 1 && <Pop at={at(p, 1)}><Chip size={52}>+1 台二手封口机 · 两千多块</Chip></Pop>}
          {p.step >= 2 && <Pop at={at(p, 2)}><Big size={110}>还是 4 个人：<span style={{color: C.gold}}>{n}{n >= 120 ? '+' : ''} 杯</span></Big></Pop>}
        </Center>
      ) : (
        <>
          <Shop workers={4} clock="19:30" n={12} shrink={interpolate(f, [at(p, 3), at(p, 3) + 60], [0, 1], clamp)} />
          <Pop at={at(p, 3)} style={{position: 'absolute', left: 120, top: 250}}><Big size={64} style={{textAlign: 'left'}}>七点半之前，<span style={{color: C.teal}}>队伍散了</span></Big></Pop>
        </>
      )}
    </AbsoluteFill>
  );
};

const Takeaway: React.FC<P> = (p) => {
  const C = useC();
  return (
    <Center>
      <Pop><Big size={70} color={C.dim}>少问一句：还差几个人？</Big></Pop>
      {p.step >= 1 && <Pop at={at(p, 1)}><div style={{display: 'flex', alignItems: 'center', gap: 50}}><Big size={90} color={C.gold}>多看一眼：哪台机器一直在响</Big></div></Pop>}
    </Center>
  );
};

const Next: React.FC<P> = () => {
  const C = useC();
  return (
    <Center>
      <Pop><div style={{display: 'flex', alignItems: 'center', gap: 30}}><Cup size={100} /><Big size={110}>¥15 → <span style={{color: C.coral}}>¥18</span></Big></div></Pop>
      <Pop delay={30}><Big size={70}>你还会站在这个队里吗？</Big></Pop>
      <Pop delay={70}><Chip size={56}>下一期 · No.7 需求定律</Chip></Pop>
    </Center>
  );
};

export const SCENES6: Record<string, React.FC<P>> = {
  shop: ShopScene, tenmin: TenMin, tease: Tease, series: Series, chapter: Chapter, assume: Assume, bars: Bars, lazy: Lazy,
  machine: MachineScene, busy: Busy, define: Define, marginal: Marginal, saw: Saw, fifth: Fifth, totalvs: TotalVs, back: Back,
  premise: Premise, fork: Fork, fix: Fix, takeaway: Takeaway, next: Next,
};
