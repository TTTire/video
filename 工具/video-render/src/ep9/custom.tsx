// 第 9 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用（全屏覆盖层，位置自己定：都在右列 x 760–1620、y 820 以上）。
// 本期一条要点 = 一个场景（每场只有 step 0），场景里的先后都写成「这条要点开始后第几帧」：at(p, 0) + N，
// N 按 A-roll 的逐字时间对口播（注释里写了对的是哪个词）。A-roll 重剪过就按新的逐字时间重对一遍。
//   broken  01：安卓旧手机回收价 ¥50–60 → ¥400+（位数变多 + 区间，引擎 odometer 表示不了，这里按同一套里程表规则自己滚）
//   slump   04：回收价先涨半年、3 月 27 日开始往下掉（示意）
//   crash   21：接着 04 那条线往下画到「五天 −30%+」，标 4 月 1 日
//   flood   12：数码回收网每天处理的手机，2025-09 20 万部 → 2026-03 近 150 万部
//   buyers  20：一个工厂一天用掉几万颗 vs 一天流进来上百万颗（条长示意）
import React from 'react';
import {interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../fx';
import {FONTS, H, P, T, at, clamp, SHADOW, SAFE_RIGHT_X} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {CustomMap} from '../photo/engine';

const CW = 860;                 // 本期卡宽：和 photo.json 里的卡（cardW 860）一样，右边缘落在 SAFE_RIGHT_X
const RX = SAFE_RIGHT_X - CW;   // 760：右列左边缘（layout=right 母版）
const IW = CW - 104;            // 卡内宽（TTab 左右内边距各 52）
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fadeIn = (f: number, a: number, len = 10) => interpolate(f, [a, a + len], [0, 1], clamp);
const ramp = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: easeInOut});

// 图表卡：tab 卡（中性签），从左侧飞入带轻回弹，和引擎里的卡同一套长相
const ChartCard: React.FC<{a: number; top: number; label: string; seed: number; children: React.ReactNode}> = ({a, top, label, seed, children}) => (
  <div style={{position: 'absolute', left: RX, top, width: CW}}>
    <CardEnter at={a} dir="left" dist={140}><TTab label={label} w={CW} seed={seed}>{children}</TTab></CardEnter>
  </div>
);
const Tag: React.FC<{style: React.CSSProperties; children: React.ReactNode}> = ({style, children}) => <div style={{position: 'absolute', whiteSpace: 'nowrap', ...style}}>{children}</div>;

