import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Big, C, Card, Chip, Pop, Queue} from '../ui';
import {CountUp, Sfx} from '../fx';

type P = {steps: number[]; step: number; dur: number; chapter?: number; title?: string};
const Center: React.FC<{children: React.ReactNode; top?: number}> = ({children, top = 0}) => (
  <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 220 - top, gap: 40, display: 'flex', flexDirection: 'column'}}>{children}</AbsoluteFill>
);
const at = (p: P, i: number) => p.steps[Math.min(i, p.steps.length - 1)] ?? 0;

const Hot: React.FC<P> = () => (
  <Center>
    <Pop><Chip color={C.coral}>2023 年 2 月 · 热搜</Chip></Pop>
    <Pop delay={10}><Big size={120}>🔥 LV 要涨价了</Big></Pop>
    <Pop delay={25}><Big size={80} color={C.gold}>最多涨 20%</Big></Pop>
  </Center>
);

const QueueScene: React.FC<P> = (p) => (
  <AbsoluteFill>
    <Queue />
    <Pop style={{position: 'absolute', left: 140, top: 150}}><Chip>北京 · 上海 · 杭州</Chip></Pop>
    {p.step >= 1 && (
      <>
        <Pop at={at(p, 1)} style={{position: 'absolute', left: 140, top: 250}}><Big size={72} style={{textAlign: 'left'}}>排队 <span style={{color: C.gold}}>1 小时</span> 才进店</Big></Pop>
        <Pop at={at(p, 1)} delay={15} style={{position: 'absolute', right: 180, top: 120, transform: 'rotate(-8deg)'}}>
          <div style={{border: `8px solid ${C.coral}`, color: C.coral, fontFamily: C.font, fontWeight: 900, fontSize: 70, padding: '6px 30px', borderRadius: 16, transform: 'rotate(-8deg)'}}>断货</div>
        </Pop>
      </>
    )}
  </AbsoluteFill>
);

const Question: React.FC<P> = () => (
  <Center><Pop><Big size={150}>越贵越抢？</Big></Pop><Pop delay={18}><Big size={56} color={C.dim}>有钱人真奇怪</Big></Pop></Center>
);

const Strike: React.FC<P> = () => {
  const f = useCurrentFrame();
  const w = interpolate(f, [60, 90], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Center>
      <Pop><Big size={64} color={C.dim}>需求定律</Big></Pop>
      <Pop delay={10}><div style={{position: 'relative'}}><Big size={120}>贵了 → 少买</Big><div style={{position: 'absolute', left: 0, top: '52%', height: 12, width: `${w}%`, background: C.coral, borderRadius: 6}} /></div></Pop>
      <Pop delay={70}><Big size={64} color={C.coral}>对奢侈品不管用？</Big></Pop>
    </Center>
  );
};

const Flip: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={80} color={C.dim}>我一开始也是这么想的</Big></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)}><Big size={130} color={C.gold}>正好反过来</Big></Pop>}
  </Center>
);

const QueueLaw: React.FC<P> = () => (
  <AbsoluteFill>
    <Queue frontColor={C.gold} tailColor={C.gold} />
    <Pop style={{position: 'absolute', left: 0, right: 0, top: 130}}><Big size={90}>这支队伍 = <span style={{color: C.gold}}>需求定律</span></Big></Pop>
  </AbsoluteFill>
);

const Series: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={54} color={C.dim}>像素呼吸 ·《100个经济学原理》</Big></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)}><Big size={160} color={C.gold}>No.7 需求定律</Big></Pop>}
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={110}>🧋 → 👜</Big></Pop>}
  </Center>
);

const Chapter: React.FC<P> = (p) => (
  <Center>
    <Pop><Chip>第 {p.chapter} 章</Chip></Pop>
    <Pop delay={10}><Big size={110}>{p.title}</Big></Pop>
  </Center>
);

