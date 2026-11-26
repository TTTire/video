import {Curve, Key, curve} from '../../shared/curve';
import {L, POINTER_END, POINTER_REST} from './layout';
import {TemplateProps} from './schema';

/**
 * “某一刻画面该是什么样”。这里的曲线全是照参考逐帧量出来的，帧号都是参考上的（参考里点下发送钮是第 105 帧、
 * 发送后的变化从第 111 帧起）。表里相邻两帧之间用共用的 curve.ts 连成速度连续的平滑曲线，不是一段段直线拼的。
 */

const CLICK_REF = 105;
const SEND_REF = 111;

/** 表里的帧号整体挪一下（clickAt、sendAt、typeAt 改了的时候，表跟着走）。 */
const shift = (keys: Key[], by: number): Key[] => keys.map(([f, v]) => [f + by, v]);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// 字块的上沿：行高里基线在 (行高/2 + 0.3305) 个字高处（Archivo 的度量，见共用的 fontMetrics.ts）
const TEXT_TOP = L.text.baseline - L.text.size * (L.text.line / 2 + 0.3305);

// ---- 打字 ----
// 参考里每个字是第几帧完全变成深色的（从第 22 帧起算；看的是字行右缘一帧一帧怎么长）。不是匀速：词和词之间有半拍到三拍的停顿，
// Let's（到 23）→ design（到 37）→ an（到 40.6）→ interface（到 54.5）→ for（到 60）→ a、new（到 68）→ AI（到 72）→ workbench（到 85）。
// 参考里每敲一个字，光标先跳到它后面，字再过一两帧淡入变深；这里照这个来：光标在字变深之前 CHAR_LEAD 帧跳过去，
// 字在跳过去以后 0.3 帧开始淡入，到“变深的那一帧”全深（空格没有字形，只管光标）。
// 别的文字照这张表等比伸缩换算：默认那句和参考逐帧对得上，换了长短以后停顿还是有的，只是不再落在词边界上。
const RHYTHM = [0.4, 1, 3, 4, 5, 6, 8, 9, 11, 12, 13, 15, 15.8, 17, 18.6, 19, 22, 23.5, 24.5, 26.3, 27.3, 28.3, 30.5, 31, 32, 34, 35, 36.3, 37.5,
  40, 40.6, 43, 44.5, 46.3, 47, 49, 50, 50.5, 53, 54, 55.3, 57, 58.3, 59.3, 61, 62, 63];
const RHYTHM_LEN = 63; // 最后一个字在第 63 帧（也就是第 85 帧）变深
export const CHAR_LEAD = 1; // 光标比字变深早跳几帧（参考里 0.5 到 2 帧不等，取 1）
const CHAR_DELAY = 0.3; // 光标跳过去以后过几帧字开始淡入
export const CHAR_FADE = CHAR_LEAD - CHAR_DELAY; // 字淡入用几帧

/** 每个字完全变深的帧号。 */
const keyTimes = (n: number, at: number, end: number): number[] => {
  if (n === 0) {
    return [];
  }
  const scale = Math.max(1, end - at) / RHYTHM_LEN;
  const total = RHYTHM.length;
  const keys: number[] = [];
  for (let j = 0; j < n; j++) {
    // 第 j 个字变深时，这句话完成了 (j + 1) / n；照参考里完成同样比例是在第几帧
    const done = ((j + 1) * total) / n;
    const i = Math.min(total - 1, Math.ceil(done) - 1);
    const t = i === 0 ? RHYTHM[0] * done : lerp(RHYTHM[i - 1], RHYTHM[i], done - i);
    keys.push(at + t * scale);
  }
  return keys;
};

// ---- 指针 ----
// 不透明度：在右下角淡入（第 78 到 84 帧），点完以后淡出（第 108 到 110 帧）
const POINTER_IN: Key[] = [[77.5, 0], [78, 0.26], [79, 0.5], [80, 0.65], [81, 0.8], [82, 0.88], [83, 0.97], [84.5, 1]];
const POINTER_OUT: Key[] = [[107.5, 1], [108, 0.65], [109, 0.2], [110, 0]];
// 从起点到终点走过了全程的几成。第 88 帧起步、第 103 帧到（滑 15 帧，全程 433 像素）。
// 每帧走的距离对称：2.8、7.2、12.8、20.8、32.8、45、58.6、72.8，再对称地慢下来，中间最快的一帧 73 像素。两头都从静止起步、停成静止。
const SLIDE: Key[] = [
  [88, 0], [89, 0.0065], [90, 0.0232], [91, 0.0528], [92, 0.1008], [93, 0.1765], [94, 0.2805], [95, 0.4158],
  [96, 0.584], [97, 0.7194], [98, 0.8233], [99, 0.899], [100, 0.9471], [101, 0.9767], [102, 0.9933], [103, 1],
];
// 点下去那一下：以尖为轴缩到九成（第 105、106 帧），第 107 帧回到九四成，第 108 帧复原
const PRESS: Key[] = [[104, 1], [105, 0.9], [106, 0.9], [107, 0.94], [108, 1]];