// ---------- 折线工具：按长度截一段，慢进慢出由调用方给的长度决定（线只往前长，不回缩） ----------
type Pt = [number, number];
const lengths = (pts: Pt[]) => pts.reduce<number[]>((acc, q, i) => { acc.push(i ? acc[i - 1] + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0); return acc; }, []);
const partial = (pts: Pt[], cum: number[], len: number): {d: string; end: Pt} => {
  const L = Math.max(0, Math.min(len, cum[cum.length - 1]));
  let i = 1;
  while (i < pts.length - 1 && cum[i] < L) i++;
  const t = Math.max(0, Math.min(1, (L - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)));
  const end: Pt = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  return {d: 'M' + [...pts.slice(0, i), end].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L'), end};
};
const Line: React.FC<{d: string; color: string}> = ({d, color}) => (
  <>
    <path d={d} fill="none" stroke={color} strokeWidth={18} strokeOpacity={0.16} strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
  </>
);
const Dot: React.FC<{p: Pt; color: string; f: number}> = ({p, color, f}) => <circle cx={p[0]} cy={p[1]} r={9 + Math.sin(f / 5) * 1.5} fill={color} stroke="#FFFFFF" strokeWidth={3} />;

// ---------- 01：回收价 ¥50–60 → ¥400+ ----------
// 和引擎 odometer 同一套规则：每位独立滚，右位先动、左位每位晚 3 帧，慢进慢出，不绕圈（个位 0 不动，十位 5 往下滚到 0，百位从空白滚到 4）。
// 先收起区间的后半「–60」，再滚；滚完长出「+」（四百多）。颜色从白过到 teal（涨）
const DIGIT_W = 0.62;
const Col: React.FC<{seq: string[]; a: number; dur: number; size: number; color: string; w?: number; grow?: boolean}> = ({seq, a, dur, size, color, w: w0, grow}) => {
  const f = useCurrentFrame();
  const k = ramp(f, a, a + dur);
  const h = size * 1.05, w = w0 ?? size * DIGIT_W;
  return (
    <span style={{display: 'inline-block', position: 'relative', width: grow ? w * Math.min(1, k * 4) : w, height: h, overflow: 'hidden', verticalAlign: 'bottom'}}>
      <span style={{position: 'absolute', right: 0, top: 0, width: w, transform: `translateY(${-k * (seq.length - 1) * h}px)`, display: 'flex', flexDirection: 'column'}}>
        {seq.map((d, i) => <span key={i} style={{height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size, color, ...NUM}}>{d}</span>)}
      </span>
    </span>
  );
};
const Broken: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const A = s0 + 150;   // 0.1 开头 A-roll 全屏 5.5 秒（到第 165 帧）再缩回小圆：字在全屏收起前铺好
  const R = s0 + 288;   // 开滚；「这些手机现在能收到 400 多」的「400」在 +323，滚完正好落上
  if (f < A) return null;
  const size = 150, dur = 28;
  const shut = ramp(f, R - 4, R + 8);                   // 「–60」收起
  const col = interpolateColors(ramp(f, R, R + dur + 6), [0, 1], [C.white, C.teal]);
  const plus = ramp(f, R + dur + 2, R + dur + 12);      // 「+」最后长出来
  const dash = size * 0.5, tail = dash + 2 * size * DIGIT_W;
  return (
    <div style={{position: 'absolute', left: RX, top: 120, width: CW, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, opacity: fadeIn(f, A)}}>
      {f >= R && <Sfx at={R} name="tick" dur={(dur + 6) / 30} vol={0.3} />}
      <T size={44} style={{letterSpacing: 3}}>放了好几年的安卓旧手机 · 回收价</T>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 28}}>
        <div style={{position: 'relative', width: 240, height: 100, marginBottom: 22}}>
          <div style={{position: 'absolute', right: 0, bottom: 0, textAlign: 'right', opacity: 1 - shut}}><T size={40}>以前</T></div>
          <div style={{position: 'absolute', right: 0, bottom: 0, textAlign: 'right', opacity: ramp(f, R, R + 12)}}>
            <T size={40} color={C.white}>今年 3 月</T>
            <T size={28}>回收点老板说</T>
          </div>
        </div>
        <div style={{display: 'inline-flex', alignItems: 'baseline', textShadow: SHADOW}}>
          <span style={{fontSize: size * 0.72, color: col, ...NUM}}>¥</span>
          <Col seq={['', '1', '2', '3', '4']} a={R + 6} dur={dur} size={size} color={col} grow />
          <Col seq={['5', '4', '3', '2', '1', '0']} a={R + 3} dur={dur} size={size} color={col} />
          <Col seq={['0']} a={R} dur={dur} size={size} color={col} />
          <span style={{display: 'inline-flex', overflow: 'hidden', width: tail * (1 - shut), opacity: 1 - shut}}>
            <Col seq={['–']} a={R} dur={dur} size={size} color={col} w={dash} />
            <Col seq={['6']} a={R} dur={dur} size={size} color={col} />
            <Col seq={['0']} a={R} dur={dur} size={size} color={col} />
          </span>
          <span style={{display: 'inline-flex', overflow: 'hidden', width: size * 0.55 * plus, opacity: plus}}>
            <Col seq={['+']} a={R} dur={dur} size={size} color={col} w={size * 0.55} />
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------- 04 / 21：回收价折线（示意）。04 画到"开始往下掉"，21 接着往下画 ----------
// 横轴按天：-20 = 去年 9 月中，0 = 10 月 1 日（"去年秋天"开始涨），158 = 3 月上旬（到高位），177 = 3 月 27 日，182 = 4 月 1 日（五天后）。
// 竖轴只是相对高度：没有逐月数据，只标「示意」不标价；跌幅按 −34% 画（"三成多"），涨的幅度不代表任何倍数
const PH = 210, PT = 52;   // 图区高；顶上留给「3 月 27 日」
const DAY0 = -20, DAY1 = 190;
const px = (d: number) => ((d - DAY0) / (DAY1 - DAY0)) * IW;
const py = (v: number) => PT + (1 - v) * (PH - PT);
const sstep = (t: number) => t * t * (3 - 2 * t);
const priceAt = (d: number) => (d <= 0 ? 0.3 : d <= 158 ? 0.3 + 0.6 * sstep(d / 158) : 0.9 + 0.1 * sstep(Math.min(1, (d - 158) / 19)));
const RISE: Pt[] = Array.from({length: 177 - DAY0 + 1}, (_, i) => DAY0 + i).map((d) => [px(d), py(priceAt(d))]);
const FALL: Pt[] = [0, 1, 2, 3, 4, 5].map((i) => [px(177 + i), py(1 - 0.34 * easeInOut(i / 5))]);
const RISE_L = lengths(RISE), FALL_L = lengths(FALL);
const FALL_04 = 0.45;      // 04 只画到跌下去的前 45%，21 从这里接着画
const PriceChart: React.FC<{p: P; crash: boolean}> = ({p, crash}) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const a = s0 + (crash ? 0 : 4);
  if (f < a) return null;
  // 04：「涨了半年」(+40) 画涨，「3月27号开始」(+57…+81) 到顶，「5天回收价格跌了三成」(+99) 开始往下
  // 21：一上来就是 04 画完的样子；「五天跌了三成多」(+43…+97) 接着跌到底，「4月1号」(+165) 标日期
  const rise = crash ? 1 : ramp(f, s0 + 40, s0 + 92);
  const fall = crash ? FALL_04 + (1 - FALL_04) * ramp(f, s0 + 45, s0 + 92) : FALL_04 * ramp(f, s0 + 100, s0 + 150);
  const r = partial(RISE, RISE_L, rise * RISE_L[RISE_L.length - 1]);
  const fl = fall > 0 ? partial(FALL, FALL_L, fall * FALL_L[FALL_L.length - 1]) : null;
  const halfOn = crash ? 1 : fadeIn(f, s0 + 42);
  const peakOn = crash ? 1 : fadeIn(f, s0 + 86);
  const dropOn = crash ? fadeIn(f, s0 + 88) : 0;
  const dateOn = crash ? fadeIn(f, s0 + 165) : 0;
  return (
    <ChartCard a={a} top={120} label="旧手机回收价" seed={3}>
      {crash
        ? <><Sfx at={s0 + 45} name="swipe" vol={0.3} /><Sfx at={s0 + 90} name="impact" vol={0.4} /></>
        : <><Sfx at={s0 + 40} name="swipe" vol={0.28} /><Sfx at={s0 + 100} name="error" vol={0.3} /></>}
      <div style={{display: 'flex', justifyContent: 'flex-end', height: 30}}><T size={24} style={{opacity: 0.75, letterSpacing: 4}}>示意</T></div>
      <div style={{position: 'relative', width: IW, height: PH}}>
        <svg width={IW} height={PH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <line x1={0} y1={PH} x2={IW} y2={PH} stroke={`${C.white}55`} strokeWidth={2} />
          <line x1={px(177)} y1={py(1) + 14} x2={px(177)} y2={PH} stroke={`${C.white}44`} strokeWidth={2} strokeDasharray="6 8" opacity={peakOn} />
          <Line d={r.d} color={C.teal} />
          {fl && <Line d={fl.d} color={C.coral} />}
          <Dot p={fl ? fl.end : r.end} color={fl ? C.coral : C.teal} f={f} />
        </svg>
        <Tag style={{left: 110, top: 50, opacity: halfOn}}><T size={34} color={C.teal}>涨了半年</T></Tag>
        <Tag style={{right: 0, top: 0, opacity: peakOn}}><T size={28} color={C.white}>3 月 27 日</T></Tag>
        <Tag style={{right: IW - px(177) + 24, top: 118, opacity: dropOn}}><H size={48} color={C.coral} style={NUM}>五天 −30%+</H></Tag>
      </div>
      <div style={{position: 'relative', height: 42}}>
        <Tag style={{left: px(0) - 40, top: 8}}><T size={26}>去年秋天</T></Tag>
        <Tag style={{right: 0, top: 8, opacity: dateOn}}><T size={26} color={C.white}>4 月 1 日</T></Tag>
      </div>
    </ChartCard>
  );
};
const Slump: React.FC<P> = (p) => <PriceChart p={p} crash={false} />;
const Crash: React.FC<P> = (p) => <PriceChart p={p} crash />;

