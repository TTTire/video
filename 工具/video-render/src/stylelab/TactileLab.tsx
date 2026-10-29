// 实物卡 + 数值动效验证台（2026-10-29）：走正式引擎链路，photo.json 真字段 → 真像素。
// 渲染：python scripts/lab.py tactile → out/stylelab/tactile-*.jpg
// 每帧一个用例；所有 steps 都推到负数，让入场动画走完、数值滚到终点（still 只渲 frame 0）。
// MID 帧（动画中途）用 steps 推到 -12，看里程表 / 翻牌 / 砸入"正在动"的样子。
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {EpisodeSpec, buildPhotoEpisode} from '../photo/engine';
import {useTitleFont} from '../photo/kit';
import {ThemeCtx} from '../ui';

const ep: EpisodeSpec = {
  ep: 'ai03', badge: '', series: 'AI经济学', photos: 'ai03/photos', chapterPhoto: 'S20',
  style: {layout: 'right', scale: 'v2', enter: 'cut', grain: true, tint: '#1A2432', tintOpacity: 0.28, textEnter: 'fade',
    cardSkin: 'tactile', cards: 'ai03/cards',
    theme: {gold: '#C8A16B', coral: '#B5544A', teal: '#7796A8', bg: '#0A0D12', bg2: '#141A24', dim: '#B9C2CC'}},
  scenes: [
    // 0 notch 实物版：角花、金边、中英双标
    {id: 'tNotch', photo: 'S01', grad: 'right', box: {x: 760, y: 170, w: 860, card: 'notch', label: '前提', sub: 'PREMISE'},
      items: [{type: 'h', at: 0, text: 'AI 越强，**越值钱的**不是 AI'}, {type: 't', at: 1, text: '是它旁边那个没法被复制的东西'}]},
    // 1 paper 实物版：纸纹 + 胶带
    {id: 'tPaper', photo: 'S05', grad: 'right', box: {x: 760, y: 170, w: 860, card: 'paper'},
      items: [{type: 'h', at: 0, text: '“此次涨价是公司\\n管理层的错误决策”', size: 64}, {type: 't', at: 1, text: '—— 2020 年 4 月 10 日 致歉信'}]},
    // 2 solid 实物版
    {id: 'tSolid', photo: 'S08', grad: 'right', box: {x: 760, y: 220, w: 860, card: 'solid', label: '结论'},
      items: [{type: 'h', at: 0, text: '补品涨价，主菜降价'}]},
    // 3 tab 实物版 + odometer
    {id: 'tTab', photo: 'S12', grad: 'right', box: {x: 760, y: 150, w: 860, card: 'tab', label: '太阳能 · 2010 → 2024', tabColor: 'dim'},
      items: [{type: 't', at: 0, text: '每瓦成本', color: 'white'}, {type: 'odometer', at: 1, from: '$2.15', to: '$0.11', size: 120}, {type: 't', at: 2, text: '降了 **95%**'}]},
    // 4 photo 卡单张
    {id: 'tPhoto', photo: 'S13', grad: 'right', box: {x: 1100, y: 160, w: 480},
      items: [{type: 'photocard', at: 0, img: 'C01', title: '光伏板', sub: 'SOLAR PANEL', w: 440}]},
    // 5 photo 卡一排三张（居中）
    {id: 'tRow', photo: 'S14', grad: 'all', dim: 0.3, box: {x: 90, y: 200, w: 1500, align: 'center'},
      items: [{type: 'photorow', at: 0, w: 380, cards: [{img: 'C01', title: '电力', sub: 'POWER'}, {img: 'C02', title: '芯片', sub: 'CHIP'}, {img: 'C03', title: '**数据**', sub: 'DATA'}]}]},
    // 6 flap
    {id: 'tFlap', photo: 'S15', grad: 'right', box: {x: 760, y: 220, w: 860},
      items: [{type: 't', at: 0, text: '我一开始记的是'}, {type: 'flap', at: 1, from: '涨得离谱', to: '只涨了 6%', size: 80, label: ''}]},
    // 7 slam
    {id: 'tSlam', photo: 'S16', grad: 'all', dim: 0.35, box: {x: 90, y: 260, w: 1740, align: 'center'},
      items: [{type: 'slam', at: 0, text: '4,100 万', size: 220, label: '2024 年净增用户'}]},
    // 8 rank
    {id: 'tRank', photo: 'S17', grad: 'right', box: {x: 760, y: 150, w: 860},
      items: [{type: 'rank', at: 0, w: 860, hi: 'young', rows: [{id: 'old', label: '老烟民', value: '−2%'}, {id: 'young', label: '年轻人', value: '−6%', color: 'gold'}, {id: 'low', label: '低收入', value: '−5%'}],
        orders: [['old', 'young', 'low'], ['young', 'low', 'old']], orderAt: [0, 1]}]},
    // 9 units
    {id: 'tUnits', photo: 'S18', grad: 'right', box: {x: 760, y: 170, w: 860},
      items: [{type: 't', at: 0, text: '一个季度走掉'}, {type: 'units', at: 0, n: 80, unit: 'person', cols: 20, size: 36, max: 80, label: '80 万用户 · 每个 = 1 万'}]},
    // 10 fill
    {id: 'tFill', photo: 'S19', grad: 'right', box: {x: 1000, y: 170, w: 600, align: 'center'},
      items: [{type: 'fill', at: 0, pct: 5, w: 150, h: 340, label: '涨价 10% 后掉的消费量'}]},
    // 11 graph：三件事 + 中心
    {id: 'tGraph', photo: 'S20', grad: 'all', dim: 0.4, box: {x: 160, y: 130, w: 1600},
      items: [{type: 'graph', at: 0, w: 1600, h: 640,
        nodes: [
          {id: 'c', x: 620, y: 420, w: 360, at: 0, text: '走不走', sub: 'ELASTICITY'},
          {id: 'a', x: 60, y: 60, w: 340, at: 1, img: 'C02', title: '替代品', sub: 'SUBSTITUTES'},
          {id: 'b', x: 1200, y: 60, w: 340, at: 2, img: 'C03', title: '预算', sub: 'BUDGET'},
          {id: 'd', x: 630, y: 0, w: 340, at: 3, img: 'C04', title: '时间', sub: 'TIME'},
        ],
        edges: [{from: 'a', to: 'c', label: '有没有别处'}, {from: 'b', to: 'c', label: '占多大'}, {from: 'd', to: 'c', label: '来不来得及'}]}]},
  ],
};
const built = buildPhotoEpisode(ep);