const Curve: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const d = interpolate(f, [at(p, 1), at(p, 1) + 90], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const len = 900;
  return (
    <Center top={40}>
      <Sfx at={at(p, 1)} name="swipe" vol={0.3} />
      <Pop><Big size={60}>其他条件不变：价格 ↑ 数量 ↓</Big></Pop>
      <svg width={1000} height={520} viewBox="0 0 1000 520">
        <line x1="80" y1="20" x2="80" y2="470" stroke={C.dim} strokeWidth="5" />
        <line x1="80" y1="470" x2="960" y2="470" stroke={C.dim} strokeWidth="5" />
        <text x="95" y="50" fill={C.dim} fontSize="36" fontFamily={C.font}>价格</text>
        <text x="860" y="510" fill={C.dim} fontSize="36" fontFamily={C.font}>数量</text>
        <path d="M 140 60 Q 330 380 900 430" fill="none" stroke={C.gold} strokeWidth="12" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - d)} />
      </svg>
    </Center>
  );
};

const Same: React.FC<P> = () => (
  <Center><Pop><Big size={64} color={C.dim}>注意一个前提</Big></Pop><Pop delay={12}><Big size={130} color={C.gold}>比的是同一样东西</Big></Pop></Center>
);

const Tag: React.FC<{label: string; price: React.ReactNode; color?: string}> = ({label, price, color = C.white}) => (
  <Card style={{width: 560, textAlign: 'center'}}>
    <Big size={50} color={C.dim}>{label}</Big>
    <Big size={110} color={color}>{price}</Big>
  </Card>
);
const Tags: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={56} color={C.dim}>2 月初排队的人，手里比的是什么？</Big></Pop>
    <div style={{display: 'flex', gap: 80}}>
      {p.step >= 1 && <><Sfx at={at(p, 1)} name="cash" vol={0.35} /><Pop at={at(p, 1)} mute><Tag label="今天（假设）" price="¥20,000" /></Pop></>}
      {p.step >= 2 && <><Sfx at={at(p, 2) + 6} name="tick" dur={0.8} vol={0.3} /><Sfx at={at(p, 2) + 30} name="cash" vol={0.35} /><Pop at={at(p, 2)} mute><Tag label="18 号涨价后" price={<>¥<CountUp from={20000} to={24000} at={at(p, 2) + 6} dur={24} /></>} color={C.coral} /></Pop></>}
    </div>
  </Center>
);

const Saving: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={80}>今天买，便宜 <span style={{color: C.gold}}>¥4,000</span></Big></Pop>
    {p.step >= 1 && <><Sfx at={at(p, 1)} name="ding" vol={0.3} /><Pop at={at(p, 1)} mute><Big size={170} color={C.gold}>≈ 八三折</Big></Pop></>}
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={70}>价格低了 → 买的人多了</Big></Pop>}
  </Center>
);

const Compare: React.FC<P> = () => (
  <Center>
    <Pop><Big size={70}>没有违反需求定律</Big></Pop>
    <div style={{display: 'flex', gap: 60, alignItems: 'center'}}>
      <Pop delay={40}><Chip size={60}>今天的价格</Chip></Pop>
      <Pop delay={50}><Big size={80} color={C.dim}>vs</Big></Pop>
      <Pop delay={60}><Chip size={60} color={C.coral}>下周的价格</Chip></Pop>
    </div>
  </Center>
);

const Rice: React.FC<P> = (p) => (
  <Center>
    <Sfx at={8} name="impact" vol={0.3} />
    <Pop><Card style={{borderColor: C.coral, background: '#2A1418'}}><Big size={100} color={C.coral}>明天起涨价</Big></Card></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)} delay={40}><Big size={130}>🍚 🍚</Big></Pop>}
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={80}>同一个动作：🍚 → 👜</Big></Pop>}
  </Center>
);

