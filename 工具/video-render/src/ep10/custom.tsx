// 第 10 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 场景里的先后写成「第几条要点开始后第几帧」：at(p, i) + N，N 按粗剪 A-roll 的逐字时间对口播（注释里写了对的是哪个词）。
// 粗剪重剪过就按新的逐字时间重对一遍。
//   doc       15–16（pnas 一场，2.2 + 2.3）：PNAS 论文原文页（D01 首页、D02 表 1 那页），黑底文档页，见 src/photo/docpage.tsx
//   pnasRank  同一场的 2.3：文档页聚焦表 1 时，左列逐行出中文：搜索引擎 $17,530 / 邮箱 $8,414 / 地图 $3,648
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {Sfx} from '../fx';
import {FONTS, P, at, clamp} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {CustomMap} from '../photo/engine';
import {DocPage} from '../photo/docpage';

const CW = 860;   // 左列卡宽，左边缘 x 90，右边缘 950，和右侧文档窗口（x ≥ 1020）错开
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};

// 2.3 开始后：第 1 行跟「17530」（+151），第 2 行跟「8414」（+263），第 3 行跟「3600」（+380），后两行各晚 6 帧等数字先说出口；
// 「差出来的那一大截」（+580）整张卡收掉，换成那一句（photo.json 里的 h）
const ROWS = [
  {label: '搜索引擎', value: '$17,530', at: 151, hi: true},
  {label: '邮箱', value: '$8,414', at: 269},
  {label: '地图', value: '$3,648', at: 386},
];
const OUT = 580;
const PnasRank: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s0 = at(p, 1);
  const a = s0 + ROWS[0].at;
  if (f < a || f >= s0 + OUT) return null;
  return (
    <div style={{position: 'absolute', left: 90, top: 150, width: CW}}>
      <CardEnter at={a} dir="left" dist={140}>
        <TTab label="一整年不用 · 中位数" w={CW} seed={3}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            {ROWS.map((r, i) => {
              const ra = s0 + r.at;
              const k = interpolate(f, [ra, ra + 10], [0, 1], clamp);
              const dx = (1 - interpolate(f, [ra, ra + 14], [0, 1], clamp)) * -60;
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

export const CUSTOMEP10: CustomMap = {doc: DocPage, pnasRank: PnasRank};
