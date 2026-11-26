// 第 07 期的特殊画面。photo.json 里用 {"type":"custom","name":"xxx"} 引用（全屏覆盖层，盖在场景照片上、字的下面）。
// 三段都是 工具/remotion模版 出的片子：参数在 src/ai07/tpl/*.json，出片命令见剪辑说明「重新生成」，片子放 public/ai07/tpl/（不进 git）。
//   title   07 title：01-宋体标题-打字数据表，只用标题「一家公司为什么离不开一个人 / Key-person risk」，铺底 S01，整场 150 帧
//   jobs    19 jobs：06-AI输入框-打字发送，「我先让 AI 去调研了一圈」时打字、「捋了一遍」说完点发送；第 145 帧起淡出，露出 S07 和后面的字
//   board2  27 board2：01 标题 + 表格「先拒绝 后请回」，「中间只隔六天」时表格滑入、高亮 11月23日 那一行；第 140 帧起淡出
// 片子从场景第 0 条要点开始放，帧号都是相对场景起点的（对的是 粗剪审核通过.words.json 的逐字时间，A-roll 重剪过就要重出片子）。
import React from 'react';
import {AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {P, at, clamp} from '../photo/kit';
import {CustomMap} from '../photo/engine';

// end：片子放到第几帧收掉；fade：收之前淡出几帧（0 = 放满直接切）
const Clip: React.FC<{p: P; src: string; end: number; fade?: number}> = ({p, src, end, fade = 0}) => {
  const f = useCurrentFrame();
  const s0 = at(p, 0);
  if (f >= s0 + end) return null;
  const o = fade > 0 ? interpolate(f, [s0 + end - fade, s0 + end], [1, 0], clamp) : 1;
  return (
    <Sequence from={s0} durationInFrames={end} layout="none">
      <AbsoluteFill style={{opacity: o}}>
        <Video src={staticFile(src)} muted style={{width: '100%', height: '100%'}} />
      </AbsoluteFill>
    </Sequence>
  );
};

export const CUSTOMAI07: CustomMap = {
  title: (p) => <Clip p={p} src="ai07/tpl/title.mp4" end={150} />,
  jobs: (p) => <Clip p={p} src="ai07/tpl/jobs.mp4" end={158} fade={13} />,
  board2: (p) => <Clip p={p} src="ai07/tpl/board2.mp4" end={152} fade={12} />,
};
