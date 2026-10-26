// 引擎验证台：直接走正式渲染链路（engine.tsx 的 makeScene），验证新加的东西真的生效。
// 和 Lab.tsx 的区别：Lab.tsx 是独立手写的样式草图；这里是 photo.json 真字段 → 真引擎 → 真像素。
// 渲染：python scripts/lab.py engine（出 4 张到 out/stylelab/engine-*.jpg）
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {EpisodeSpec, buildPhotoEpisode} from '../photo/engine';
import {useTitleFont} from '../photo/kit';
import {ThemeCtx} from '../ui';

// 用 ai02（已发布，配色最完整）的真图，文案也是 ai02 发布清单里的事实
const ep: EpisodeSpec = {
  ep: 'ai02', badge: '', series: 'AI经济学', photos: 'ai02/photos', chapterPhoto: 'S20',
  style: {layout: 'topleft', scale: 'v2', enter: 'cut', grain: false,
    theme: {gold: '#E8833A', coral: '#D9534F', teal: '#7FB89A', bg: '#0A0806', dim: '#CFC6BA'}},
  scenes: [
    // A：notch 卡（前提/定义）+ v2 字号
    {id: 'eA', photo: 'S01', grad: 'left', dim: 0.25, box: {x: 90, y: 250, w: 900, card: 'notch', label: '前提'},
      items: [
        {type: 'h', at: 0, text: '只在**一种东西**上成立'},
        {type: 't', at: 1, text: '便宜一点，就能冒出新用法'},
      ]},
    // B：tab 卡（一条数据）+ big 180
    {id: 'eB', photo: 'S13', grad: 'left', dim: 0.25, box: {x: 90, y: 130, w: 900, card: 'tab', label: '1750 → 1850 · 英国', tabColor: 'dim'},
      items: [
        {type: 't', at: 0, text: '一年挖的煤', color: 'white'},
        {type: 'big', at: 1, text: '6250 万吨'},
        {type: 't', at: 2, text: '每一台省了，**台数涨得更快**'},
      ]},
    // C：stack 叠卡（因果链）— 上次 bug 的那个内容
    {id: 'eC', photo: 'S13', grad: 'left', dim: 0.25, box: {x: 90, y: 140},
      items: [{type: 'stack', at: 0, items: [
        {big: '↓ 2/3', small: '每台机器用的煤', color: 'teal'},
        {big: '↑ 台数', small: '矿井 → 纺织厂 → 火车', color: 'coral'},
        {big: '× 12', small: '一年挖的煤'},
      ]}]},
    // D：三个字效
    {id: 'eD', photo: 'S12', grad: 'none', dim: 0.45, box: {x: 90, y: 150, w: 1500},
      items: [
        {type: 'h', at: 0, text: '效率越高', textfx: 'outline', size: 140},
        {type: 'h', at: 0, text: '杰文斯悖论', textfx: 'gradient', size: 140, delay: 0},
        {type: 'h', at: 0, text: '总消耗越多', textfx: 'reveal', size: 140},
      ]},
    // E：stagger 逐字 + solid 卡（结论）
    {id: 'eE', photo: 'S12', grad: 'none', dim: 0.35, box: {x: 90, y: 140}},
    {id: 'eF', photo: 'S13', grad: 'left', dim: 0.25, box: {x: 90, y: 200, w: 900, card: 'solid', label: '结论'},
      items: [{type: 'h', at: 0, text: '省得越多，用得越多'}]},
  ],
};

const built = buildPhotoEpisode(ep);

// 每个 id 取一帧：让入场动画走完（帧 20 ≈ 0.66 秒）
const CASE: Record<number, {id: string; step: number}> = {
  0: {id: 'eA', step: 1}, 1: {id: 'eB', step: 2}, 2: {id: 'eC', step: 2},
  3: {id: 'eD', step: 0}, 4: {id: 'eF', step: 0},
};

const ThemeWrap: React.FC<{children: React.ReactNode}> = ({children}) => (
  <ThemeCtx.Provider value={built.theme}>{children}</ThemeCtx.Provider>
);

export const EngineLab: React.FC = () => {
  useTitleFont();
  const f = useCurrentFrame();
  const c = CASE[f];
  if (!c) return <AbsoluteFill style={{background: '#000'}} />;
  const Scene = built.scenes[c.id];
  // 每步 90 帧；截图那一帧落在 step 开始后 20 帧 —— 入场动画已走完，下一句还没来
  const steps = Array.from({length: 8}, (_, i) => i * 90);
  const step = c.step;
  // steps 全推到 -20：所有元素都已出现、入场弹簧已走完（still 只渲 frame 0）
  const shifted = <Scene dur={540} step={step} steps={steps.map(() => -60)} chapter={0} title="" />;
  return <ThemeWrap>{shifted}</ThemeWrap>;
};
export default EngineLab;
