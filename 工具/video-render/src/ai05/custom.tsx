// 第 05 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用（全屏覆盖层，位置自己定：都在左列 x 90–990、y 820 以上）。
// 场景里的先后都写成「这条要点开始后第几帧」：at(p, 0) + N，N 按 A-roll 的逐字时间对口播（注释里写了对的是哪个词）。A-roll 重剪过就按新的逐字时间重对一遍。
//   aolbars  21：AOL 会员每天在线 1996 年 9 月 14 分钟 → 1997 年 1 月 32 分钟（洛杉矶时报 1997-01-27），两根横条按分钟数等比
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../fx';
import {FONTS, H, P, T, at, clamp} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {CustomMap} from '../photo/engine';

const CW = 900;                 // 本期卡宽：和引擎主卡同一栅格（L 列 x 90、宽 900）
const IW = CW - 104;            // 卡内宽（TTab 左右内边距各 52）
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- 21：AOL 会员每天在线 14 → 32 分钟 ----------
const AolBars: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const a = s0 + 243;                       // 「会员每天在线」
  if (f < a) return null;
  const n1 = s0 + 296;                      // 「14分钟」
  const r2 = s0 + 319, n2 = s0 + 360;       // 「涨到第二年一月份」，「32分钟」
  const row = (on: number, label: string, mins: number, numOn: number, color: string) => (
    <div style={{opacity: interpolate(f, [on, on + 10], [0, 1], clamp), display: 'flex', flexDirection: 'column', gap: 10}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <T size={32}>{label}</T>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 10, opacity: interpolate(f, [numOn, numOn + 10], [0, 1], clamp)}}>
          <H size={64} color={color} style={NUM}>{mins}</H>
          <T size={34}>分钟</T>
        </div>
      </div>
      <div style={{height: 22, borderRadius: 11, background: `${C.white}14`}}>
        <div style={{width: IW * (mins / 32) * interpolate(f, [numOn - 14, numOn + 22], [0, 1], {...clamp, easing: easeInOut}), height: 22, borderRadius: 11, background: color, boxShadow: `0 0 18px ${color}66`}} />
      </div>
    </div>
  );
  return (
    <div style={{position: 'absolute', left: 90, top: 400, width: CW}}>
      {f >= n1 && <Sfx at={n1} name="ding" vol={0.28} />}
      {f >= n2 && <Sfx at={n2} name="ding" vol={0.32} />}
      <CardEnter at={a} dir="left" dist={140}>
        <TTab label="AOL 会员 · 每天在线" w={CW} seed={3}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            {row(a, '1996 年 9 月', 14, n1, C.white)}
            {f >= r2 && row(r2, '1997 年 1 月', 32, n2, C.gold)}
          </div>
        </TTab>
      </CardEnter>
    </div>
  );
};

export const CUSTOMAI05: CustomMap = {aolbars: AolBars};