// ---------- 12：一家回收平台每天处理的手机（数码回收网自报） ----------
// 四个点都出自同一篇报道（Tech星球 2026-04-16）：2025-09 20 万、11 月 35 万、2026-01 超 40 万、3 月近 150 万；
// 图上只印讲稿卡数字表里有的两个数（20 万部、近 150 万部），中间两个点只决定线的走法
const FH = 250, FT = 80, FMAX = 160;
const FPTS: Pt[] = [[0, 20], [2, 35], [4, 40], [6, 150]].map(([m, v]) => [30 + (m / 6) * (IW - 60), FT + (1 - v / FMAX) * (FH - FT)]);
const FL = lengths(FPTS);
const Flood: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const a = s0 + 66;                                   // 「一家叫数码回收网的回收平台」(+70)
  if (f < a) return null;
  const d0 = s0 + 196, l0 = s0 + 212, l1 = s0 + 290;   // 「去年9月的20万部」(+192…218)；「涨到今年3月份的150万部」(+245…297)
  const k = ramp(f, l0, l1);
  const ln = f >= l0 ? partial(FPTS, FL, k * FL[FL.length - 1]) : null;
  const endOn = fadeIn(f, s0 + 284);
  return (
    <ChartCard a={a} top={120} label="一家回收平台 · 每天处理的手机" seed={5}>
      {f >= l0 && <Sfx at={l0} name="swipe" vol={0.3} />}
      {f >= s0 + 284 && <Sfx at={s0 + 284} name="ding" vol={0.3} />}
      <div style={{position: 'relative', width: IW, height: FH}}>
        <svg width={IW} height={FH} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <line x1={0} y1={FH} x2={IW} y2={FH} stroke={`${C.white}55`} strokeWidth={2} />
          {ln && <Line d={ln.d} color={C.teal} />}
          {f >= d0 && <Dot p={ln ? ln.end : FPTS[0]} color={C.teal} f={f} />}
          {f >= d0 && <circle cx={FPTS[0][0]} cy={FPTS[0][1]} r={7} fill={C.teal} opacity={fadeIn(f, d0)} />}
        </svg>
        <Tag style={{left: 4, top: FPTS[0][1] - 112, opacity: fadeIn(f, d0)}}>
          <T size={24}>2025 年 9 月</T>
          <H size={46} color={C.white} style={NUM}>20 万部</H>
        </Tag>
        <Tag style={{right: 0, top: FPTS[3][1] - 80, opacity: endOn, display: 'flex', alignItems: 'baseline', gap: 16}}>
          <T size={24}>2026 年 3 月</T>
          <H size={54} color={C.teal} style={NUM}>近 150 万部</H>
        </Tag>
      </div>
      <div style={{height: 36, display: 'flex', alignItems: 'flex-end'}}><T size={22} style={{opacity: 0.75, letterSpacing: 2}}>数码回收网 · 平台自己的日处理量</T></div>
    </ChartCard>
  );
};

