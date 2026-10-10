// 关键帧拼图：一帧之内把整期的关键画面排成网格，渲染一张 still 就能通览全片（不用渲 1 小时）。
// 原理：Sequence from 为负数时，子组件看到的帧号 = 当前帧 + 偏移量。
import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {Timeline} from '../Episode';
import {PHOTO_THEME} from './kit';

export type Thumb = {frame: number; label: string};
export const COLS = 5, THUMB_W = 376, THUMB_H = 211, LABEL_H = 34, PAD = 6;

// 每个场景取几个关键帧：场景开头 +36 帧（等飞入结束），之后每隔 ≥90 帧的句子起点 +36，一个场景最多 4 张
export const pickThumbs = (tl: Timeline, names: Record<string, string> = {}): Thumb[] => {
  const out: Thumb[] = [];
  tl.scenes.forEach((sc, i) => {
    const label = sc.scene === 'chapter' ? `第${sc.chapter}章` : names[sc.scene] ?? sc.scene;
    const cands = (sc.steps as number[]).map((s) => Math.min(s + 36, sc.dur - 1));
    const picked: number[] = [];
    cands.forEach((c) => { if (!picked.length || c - picked[picked.length - 1] >= 90) picked.push(c); });
    picked.slice(0, 4).forEach((c, j) => out.push({frame: sc.from + c, label: `${String(i + 1).padStart(2, '0')} ${label}${picked.length > 1 ? ` ·${j + 1}` : ''}  ${(Math.round((sc.from + c) / tl.fps))}s`}));
  });
  return out;
};
export const sheetHeight = (n: number) => Math.ceil(n / COLS) * (THUMB_H + LABEL_H + PAD) + PAD;

export const Sheet: React.FC<{thumbs: Thumb[]; total: number; children: React.ReactNode}> = ({thumbs, total, children}) => (
  <AbsoluteFill style={{background: '#000', flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', padding: PAD / 2, gap: PAD}}>
    {thumbs.map((t, i) => (
      <div key={i} style={{width: THUMB_W, height: THUMB_H + LABEL_H}}>
        <div style={{width: THUMB_W, height: THUMB_H, overflow: 'hidden', position: 'relative', background: '#111'}}>
          <div style={{position: 'absolute', width: 1920, height: 1080, transform: `scale(${THUMB_W / 1920})`, transformOrigin: '0 0'}}>
            <Sequence from={-t.frame} durationInFrames={total + t.frame} layout="none">{children}</Sequence>
          </div>
        </div>
        <div style={{height: LABEL_H, color: PHOTO_THEME.dim, fontFamily: PHOTO_THEME.font, fontSize: 18, lineHeight: `${LABEL_H}px`, paddingLeft: 6, whiteSpace: 'nowrap', overflow: 'hidden'}}>{t.label}</div>
      </div>
    ))}
  </AbsoluteFill>
);