const Quote: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={56} color={C.dim}>还有一种人，想得更远</Big></Pop>
    {p.step >= 1 && <Sfx at={at(p, 1)} name="shutter" vol={0.35} />}
    {p.step >= 1 && (
      <Pop at={at(p, 1)} mute>
        <Card style={{maxWidth: 1400}}>
          <Big size={60} style={{textAlign: 'left'}}>“一款香奈儿的包也涨了 <span style={{color: C.gold}}>3 万多</span>……这比投资股票、基金稳健多了。”</Big>
          <Big size={36} color={C.dim} style={{textAlign: 'right', marginTop: 20}}>—— 北京一位消费者，中新经纬 2023.2</Big>
        </Card>
      </Pop>
    )}
  </Center>
);

const Formula: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={60} color={C.dim}>她心里那只包的价格</Big></Pop>
    {p.step >= 1 && (
      <Pop at={at(p, 1)}>
        <Card><Big size={84}><span style={{color: C.gold}}>真实价格</span> = 买价 − 将来能卖的钱</Big></Card>
      </Pop>
    )}
    {p.step >= 2 && <><Sfx at={at(p, 2)} name="ding" vol={0.3} /><Pop at={at(p, 2)} mute><Big size={90} color={C.teal}>≈ 0，甚至还能赚</Big></Pop></>}
  </Center>
);

const TwoKinds: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={60} color={C.dim}>门口的长队，站着两种人</Big></Pop>
    <div style={{display: 'flex', gap: 70}}>
      <Pop delay={30}><Card style={{width: 620}}><Big size={70} color={C.gold}>抢涨价前的旧价格</Big></Card></Pop>
      <Pop delay={60}><Card style={{width: 620}}><Big size={70} color={C.gold}>抢一件会升值的东西</Big></Card></Pop>
    </div>
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={76}>都觉得自己买到了 <span style={{color: C.teal}}>更便宜</span> 的那一个</Big></Pop>}
  </Center>
);

const Question2: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={80}>一年一年涨下去</Big></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)} delay={30}><Big size={120} color={C.gold}>需求定律什么时候出手？</Big></Pop>}
  </Center>
);

const CfChart: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const d = interpolate(f, [10, 120], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pts = [[100, 400], [300, 360], [500, 280], [700, 190], [900, 120]];
  const path = pts.map((q, i) => `${i ? 'L' : 'M'} ${q[0]} ${q[1]}`).join(' ');
  return (
    <Center top={40}>
      <Sfx at={10} name="swipe" vol={0.3} /><Sfx at={0} name="riser" endAt={118} vol={0.3} /><Sfx at={118} name="ding" vol={0.3} />
      <Pop><Big size={60}>香奈儿 CF 手袋：2019 → 2024</Big></Pop>
      <svg width={900} height={414} viewBox="0 0 1000 460">
        <line x1="60" y1="430" x2="960" y2="430" stroke={C.dim} strokeWidth="4" />
        {['2019', '2020', '2021', '2022', '2024'].map((y, i) => <text key={y} x={pts[i][0] - 40} y="460" fill={C.dim} fontSize="30" fontFamily={C.font}>{y}</text>)}
        <path d={path} fill="none" stroke={C.gold} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={1200} strokeDashoffset={1200 * (1 - d)} />
        <text x="700" y="90" fill={C.gold} fontSize="64" fontWeight="900" fontFamily={C.font} opacity={d}>≈ ×2</text>
      </svg>
      {p.step >= 1 && <Pop at={at(p, 1)}><Chip>店员说：一年调两次，每次约 10%</Chip></Pop>}
    </Center>
  );
};

const Bill: React.FC<P> = () => (
  <Center><Sfx at={25} name="boom" vol={0.5} /><Pop><Big size={80} color={C.dim}>但到了 2024 年</Big></Pop><Pop delay={25} mute><Big size={170} color={C.coral}>账单来了</Big></Pop></Center>
);

