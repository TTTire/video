import React from 'react';
import {Html5Audio, Sequence, interpolate, random, staticFile, useVideoConfig} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
// 为 true 时，Pop 等基础元件出现会自动带一声轻微 pop（由 Episode 的 fx 模式开启）
export const AutoSfxCtx = React.createContext(false);

import manifest from './sfx-manifest.json';

// 音效类型：优先使用 sfx-library 导入的音效，同类多个版本按时间点轮流；没有导入时退回合成音效
export type SfxName = 'whoosh' | 'pop' | 'impact' | 'swipe' | 'tick' | 'ding' | 'riser' | 'flip' | 'cash' | 'error' | 'typing' | 'notify' | 'boom' | 'shutter' | 'ambience';
const FALLBACK: Record<string, string> = {whoosh: 'whoosh', pop: 'pop', impact: 'thud', swipe: 'swoosh', tick: 'tick', ding: 'ding', riser: 'riser', flip: 'swoosh', boom: 'thud'};
export const Sfx: React.FC<{at: number; name: SfxName; vol?: number; dur?: number; endAt?: number; fade?: number}> = ({at, name, vol = 0.35, dur, endAt, fade = 0}) => {
  // at：开始帧；dur：最多播几秒（用于截断连续音，如计数声）；endAt：让声音在这一帧结束（用于 riser 对齐揭晓点）；fade：首尾淡入淡出秒数
  const {fps} = useVideoConfig();
  const list: {file: string; dur: number}[] = ((manifest as any)[name] ?? []).map((x: any) => (typeof x === 'string' ? {file: x, dur: 1} : x));
  const pick = list.length ? list[Math.floor(random(`${name}-${Math.round(at)}`) * list.length)] : FALLBACK[name] ? {file: `${FALLBACK[name]}.wav`, dur: 1} : null;
  if (!pick) return null;
  const len = Math.round((dur ?? pick.dur) * fps);
  const start = Math.round(endAt !== undefined ? endAt - Math.round(pick.dur * fps) : at);
  // 场景开头之前就该开始的部分（比如 riser 前半段）直接裁掉，保证结尾对准揭晓点
  const skip = Math.max(0, -start);
  const fd = Math.round(fade * fps);
  return (
    <Sequence from={Math.max(0, start)} durationInFrames={Math.max(1, len - skip)} layout="none">
      <Html5Audio src={staticFile(`sfx/${pick.file}`)} trimBefore={skip || undefined} volume={(f) => (fd ? vol * interpolate(f, [0, fd, len - fd, len], [0, 1, 1, 0], clamp) : vol)} />
    </Sequence>
  );
};