// 用例：id、到第几句、steps 偏移（-60 = 全部走完；-12 = 动画中途）
const CASE: Record<number, {id: string; step: number; off: number}> = {
  0: {id: 'tNotch', step: 1, off: -60}, 1: {id: 'tPaper', step: 1, off: -60}, 2: {id: 'tSolid', step: 0, off: -60},
  3: {id: 'tTab', step: 2, off: -60}, 4: {id: 'tTab', step: 1, off: -14},
  5: {id: 'tPhoto', step: 0, off: -60}, 6: {id: 'tRow', step: 0, off: -60}, 7: {id: 'tRow', step: 0, off: -10},
  8: {id: 'tFlap', step: 1, off: -60}, 9: {id: 'tFlap', step: 1, off: -11},
  10: {id: 'tSlam', step: 0, off: -60}, 11: {id: 'tSlam', step: 0, off: -3},
  12: {id: 'tRank', step: 1, off: -60}, 13: {id: 'tRank', step: 1, off: -12},
  14: {id: 'tUnits', step: 0, off: -60}, 15: {id: 'tUnits', step: 0, off: -18},
  16: {id: 'tFill', step: 0, off: -60}, 17: {id: 'tGraph', step: 3, off: -60}, 18: {id: 'tGraph', step: 2, off: -16},
};
export const TACTILE_CASES = Object.keys(CASE).length;

export const TactileLab: React.FC = () => {
  useTitleFont();
  const f = useCurrentFrame();
  const c = CASE[f];
  if (!c) return <AbsoluteFill style={{background: '#000'}} />;
  const Scene = built.scenes[c.id];
  // 每句间隔 1 帧：step 之前的句子都在很久以前（off-… ），当前句在 off。这样 step=1 时第 0 句的东西已走完，第 1 句的在 off 处
  const steps = Array.from({length: 8}, (_, i) => (i <= c.step ? c.off - (c.step - i) * 90 : 9999));
  return (
    <ThemeCtx.Provider value={built.theme}>
      {/* 用 Sequence 把场景内帧号归零：不然 useCurrentFrame 返回的是用例序号，off 就不准 */}
      <Sequence from={f} durationInFrames={1} layout="none"><Scene dur={900} step={c.step} steps={steps} chapter={0} title="" /></Sequence>
    </ThemeCtx.Provider>
  );
};
export default TactileLab;