const Fifty: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [at(p, 0) + 150, at(p, 0) + 260], [0, 5000], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  return (
    <Center>
      <Sfx at={at(p, 0) + 150} name="tick" dur={3} vol={0.3} /><Sfx at={at(p, 0) + 262} name="boom" vol={0.5} />
      <Pop><Chip>贝恩 × Altagamma · 2024 年 11 月</Chip></Pop>
      <Pop delay={20}><Big size={200} color={C.coral}>−{n} 万</Big></Pop>
      <Pop delay={40}><Big size={56} color={C.dim}>两年里离开奢侈品市场的顾客</Big></Pop>
      {p.step === 1 && <Pop at={at(p, 1)}><Big size={60}>2023.2 排长队 → 2024.11 报告</Big></Pop>}
      {p.step === 2 && (
        <div style={{display: 'flex', gap: 30}}>
          {['经济不确定', '品牌一直涨价', '年轻人不买账'].map((t, i) => <Pop key={t} at={at(p, 2)} delay={i * 20}><Chip color={i === 1 ? C.gold : C.dim}>{t}</Chip></Pop>)}
        </div>
      )}
      {p.step >= 3 && <Pop at={at(p, 3)}><Big size={64}>≈ 一个西班牙的人口</Big></Pop>}
    </Center>
  );
};

const Chanel: React.FC<P> = () => (
  <Center>
    <Pop><Big size={60} color={C.dim}>香奈儿 2024 年销售额（官方）</Big></Pop>
    <Sfx at={15} name="cash" vol={0.35} /><Sfx at={45} name="error" vol={0.35} />
    <Pop delay={15} mute><Big size={160}>$<CountUp to={187} at={15} dur={24} /> 亿</Big></Pop>
    <Pop delay={40} mute><Big size={110} color={C.coral}>−4.3%</Big></Pop>
  </Center>
);

const Skp: React.FC<P> = (p) => (
  <AbsoluteFill>
    <Queue />
    <Pop style={{position: 'absolute', left: 0, right: 0, top: 140}}><Big size={80}>可门口还是有人在等？</Big></Pop>
    {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 0, right: 0, top: 240}}><Big size={70} color={C.gold}>问题就出在这儿</Big></Pop>}
  </AbsoluteFill>
);

const QueueLeave: React.FC<P & {msg?: boolean}> = (p) => {
  const f = useCurrentFrame();
  const leave = interpolate(f, [at(p, p.msg ? 1 : 2), at(p, p.msg ? 1 : 2) + 120], [0, 0.55], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Queue front={5} leave={leave} />
      {!p.msg && (
        <>
          <Pop style={{position: 'absolute', left: 0, right: 0, top: 140}}><Big size={72}>走掉的，不是排在最前面的人</Big></Pop>
          {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', right: 380, top: 730}}><Chip>顶级大客户：占比还在涨</Chip></Pop>}
          {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 120, top: 730}}><Chip color={C.dim}>入门款 · 年轻人：先走</Chip></Pop>}
        </>
      )}
      {p.msg && (
        <>
          <Pop style={{position: 'absolute', left: 0, right: 0, top: 140}}><Big size={72}>价格往上抬一格</Big></Pop>
          {p.step >= 1 && <Pop at={at(p, 1)} style={{position: 'absolute', left: 0, right: 0, top: 240}}><Big size={80} color={C.gold}>先离开的，永远是队尾</Big></Pop>}
        </>
      )}
    </AbsoluteFill>
  );
};

const Chips: React.FC<P> = () => (
  <Center>
    <Pop><Big size={70}>没有消失，只是换了买法</Big></Pop>
    <div style={{display: 'flex', gap: 30}}>
      {['香水', '口红', '奥特莱斯', '二手'].map((t, i) => <Pop key={t} delay={60 + i * 25}><Chip size={56}>{t}</Chip></Pop>)}
    </div>
  </Center>
);

const Status: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={76}>越贵越显身份</Big></Pop>
    {p.step >= 1 && <Pop at={at(p, 1)}><Chip color={C.dim}>凡勃伦效应 · 后面单独讲</Chip></Pop>}
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={70} color={C.gold}>需求定律没被推翻，只是“其他条件”变了</Big></Pop>}
  </Center>
);

