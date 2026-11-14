// 第 10 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用（全屏覆盖层，位置自己定：右列 x 760–1620、y 820 以上）。
// 本期一条要点 = 一个场景（每场只有 step 0），场景里的先后写成「这条要点开始后第几帧」：at(p, 0) + N，
// N 按粗剪 A-roll 的逐字时间对口播（注释里写了对的是哪个词）。粗剪重剪过就按新的逐字时间重对一遍。
//   pnasRank  16：PNAS 2019，三类免费产品一整年不用的中位数，三行逐行出（搜索引擎 $17,530 / 邮箱 $8,414 / 地图 $3,648）
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../fx';
import {FONTS, P, at, clamp, SAFE_RIGHT_X} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {CustomMap} from '../photo/engine';

const CW = 860;                 // 卡宽和 photo.json 里的卡（cardW 860）一样，右边缘落在 SAFE_RIGHT_X
const RX = SAFE_RIGHT_X - CW;   // 760
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};

// 16：砸入的 $17,530 在 +255 收掉（photo.json 里 untilDelay 255），卡和第 1 行在同一帧接上；
// 第 2 行跟「8414」（+263），第 3 行跟「3600」（+380），各晚 6 帧，等数字先说出口
const ROWS = [
  {label: '搜索引擎', value: '$17,530', at: 255, hi: true},
  {label: '邮箱', value: '$8,414', at: 269},
  {label: '地图', value: '$3,648', at: 386},
];
const PnasRank: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  const a = s0 + ROWS[0].at;
  if (f < a) return null;
  return (
    <div style={{position: 'absolute', left: RX, top: 120, width: CW}}>
      <CardEnter at={a} dir="right" dist={140}>
        <TTab label="PNAS 2019 · 一整年不用 · 中位数" w={CW} seed={3}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            {ROWS.map((r, i) => {
              const ra = s0 + r.at;
              const k = interpolate(f, [ra, ra + 10], [0, 1], clamp);
              const dx = (1 - interpolate(f, [ra, ra + 14], [0, 1], clamp)) * 60;
              return (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, height: 96, padding: '0 26px', borderRadius: 16, boxSizing: 'border-box',
                  background: r.hi ? `${C.gold}22` : `${C.bg}CC`, border: `1px solid ${r.hi ? C.gold : C.white + '18'}`,
                  opacity: k, transform: `translateX(${dx}px)`}}>
                  {i > 0 && f >= ra && <Sfx at={ra} name="ding" vol={0.25} />}
                  <span style={{fontSize: 30, color: C.dim, width: 44, ...NUM}}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{fontFamily: FONTS.title, fontWeight: 800, fontSize: 56, color: C.white, flex: 1, whiteSpace: 'nowrap'}}>{r.label}</span>
                  <span style={{fontSize: 60, color: r.hi ? C.gold : C.white, ...NUM}}>{r.value}</span>
                </div>
              );
            })}
          </div>
        </TTab>
      </CardEnter>
    </div>
  );
};

export const CUSTOMEP10: CustomMap = {pnasRank: PnasRank};
