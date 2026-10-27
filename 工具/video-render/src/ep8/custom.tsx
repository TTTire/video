// 第 8 期的特殊图表：photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几句，at(p, i) 是第 i 句开始的帧。参考 src/ep6/custom.tsx。
//   elasticBars   define 场景：+10% → −20%（橡皮筋）/ +10% → −2%（铁丝）两组横条，再收成"方向 vs 幅度"
//   threeTable1/2/3  three / budget / time 三个场景共用一张"三件事"表，一场加一行
//   revenueCalc   revenue 场景：涨 10% 走 4% / 走 20% 的收入算术，再落到海底捞的 6%
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {CountUp, FlyIn, Sfx} from '../fx';
import {Box, FONTS, H, NotchCard, P, T, Tag, TabCard, at, clamp, ease, SAFE_RIGHT_X} from '../photo/kit';
import {CustomMap, rich} from '../photo/engine';

const RX = SAFE_RIGHT_X - 860;   // 右列左边缘（和 layout=right 母版对齐）
const TOP = 160;                 // 本期开了黑边，T 行从 160 起
const NUM = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: 0};

// ---------- 弹性横条 ----------
// 一组 = 价格条（dim，+10% 固定 180px）+ 数量条（金，按百分比伸长）+ 右侧一个标签
const Bar: React.FC<{label: string; pct: string; color: string; a: number; w: number; sfx?: boolean}> = ({label, pct, color, a, w, sfx}) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [a, a + 26], [0, 1], {...clamp, easing: ease});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 18, height: 40, opacity: interpolate(f, [a, a + 8], [0, 1], clamp)}}>
      {sfx && <Sfx at={a} name="swipe" vol={0.3} />}
      <T size={34} style={{width: 190, textAlign: 'right', whiteSpace: 'nowrap'}}>{label}</T>
      <div style={{width: Math.max(6, w * k), height: 26, borderRadius: 8, background: color, boxShadow: `0 0 22px ${color}66`}} />
      <H size={40} color={color} style={{...NUM, lineHeight: 1}}>{pct}</H>
    </div>
  );
};
const ElasticBars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 3) return null;
  const s3 = at(p, 3), s4 = at(p, 4), s5 = at(p, 5), s6 = at(p, 6), s7 = at(p, 7), s9 = at(p, 9);
  const barsOut = p.step >= 7 ? interpolate(f, [s7, s7 + 12], [1, 0], clamp) : 1;
  const PRICE = 180;   // +10% 的长度基准
  return (
    <>
      <Box x={RX} y={TOP + 290} w={860} style={{opacity: barsOut, gap: 28}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start'}}>
          <Bar label="价格 +10%" pct="" color={C.dim} a={s3} w={PRICE} />
          <Bar label="少买" pct="−20%" color={C.gold} a={s3 + 14} w={PRICE * 2} sfx />
          {p.step >= 4 && <div style={{marginLeft: 208}}><FlyIn at={s4} dir="left" dist={80}><Tag size={32}>橡皮筋 · 一拉就长</Tag></FlyIn></div>}
        </div>
        {p.step >= 5 && (
          <div style={{display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start'}}>
            <Bar label="价格 +10%" pct="" color={C.dim} a={s5} w={PRICE} />
            <Bar label="少买" pct="−2%" color={C.gold} a={s5 + 14} w={PRICE * 0.2} sfx />
            {p.step >= 6 && <div style={{marginLeft: 208}}><FlyIn at={s6} dir="left" dist={80}><Tag size={32} dark>铁丝 · 怎么拉都不动</Tag></FlyIn></div>}
          </div>
        )}
      </Box>
      {p.step >= 7 && (
        <Box x={RX} y={TOP + 300} w={860} style={{alignItems: 'flex-end', gap: 26}}>
          <FlyIn at={s7 + 10} dir="right" dist={100}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
              <Tag size={34} dark>上一期 · 需求定律</Tag>
              <H size={56} color={C.dim}>只说<span style={{color: C.white}}>方向</span>：贵了少买</H>
            </div>
          </FlyIn>
          {p.step >= 9 && (
            <FlyIn at={s9} dir="right" dist={100}>
              <Sfx at={s9} name="ding" vol={0.3} />
              <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
                <Tag size={34}>这一期 · 弹性</Tag>
                <H size={64}>说的是{rich('**幅度**', C)}：少买多少</H>
              </div>
            </FlyIn>
          )}
        </Box>
      )}
    </>
  );
};

// ---------- 三件事表 ----------
type Chip = {at: number; text: string};
const ROWS: {title: string; chips: Chip[]}[] = [
  {title: '① 有没有别的地方可去', chips: [{at: 2, text: '楼下十家火锅店'}, {at: 3, text: 'vs 只有专柜才买得到'}]},
  {title: '② 这笔钱占你口袋多大一块', chips: [{at: 1, text: '人均 ¥200+'}, {at: 2, text: '月薪 5000 vs 月薪 50000'}]},
  {title: '③ 有没有时间换', chips: [{at: 1, text: '今晚请客 → 只能认'}, {at: 2, text: '下月再聚 → 慢慢挑'}]},
];
// n：这一场新加第几行（1 起）；x：面板左边缘；titleAt：这一行标题在第几句出
const makeThreeTable = (n: number, x: number, titleAt: number, headerAt?: number): React.FC<P> => (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const open = headerAt !== undefined ? at(p, headerAt) : 0;
  if (headerAt !== undefined && p.step < headerAt) return null;
  return (
    <Box x={x} y={TOP} w={860}>
      <FlyIn at={open} dir={x > 500 ? 'right' : 'left'} dist={120}>
        <NotchCard label="决定你是橡皮筋还是铁丝的三件事" w={860}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 22}}>
            {ROWS.slice(0, n).map((r, i) => {
              const cur = i === n - 1;
              const tAt = cur ? at(p, titleAt) : -999;
              const on = !cur || p.step >= titleAt;
              const o = cur ? interpolate(f, [tAt, tAt + 10], [0, 1], clamp) : 0.5;
              if (!on) return null;
              return (
                <div key={i} style={{opacity: o, display: 'flex', flexDirection: 'column', gap: 10}}>
                  {cur && <Sfx at={tAt} name="pop" vol={0.3} />}
                  <H size={48} color={cur ? C.white : C.dim}>{r.title}</H>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, minHeight: cur ? 52 : 0}}>
                    {r.chips.map((c, j) => {
                      if (cur && p.step < c.at) return null;
                      const ca = cur ? at(p, c.at) : 0;
                      return (
                        <FlyIn key={j} at={ca} dir="left" dist={60}>
                          {cur && <Sfx at={ca} name="tick" dur={0.3} vol={0.25} />}
                          <Tag size={30} dark style={{padding: '6px 18px', opacity: cur ? 1 : 0.8}}>{c.text}</Tag>
                        </FlyIn>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </NotchCard>
      </FlyIn>
    </Box>
  );
};

// ---------- 商家的算盘 ----------
const CalcRow: React.FC<{a: number; ra: number; show: boolean; lhs: string; mul: number; to: number; verdict: string; color: string; sfx: 'ding' | 'error' | 'cash'}> = ({a, ra, show, lhs, mul, to, verdict, color, sfx}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [a, a + 10], [0, 1], clamp);
  return (
    <div style={{opacity: o, display: 'flex', flexDirection: 'column', gap: 6}}>
      <Sfx at={a} name="pop" vol={0.3} />
      <H size={48}>{lhs}</H>
      {show && (
        <div style={{display: 'flex', alignItems: 'baseline', gap: 16, opacity: interpolate(f, [ra, ra + 8], [0, 1], clamp)}}>
          <Sfx at={ra + 20} name={sfx} vol={0.35} />
          <T size={36} style={{...NUM}}>1.10 × {mul.toFixed(2)} =</T>
          <H size={60} color={color} style={{...NUM, lineHeight: 1}}><CountUp from={1} to={to} at={ra} dur={24} decimals={2} /></H>
          <Tag size={32} color={color}>{verdict}</Tag>
        </div>
      )}
    </div>
  );
};
const RevenueCalc: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 3) return null;
  const s3 = at(p, 3), s4 = at(p, 4), s5 = at(p, 5), s6 = at(p, 6), s7 = at(p, 7), s9 = at(p, 9);
  return (
    <Box x={RX} y={TOP} w={860}>
      <FlyIn at={s3} dir="right" dist={120}>
        <TabCard label="商家的算盘 · 价格 × 数量" w={860}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 26}}>
            <CalcRow a={s3} ra={s4} show={p.step >= 4} lhs="涨 10% · 只走 4%" mul={0.96} to={1.056} verdict="收入 ↑" color={C.teal} sfx="cash" />
            {p.step >= 5 && <CalcRow a={s5} ra={s5 + 30} show lhs="涨 10% · 走了 20%" mul={0.8} to={0.88} verdict="亏" color={C.coral} sfx="error" />}
            {p.step >= 6 && (
              <div style={{opacity: interpolate(f, [s6, s6 + 10], [0, 1], clamp), borderTop: `1px solid ${C.white}22`, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 10}}>
                <Sfx at={s6} name="pop" vol={0.3} />
                <H size={52}>海底捞 <span style={{color: C.gold}}>涨 6%</span></H>
                {p.step >= 7 && <FlyIn at={s7} dir="right" dist={80}><T size={36}>留下的人多付的钱 ≥ 走掉的那批人？</T></FlyIn>}
                {p.step >= 9 && (
                  <FlyIn at={s9} dir="right" dist={80}>
                    <Sfx at={s9} name="ding" vol={0.35} />
                    <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
                      <T size={36} style={{...NUM}}>1.06 × 0.94 ≈</T>
                      <H size={60} color={C.gold} style={{...NUM, lineHeight: 1}}>1.00</H>
                      <Tag size={32}>走掉不到 6% 就不亏</Tag>
                    </div>
                  </FlyIn>
                )}
              </div>
            )}
          </div>
        </TabCard>
      </FlyIn>
    </Box>
  );
};

export const CUSTOM8: CustomMap = {
  elasticBars: ElasticBars,
  threeTable1: makeThreeTable(1, RX, 1, 0),
  threeTable2: makeThreeTable(2, RX, 0),
  threeTable3: makeThreeTable(3, 90, 0),
  revenueCalc: RevenueCalc,
};
