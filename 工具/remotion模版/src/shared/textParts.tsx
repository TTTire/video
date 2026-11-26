import React from 'react';
import {Easing, interpolate} from 'remotion';

export type RGB = [number, number, number];
export type Channel = -1 | 0 | 1; // 蓝 / 绿 / 红
const CHANNELS: Channel[] = [1, 0, -1];

export const WARM_SPLIT = 4; // 刚打出来的字额外多错开多少像素
export const WARM_RISE = 12; // 刚打出来的字从下方多少像素升到位
const WARM_FRAMES = 4;

/** 汉字这类一个字占一格的字符。 */
export const isWide = (ch: string) => (ch.codePointAt(0) ?? 0) > 0x2e7f;

/** 某一个通道的那一份：自己的通道用文字颜色，另外两个通道放满，叠在一起就是文字本来的颜色。 */
export const channelColor = (c: RGB, ch: Channel) =>
  `rgb(${ch === 1 ? c[0] : 255}, ${ch === 0 ? c[1] : 255}, ${ch === -1 ? c[2] : 255})`;

/** 竖直点线的背景图（宽 2 像素、3 长 6 空要用背景铺）。 */
export const dotPattern = (color: string) => `repeating-linear-gradient(to bottom, ${color} 0 3px, transparent 3px 9px)`;

/**
 * 把同一份深色内容画三遍（红、绿、蓝各一遍）叠在一起：红份左移、蓝份右移，字的左缘发蓝、右缘发红。
 * 每一份都正片叠底，所以浅色的块（比如黄色高亮）上的字会自然发暗。只适合近黑的颜色；彩色的字用它会被压没，
 * 那就单独画一层，用 textShadow 的左右两道彩色阴影做色散边。
 */
export const SplitGroup: React.FC<{
  split: number; // 红份左移、蓝份右移各多少像素
  blur: number; // 每一份各自糊多少像素，这样糊出来的边是带色的
  style?: React.CSSProperties;
  children: (channel: Channel) => React.ReactNode;
}> = ({split, blur, style, children}) => (
  <div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', ...style}}>
    {CHANNELS.map((ch) => (
      <div
        key={ch}
        style={{
          position: 'absolute',
          inset: 0,
          mixBlendMode: 'multiply',
          transform: `translateX(${-ch * split}px)`,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        }}
      >
        {children(ch)}
      </div>
    ))}
  </div>
);

/** 逐字打出。at 是第一个字符出现的帧，每帧打 cps 个字符；新字符带着色散从下方升到位，WARM_FRAMES 帧后落定。 */
export const Typed: React.FC<{
  text: string;
  frame: number;
  at: number;
  cps: number;
  channel: Channel; // 新字符往哪边错开
  color: string;
  rise?: number;
  fracture?: number;
  digitStretch?: string; // 数字用到多宽（font-stretch），字体得支持
  letterStretch?: string; // 其他字符用到多宽
  style?: React.CSSProperties;
}> = ({text, frame, at, cps, channel, color, rise = WARM_RISE, fracture = WARM_SPLIT, digitStretch, letterStretch, style}) => (
  <div style={{whiteSpace: 'pre', color, ...style}}>
    {Array.from(text).map((ch, i) => {
      const age = frame - (at + i / cps);
      if (age < 0) {
        return null;
      }
      const p = interpolate(age, [0, WARM_FRAMES], [0, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      });
      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            whiteSpace: 'pre',
            transform: `translate(${-channel * fracture * (1 - p)}px, ${rise * (1 - p)}px)`,
            fontStretch: digitStretch && /[0-9]/.test(ch) ? digitStretch : letterStretch,
          }}
        >
          {ch}
        </span>
      );
    })}
  </div>
);

/** 把一段文字切成汉字、非汉字交替的几段。两种字要分别指定字体或字号时用。 */
export const splitRuns = (text: string) => {
  const runs: {wide: boolean; text: string}[] = [];
  Array.from(text).forEach((ch) => {
    const wide = isWide(ch);
    const last = runs[runs.length - 1];
    if (last && last.wide === wide) {
      last.text += ch;
    } else {
      runs.push({wide, text: ch});
    }
  });
  return runs;
};
