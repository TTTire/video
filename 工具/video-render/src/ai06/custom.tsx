// 第 06 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用（全屏覆盖层，位置自己定：都在左列 x 90–990、y 820 以上）。
// 场景里的先后都写成「这条要点开始后第几帧」：at(p, 0) + N，N 按 A-roll 的逐字时间对口播（注释里写了对的是哪个词）。A-roll 重剪过就按新的逐字时间重对一遍。
//   quotes    14 quote：AI 报价 抖音 7769 / 京东 7822 / 天猫 8110，抖音最便宜，价差 341（大众新闻 2026-11-13 记者实测；「某主流 AI 平台」原文不点名）
//   checkout  15 actual：同一张表补上实付预览 9398 / 8620.6 / 8885 和相差 1629（slam，全片唯一）/ 798.6 / 775，抖音从最低变最贵
// 两场是同一张表（同位置、同列宽），换场景时整张重新入场：观众看到的是「AI 那一列不变，旁边多出实付一列」。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../fx';
import {FONTS, H, P, T, at, clamp} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {Slam} from '../photo/numfx';
import {CustomMap} from '../photo/engine';

const CW = 900;                       // 和引擎主卡同一栅格（L 列 x 90、宽 900）
const COLS = [120, 250, 250, 176];    // 平台 | AI 报价 | 实付预览 | 相差，合计 796 = 卡内宽（TTab 左右内边距各 52）；报价、实付两列要装下「数 + 最低/最贵签」
const ROW_H = 92;
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};
const ROWS = [
  {name: '抖音', ai: '7769', pay: '9398', diff: '1629'},
  {name: '京东', ai: '7822', pay: '8620.6', diff: '798.6'},
  {name: '天猫', ai: '8110', pay: '8885', diff: '775'},
];
// 每个时刻都是相对场景第一条要点的帧数
type Beats = {card: number; ai: number[]; low: number; note?: number; pay?: number[]; diff?: number[]; high?: number};
const fade = (f: number, a: number) => interpolate(f, [a, a + 10], [0, 1], clamp);

const Pill: React.FC<{on: number; bg: string; children: React.ReactNode}> = ({on, bg, children}) => {
  const C = useC();
  const f = useCurrentFrame();
  if (f < on) return null;
  return <span style={{opacity: fade(f, on), background: bg, color: C.bg, fontFamily: C.font, fontWeight: 900, fontSize: 22, letterSpacing: 2, padding: '4px 10px 5px', borderRadius: 9, whiteSpace: 'nowrap'}}>{children}</span>;
};

const PriceTable: React.FC<{p: P; b: Beats; label: string}> = ({p, b, label}) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const A = (n: number) => s0 + n;
  if (f < A(b.card)) return null;
  const pay = !!b.pay;
  const hot = b.high !== undefined ? fade(f, A(b.high)) : 0;
  const head = ['平台', 'AI 报价', '实付预览', '相差'];
  const headColor = [C.dim, C.teal, C.coral, C.dim];
  return (
    <div style={{position: 'absolute', left: 90, top: 120, width: CW}}>
      {b.ai.map((n, i) => !pay && f >= A(n) && <Sfx key={'a' + i} at={A(n)} name="ding" vol={0.2} />)}
      {b.pay?.map((n, i) => f >= A(n) && <Sfx key={'p' + i} at={A(n)} name="ding" vol={0.24} />)}
      {b.high !== undefined && f >= A(b.high) && <Sfx at={A(b.high)} name="error" vol={0.32} />}
      <CardEnter at={A(b.card)} dir="left" dist={140}>
        <TTab label={label} w={CW} seed={3}>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{display: 'flex', paddingBottom: 12, borderBottom: `2px solid ${C.white}22`}}>
              {head.map((h, i) => (
                <div key={i} style={{width: COLS[i], opacity: i < 2 || pay ? 1 : 0}}>
                  <T size={28} color={headColor[i]} style={{letterSpacing: 3}}>{h}</T>
                </div>
              ))}
            </div>
            {ROWS.map((r, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', height: ROW_H, borderBottom: i < ROWS.length - 1 ? `1px solid ${C.white}14` : 'none',
                background: i === 0 ? `rgba(228, 87, 75, ${0.16 * hot})` : 'transparent', borderRadius: 8}}>
                <div style={{width: COLS[0]}}><H size={50}>{r.name}</H></div>
                <div style={{width: COLS[1], display: 'flex', alignItems: 'center', gap: 12, opacity: pay ? 1 : fade(f, A(b.ai[i]))}}>
                  <span style={{...NUM, fontSize: 54, color: C.teal}}>{r.ai}</span>
                  {i === 0 && <Pill on={A(b.low)} bg={C.teal}>最低</Pill>}
                </div>
                {pay && (
                  <div style={{width: COLS[2], display: 'flex', alignItems: 'center', gap: 12, opacity: fade(f, A(b.pay![i]))}}>
                    <span style={{...NUM, fontSize: 54, color: C.coral}}>{r.pay}</span>
                    {i === 0 && b.high !== undefined && <Pill on={A(b.high)} bg={C.coral}>最贵</Pill>}
                  </div>
                )}
                {pay && b.diff && (
                  <div style={{width: COLS[3]}}>
                    {i === 0
                      ? <Slam at={A(b.diff[0])} size={56} color={C.gold} shake={8}>{r.diff}</Slam>
                      : <span style={{...NUM, fontSize: 48, color: C.white, opacity: fade(f, A(b.diff[i]))}}>{r.diff}</span>}
                  </div>
                )}
              </div>
            ))}
            {b.note !== undefined && f >= A(b.note) && (
              <div style={{marginTop: 18, opacity: fade(f, A(b.note))}}>
                <T size={36} color={C.white} style={{letterSpacing: 2}}>抖音最便宜 · 三家价差 341</T>
              </div>
            )}
          </div>
        </TTab>
      </CardEnter>
    </div>
  );
};

// 14 quote（场景从章节卡之后开始）：卡在「让AI逐平台叠加优惠券」出；三个数各对报价里那个数；「抖音最便宜」挂最低；「价差达到340」出注（原文 8110 − 7769 = 341，画面照原数）
const Quotes: React.FC<P> = (p) => <PriceTable p={p} label="AI 报价 · 某主流 AI 平台" b={{card: 204, ai: [372, 452, 520], low: 573, note: 619}} />;
// 15 actual：前半段是 photorow（C01 / C02，引擎里 until 收掉）；卡在「看了一眼实付」之后、「而抖音需要9398」之前出（371）；
// 实付各对「9398」「8620」「8885」；相差对「1629」「798」「775」（口播抹了零头，画面照原数 8620.6 / 798.6）；「实则最贵」挂最贵
const Checkout: React.FC<P> = (p) => <PriceTable p={p} label="AI 报价 vs 实付预览" b={{card: 371, ai: [0, 0, 0], low: 371, pay: [392, 489, 564], diff: [655, 680, 728], high: 852}} />;

export const CUSTOMAI06: CustomMap = {quotes: Quotes, checkout: Checkout};