// ---------- 20：旧芯片，一个工厂一天用掉 几万颗 vs 一天流进来 上百万颗（一位芯片回收商的话；条长只是示意） ----------
const Buyers: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const a = s0 + 218;                       // 「一位芯片的回收商说」
  if (f < a) return null;
  const r1 = s0 + 269, n1 = s0 + 314;       // 「一个工厂每天能用到几万颗」，「几万颗」在 +318
  const r2 = s0 + 339, n2 = s0 + 378;       // 「流进来的则有上百万颗」，「上百万」在 +381
  const row = (on: number, label: string, num: string, numOn: number, size: number, color: string, bar: number) => (
    <div style={{opacity: fadeIn(f, on), display: 'flex', flexDirection: 'column', gap: 12}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <T size={34}>{label}</T>
        <H size={size} color={color} style={{lineHeight: 1, opacity: fadeIn(f, numOn)}}>{num}</H>
      </div>
      <div style={{height: 20, borderRadius: 10, background: `${C.white}14`}}>
        <div style={{width: bar, height: 20, borderRadius: 10, background: color, boxShadow: `0 0 18px ${color}66`}} />
      </div>
    </div>
  );
  return (
    <ChartCard a={a} top={340} label="一位芯片回收商说" seed={2}>
      {f >= n1 && <Sfx at={n1} name="ding" vol={0.28} />}
      {f >= n2 && <Sfx at={n2} name="impact" vol={0.4} />}
      <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
        {f >= r1 && row(r1, '一个工厂 · 一天用掉', '几万颗', n1, 72, C.white, 30 * ramp(f, r1 + 18, r1 + 42))}
        {f >= r2 && row(r2, '一天流进来', '上百万颗', n2, 96, C.gold, IW * ramp(f, r2 + 8, r2 + 70))}
      </div>
      <div style={{height: 34, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end'}}><T size={22} style={{opacity: 0.75, letterSpacing: 2}}>条长示意</T></div>
    </ChartCard>
  );
};

export const CUSTOMEP9: CustomMap = {broken: Broken, slump: Slump, crash: Crash, flood: Flood, buyers: Buyers};
