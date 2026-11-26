import {interpolate} from 'remotion';

// 这里的数都来自对参考视频的逐帧测量，帧号和参考视频对齐（30fps）。

/** 标题进场：录屏开始时字已经在动，大约第 14 帧落定。返回 0→1。 */
export const settleProgress = (frame: number): number => {
  const u = Math.max(0, Math.min(1, (frame + 1.6) / 15.4));
  return 1 - (1 - u) * (1 - u);
};

// 落定后标题仍在缓慢上漂，到第 30 帧开始加速冲出画面。
export const TITLE_LAYOUT_FRAME = 30;
export const TITLE_CREEP = 3.3; // 每帧上漂多少像素
const EXIT_FRAMES = [30, 33, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54];
const EXIT_LIFT = [0, 12, 30, 38, 48, 60, 74, 89, 106, 126, 149, 174, 206, 240, 282, 330, 385, 450, 514, 594, 700];

/** 标题退场：第 30 帧起向上越冲越快，第 53 帧后整块出画。返回已经上移了多少像素。 */
export const titleLift = (frame: number): number =>
  frame <= TITLE_LAYOUT_FRAME ? 0 : interpolate(frame, EXIT_FRAMES, EXIT_LIFT, {extrapolateRight: 'extend'});

const SLIDE_FRAMES = Array.from({length: 26}, (_, i) => i);
const SLIDE_OFFSET = [512, 440, 377, 321, 274, 233, 199, 170, 146, 124, 106, 89, 75, 63, 51, 42, 34, 27, 21, 17, 13, 10, 7, 5, 3, 0];

/** 表格滑入：从表格进场算起（k = 0）先在最终位置下方 512px，25 帧内减速停稳。 */
export const tableSlide = (k: number): number =>
  interpolate(k, SLIDE_FRAMES, SLIDE_OFFSET, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const FLOAT_FRAMES = [51, 66, 82, 97, 112, 127, 147, 167, 187];
const FLOAT_X = [0, 5, 3, -11, -16, -20, -16, -5, -3];
const FLOAT_Y = [0, -12, 0, -13, -21, -25, -25, -25, -27];

/** 表格停稳后整块缓慢漂一下（先左上、再回到右下），免得定死后太死板。返回 x、y 偏移。 */
export const floatOffset = (k: number): [number, number] => {
  const opt = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  return [
    interpolate(k, FLOAT_FRAMES, FLOAT_X, opt),
    interpolate(k, FLOAT_FRAMES, FLOAT_Y, opt),
  ];
};

/** 黄色高亮：从左往右展开，每帧补上剩余宽度的 14.5%，先快后慢。k 是高亮开始后的帧数，返回已展开的比例。 */
export const wipeProgress = (k: number): number => 1 - Math.pow(0.855, k);