const TwoQ: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={60} color={C.dim}>下次看到“越涨越抢”，先问两个问题</Big></Pop>
    {p.step >= 1 && (
      <Pop at={at(p, 1)}><Card style={{width: 1400}}><Big size={60} style={{textAlign: 'left'}}>① 抢的是涨价前，还是涨价后的价格？{p.step >= 2 && <span style={{color: C.gold}}> → 时间差</span>}</Big></Card></Pop>
    )}
    {p.step >= 3 && (
      <Pop at={at(p, 3)}><Card style={{width: 1400}}><Big size={60} style={{textAlign: 'left'}}>② 买的还是不是同一样东西？{p.step >= 4 && <span style={{color: C.gold}}> → 资产 / 一只包</span>}</Big></Card></Pop>
    )}
  </Center>
);

const Phone: React.FC<P> = (p) => (
  <Center>
    <Sfx at={6} name="notify" vol={0.4} />
    <Pop>
      <div style={{width: 520, height: 300, borderRadius: 40, background: '#1C2442', border: `4px solid ${C.dim}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10}}>
        <Big size={40} color={C.dim}>🔔 通知</Big>
        <Big size={64} color={C.coral}>最后一天原价！</Big>
      </div>
    </Pop>
    {p.step >= 2 && <Pop at={at(p, 2)}><Big size={70}>如果今天就是涨价后的价格，我还会买吗？</Big></Pop>}
    <div style={{display: 'flex', gap: 60}}>
      {p.step >= 3 && <Pop at={at(p, 3)}><Chip color={C.teal}>会 → 买</Chip></Pop>}
      {p.step >= 4 && <Pop at={at(p, 4)}><Chip color={C.coral}>不会 → 你抢的只是差价</Chip></Pop>}
    </div>
  </Center>
);

const QueueEnd: React.FC<P> = (p) => {
  const f = useCurrentFrame();
  const leave = interpolate(f, [at(p, 2), at(p, 2) + 200], [0, 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Queue front={5} leave={leave} />
      <Pop style={{position: 'absolute', left: 0, right: 0, top: 140}}><Big size={64} color={C.dim}>2023 年 2 月那条队</Big></Pop>
      {p.step >= 2 && <Sfx at={at(p, 2)} name="riser" endAt={at(p, 2) + 20} vol={0.25} />}
      {p.step >= 2 && <Pop at={at(p, 2)} style={{position: 'absolute', left: 0, right: 0, top: 230}}><Big size={72} color={C.gold}>需求定律只在队尾，数谁没有再回来</Big></Pop>}
    </AbsoluteFill>
  );
};

const Next: React.FC<P> = (p) => (
  <Center>
    <Pop><Big size={76}>有人一涨就走，有人涨多少都留</Big></Pop>
    {p.step >= 1 && <><Sfx at={at(p, 1)} name="ding" vol={0.35} /><Pop at={at(p, 1)} mute><Chip size={64}>下一期 · No.8 价格弹性</Chip></Pop></>}
  </Center>
);

export const SCENES: Record<string, React.FC<P>> = {
  hot: Hot, queue: QueueScene, question: Question, strike: Strike, flip: Flip, queueLaw: QueueLaw, series: Series,
  chapter: Chapter, curve: Curve, same: Same, tags: Tags, saving: Saving, compare: Compare, rice: Rice, quote: Quote,
  formula: Formula, twoKinds: TwoKinds, question2: Question2, cfChart: CfChart, bill: Bill, fifty: Fifty, chanel: Chanel,
  skp: Skp, queueLeave: (p) => <QueueLeave {...p} />, queueLeave2: (p) => <QueueLeave {...p} msg />, chips: Chips,
  status: Status, twoQ: TwoQ, phone: Phone, queueEnd: QueueEnd, next: Next,
};