// ---- 发送以后 ----
// 打好的字往上挪多少（像素，一共 23）、还剩几成不透明。不缩放，也不左右挪。
// 参考量出来是 0、5、9、12、15、18、20、21、22、23：第一帧就从零跳到 5 不好看，这里把起步抹顺了，
// 第 111 到 115 帧比参考低 2 到 3.5 像素（那几帧字正在淡出，看不出来），以后每帧差不到 2 像素。
const TEXT_LIFT: Key[] = [[110, 0], [111, 2], [112, 5.5], [113, 9], [114, 12.5], [115, 16], [116, 19.5], [117, 21.3], [118, 22.3], [119, 23]];
const TEXT_OUT: Key[] = [[110, 1], [111, 0.82], [112, 0.66], [113, 0.52], [114, 0.38], [115, 0.26], [116, 0.19], [117, 0.12], [118, 0.08], [119, 0.04], [120, 0]];
// 模型标签药丸：跟着字一起淡，同时压扁、收窄（外框从 208×48 收到 134×8）。
const PILL_X: Key[] = [[112, 1], [114, 1], [117, 0.83], [120, 0.64]];
const PILL_Y: Key[] = [[112, 1], [114, 1], [116, 0.63], [120, 0.1]];
// 发送钮左边的三个点：第一个淡入得最快，第二个一帧就出来，第三个拖了九帧。
const DOT_1: Key[] = [[110.6, 0], [111, 0.27], [112, 0.43], [113, 0.63], [114, 1]];
const DOT_2: Key[] = [[110.5, 0], [111, 0.62], [112, 1]];
const DOT_3: Key[] = [[110.5, 0], [111, 0.29], [114, 0.38], [117, 0.67], [120, 1]];

export type View = {
  /** 页面上几个点此刻落在画面哪里。第 0 个是指针的尖（主角）；第 1 个是打进去的字块的左上角（发送后往上走）；后面是输入框的两个角和发送钮的圆心，全片不动。 */
  probes: [number, number][];
  /** 指针：尖的位置、缩放、不透明度 */
  pointer: {x: number; y: number; scale: number; opacity: number};
  /** 已经打出来几个字（带小数：小数部分是正在淡入的那一个） */
  typed: number;
  /** 光标该排在第几个字后面：开始出现的字都算 */
  shown: number;
  /** 每个字完全变深的帧号，和 props.prompt 里的字一一对应 */
  keys: number[];
  /** 这一帧的帧号（可以带小数） */
  t: number;
  /** 光标此刻的亮度（0 或 1） */
  caret: number;
  /** 发送后字块往上挪了多少像素、还剩几成不透明 */
  textLift: number;
  textOpacity: number;
  /** 模型标签药丸 */
  pill: {scaleX: number; scaleY: number};
  /** 发送后淡入的三个点各自的不透明度 */
  dots: number[];
};

/** 给一组参数，返回“某一刻 t 画面该是什么样”的函数。t 可以带小数：算动态模糊时要在两帧之间再取几个样。 */
export const makeView = (props: TemplateProps): ((t: number) => View) => {
  const n = Array.from(props.prompt).length;
  const keys = keyTimes(n, props.typeAt, props.typeEnd);
  // 打字的进度曲线：第 j 个字在 keys[j] 变深，相邻两个之间用共用的 curve 连起来
  const typed = n ? curve([[props.typeAt - CHAR_LEAD, 0], ...keys.map((k, j): Key => [k, j + 1])]) : () => 0;

  // 指针的表按 clickAt 挪，发送后的表按 sendAt 挪
  const pc = props.clickAt - CLICK_REF;
  const sc = props.sendAt - SEND_REF;
  const pointerIn = curve(shift(POINTER_IN, pc));
  const pointerOut = curve(shift(POINTER_OUT, pc));
  const slide = curve(shift(SLIDE, pc), {start: true, end: true});
  const press = curve(shift(PRESS, pc));
  const textLift = curve(shift(TEXT_LIFT, sc), {start: true});
  const textOut = curve(shift(TEXT_OUT, sc));
  const pillX = curve(shift(PILL_X, sc));
  const pillY = curve(shift(PILL_Y, sc));
  const dots = props.thinking ? [curve(shift(DOT_1, sc)), curve(shift(DOT_2, sc)), curve(shift(DOT_3, sc))] : [];
  const period = Math.max(1, props.caretPeriod);

  return (t) => {
    // 指针：先算出尖该在哪，再看它现在看不看得见（还没出现、已经走掉、或者参数里关掉了，都画不出来，但位置照常报）
    const q = slide(t);
    const px = lerp(POINTER_REST[0], POINTER_END[0], q);
    const py = lerp(POINTER_REST[1], POINTER_END[1], q);
    const opacity = props.showPointer ? pointerIn(t) * pointerOut(t) : 0;
    const lift = textLift(t);
    return {
      probes: [
        [px, py],
        [L.text.left, TEXT_TOP - lift],
        [L.box.left, L.box.top],
        [L.box.left + L.box.w, L.box.top + L.box.h],
        [L.send.cx, L.send.cy],
      ],
      pointer: {x: px, y: py, scale: press(t), opacity},
      typed: typed(t),
      shown: keys.reduce((sum, k) => sum + (t >= k - CHAR_LEAD + 0.05 ? 1 : 0), 0), // 光标排在已经开始敲的字后面
      keys,
      t,
      caret: t < props.sendAt && ((t % period) + period) % period < period / 2 ? 1 : 0,
      textLift: lift,
      textOpacity: textOut(t),
      pill: {scaleX: pillX(t), scaleY: pillY(t)},
      dots: dots.map((d) => d(t)),
    };
  };
};
