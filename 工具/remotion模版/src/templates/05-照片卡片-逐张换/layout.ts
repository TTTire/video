/**
 * 两套版面。
 *
 * 竖屏的数全部是参考视频（720×1280）上量出来的画面坐标，写在 REF 里，最后整个乘 1.5 换到 1080×1920，所以能和参考逐帧对照。
 * 每个数量自哪一帧写在旁边的注释里。
 * 横屏没有参考，是照竖屏那一套的疏密重新排的：产品图、照片卡片都在左边，字在右边。
 */
import type {TemplateProps} from './schema';

export type Box = {x: number; y: number; w: number; h: number};
export type Shadow = {dx: number; dy: number; blur: number; alpha: number};
export type TextStyle = {size: number; color: 'ink' | 'inkSoft' | 'inkGrey'};
export type Petal = {x: number; y: number; len: number; wid: number; rot: number; blur: number; vx: number; vy: number};
export type StyleName = TemplateProps['beats'][number]['style'];
export type PetalSet = 'none' | StyleName | 'near' | 'close';

export type Layout = {
  w: number; // 画面大小
  h: number;
  k: number; // 运动（升降、滑入这些位移）和模糊的数在竖屏上是参考的像素，换到这个画幅乘多少
  cup: {tilt: number; shadow: Shadow[]; body: string; lid: string; lidTop: string}; // 占位纸杯的样子（杯盖宽算 180）
  opening: {
    cup: {x: number; y: number; lidW: number}; // 落定后杯盖中心、杯盖宽
    halo: {x: number; y: number; r: number}; // 产品图后面那一圈压凸的亮斑
    focus: {x: number; y: number; scale: number}; // 压纹图案的中心和大小（1 是基准半径 motifR）
    cornerCups: {x: number; y: number; lidW: number; rot: number}[]; // 角落里露出一点的小杯子
    title: {small: TextStyle; big: TextStyle; right: number; smallBase: number; bigBase: number}; // 右对齐的两行
    tag: {small: TextStyle; big: TextStyle; smallLeft: number; bigLeft: number; smallBase: number; bigBase: number}; // 左对齐的两行
    ribbon: {width: number; space: number; line: [number, number, number, number]}; // 丝带：宽度；落定后中线 y = a0 + a1·x + a2·x² + a3·x³（x、y 先按“丝带坐标”算，再乘 space 换成画面像素）
  };
  styles: Record<StyleName, {
    card: Box;
    radius: number;
    shadow: Shadow[];
    circle?: {x: number; y: number; r: number}; // 版式“圆环”那圈虚线圆
    cap: TextStyle;
    capBox: {x: number; w: number; baseline: number}; // 卡片上方那一行：居中在这一块里
    capBelow?: TextStyle & {baseline: number; x: number; w: number}; // 版式“圆环”下方那一行
    focus: {x: number; y: number; scale: number};
  }>;
  ribbonBeat: {width: number; a: [number, number][]; b: [number, number][]}; // 中间几拍的丝带：从画面上沿一角扫到对面的下沿，cubic 贝塞尔的四个点；a 从右上往左下，b 从左上往右下
  petals: Record<PetalSet, Petal[]>; // 背景里的深色装饰形状，按场次各一组；vx、vy 是每帧漂多少
  ending: {
    cup: {x: number; y: number; lidW: number}; // 推近前杯盖中心
    focus: {x: number; y: number; scale: number};
    near: (TextStyle & {x: number; baseline: number})[]; // 推近前的三行，左对齐
    close: (TextStyle & {x: number; baseline: number})[]; // 推近后的四行，左对齐
    zoom: {scale: number; logo: {x: number; y: number}}; // 推近放大几倍；推近以后杯子上圆标中心落在画面的哪儿
    farFocus: {x: number; y: number; scale: number}; // 大特写里压纹图案的中心和大小（这一套直接按画面坐标摆，不跟着镜头）
  };
  capWrap: number; // 卡片短句最多多宽（超出会折行）
  motifR: number; // 压纹图案的基准半径：focus.scale 乘它
};

// 竖屏：参考坐标。
const REF = {
  cup: {tilt: -11.5, shadow: [{dx: 9, dy: 13, blur: 11, alpha: 0.5}], body: '#ecece6', lid: '#fbfbfa', lidTop: '#ffffff'},
  opening: {
    // 第 60 帧：杯盖 x 266–429、y 478–525，中心 (348, 502)，宽 165（杯身往右倾一点，盖子左低右高）
    cup: {x: 348, y: 502, lidW: 165},
    // 第 60 帧：杯子后面那块比四周亮的地方大致是 x 40–690、y 310–890 的一个圆
    halo: {x: 365, y: 600, r: 300},
    // 第 0–60 帧：压纹图案是一个直径约 600 的大圆盘，中心在 (360, 560)。基准半径是 205，这里的倍数是凭眼睛对着参考第 60 帧定的（1.5 倍时外沿到 310 左右）
    focus: {x: 360, y: 560, scale: 1.5},
    // 第 60 帧：右上角 (640, 50) 一只横着的小杯，左下角 (55, 1200) 一只
    cornerCups: [
      {x: 672, y: 48, lidW: 150, rot: -52},
      {x: 52, y: 1206, lidW: 150, rot: 36},
    ],
    // 第 60 帧：This is how x 374–580、字头 334、基线 368；Starbucks x 254–578、基线 431。两行都右对齐到 x≈580
    title: {small: {size: 47, color: 'inkSoft'}, big: {size: 76, color: 'ink'}, right: 580, smallBase: 368, bigBase: 431},
    // 第 60 帧：built a 从 x 182 起、基线 858；lifestyle 从 x 244 起、基线 930
    tag: {small: {size: 47, color: 'inkSoft'}, big: {size: 80, color: 'ink'}, smallLeft: 182, bigLeft: 244, smallBase: 858, bigBase: 930},
    // 第 60 帧：丝带在中线 x=0 处 y≈465、x=240 处 619、x=480 处 672、x=680 处 786，带宽约 68
    ribbon: {width: 68, space: 1, line: [463, 1.1, -0.00246, 0.00000225]}, // 这一行的 line 单位是参考坐标，不能跟着乘 1.5，下面建 PORTRAIT 时单独改回来
  },
  styles: {
    // 第 84、88 帧：三只杯子 x 225–472、y 482–828；虚线圆圆心 (356, 658)、半径 205；More than 的字在第 396–429 行（基线约 427），
    // just coffee 的字在第 860–920 行（2026-11-26 按时间轴帧号重量：以前写的基线 962 低了 50 像素，参考里这一行紧贴在杯子下面）。
    // 这一拍参考里虚线圆里外是一圈放射的尖角（半径 130–235），这里压纹图案的倍数是对着它定的
    圆环: {
      card: {x: 225, y: 482, w: 247, h: 346},
      radius: 22,
      shadow: [{dx: 0, dy: 26, blur: 20, alpha: 0.42}],
      circle: {x: 356, y: 658, r: 205},
      cap: {size: 47, color: 'inkSoft'} as TextStyle,
      capBox: {x: 60, w: 600, baseline: 427},
      capBelow: {size: 70, color: 'inkGrey', baseline: 912, x: 60, w: 600},
      focus: {x: 356, y: 658, scale: 1.15},
    },
    // 第 140 帧：店面卡片 x 130–600、y 362–1074，圆角约 30，投影往右下；They focused on experience x 92–634、基线 344
    小卡: {
      card: {x: 130, y: 362, w: 470, h: 712},
      radius: 30,
      shadow: [
        {dx: 6, dy: 8, blur: 14, alpha: 0.5},
        {dx: 18, dy: 22, blur: 44, alpha: 0.4},
      ],
      cap: {size: 47, color: 'ink'},
      capBox: {x: 36, w: 648, baseline: 344},
      focus: {x: 365, y: 718, scale: 1.45},
    },
    // 第 216 帧：卡片 x 98–605、y 253–1025；cozy cafés x 208–505、基线 205（Morning routines x 120–595、work sessions x 162–554，都在这条线上）
    大卡: {
      card: {x: 98, y: 253, w: 507, h: 772},
      radius: 32,
      shadow: [
        {dx: 6, dy: 8, blur: 14, alpha: 0.5},
        {dx: 18, dy: 22, blur: 44, alpha: 0.4},
      ],
      cap: {size: 47, color: 'ink'},
      capBox: {x: 20, w: 680, baseline: 205},
      focus: {x: 351, y: 639, scale: 1.3},
    },
  },
  // 第 140 帧：丝带在卡片右上 (600–720, 366–447) 和左下 (80–130, 940–1000) 两头露出来，宽约 62；中间藏在卡片后面，连成一条 S 形。
  // 第 216、260 帧：另一种朝向：从左上 (0–97, 286–451) 扫到右下 (660–720, 662–777)
  ribbonBeat: {
    width: 62,
    a: [
      [740, 380],
      [560, 420],
      [230, 985],
      [-40, 1020],
    ],
    b: [
      [-40, 300],
      [200, 330],
      [560, 740],
      [760, 780],
    ],
  },
  petals: {
    none: [],
    // 第 80、84 帧：右上角三瓣汇在画外，最长的一瓣伸到 (470, 80)；左下角一瓣从角上伸到 (225, 1010)
    圆环: [
      {x: 590, y: 62, len: 270, wid: 72, rot: 161, blur: 7, vx: -0.35, vy: -0.5},
      {x: 676, y: 120, len: 260, wid: 80, rot: 100, blur: 7, vx: -0.35, vy: -0.5},
      {x: 748, y: 128, len: 210, wid: 72, rot: 52, blur: 7, vx: -0.35, vy: -0.5},
      {x: 108, y: 1178, len: 260, wid: 78, rot: -42, blur: 7, vx: 0.2, vy: -0.5},
    ],
    // 第 110、140、170 帧：左上一瓣 (0, 60)→(215, 250)；右下一簇从角上往上长，一路爬到 y≈830
    小卡: [
      {x: 104, y: 152, len: 280, wid: 82, rot: 42, blur: 7, vx: 0.25, vy: 0.45},
      {x: 590, y: 1228, len: 280, wid: 82, rot: 199, blur: 7, vx: -0.1, vy: -1.1},
      {x: 668, y: 1150, len: 260, wid: 82, rot: 258, blur: 7, vx: -0.1, vy: -1.1},
    ],
    // 第 200、230 帧：右上角两瓣；右侧 y 653–841 一小瓣
    大卡: [
      {x: 606, y: 70, len: 260, wid: 82, rot: 149, blur: 7, vx: -0.15, vy: -0.4},
      {x: 690, y: 104, len: 210, wid: 86, rot: 92, blur: 7, vx: -0.15, vy: -0.4},
      {x: 676, y: 740, len: 188, wid: 54, rot: 59, blur: 6, vx: -0.1, vy: 0.1},
    ],
    // 第 290 帧：顶上 (630–719, 0–168) 一瓣
    near: [{x: 668, y: 66, len: 190, wid: 56, rot: 114, blur: 6, vx: 0.1, vy: -0.5}],
    // 第 340 帧：右上 (500–720, 0–175) 一瓣斜着指向左下
    close: [
      {x: 616, y: 64, len: 250, wid: 96, rot: 146, blur: 8, vx: -0.1, vy: -0.4},
      {x: 742, y: 150, len: 180, wid: 80, rot: 100, blur: 8, vx: -0.1, vy: -0.4},
    ],
  },
  ending: {
    // 第 296 帧：杯盖 x 276–450、y 456–506，中心 (357, 481)
    cup: {x: 357, y: 481, lidW: 180},
    // 第 300 帧：压纹图案是一个半径约 290 的圆，中心 (360, 640)
    focus: {x: 360, y: 640, scale: 1.5},
    // 第 340 帧：大特写里压纹图案是一道半径约 470 的大弧，中心 (470, 640)
    farFocus: {x: 470, y: 640, scale: 2.29},
    // 第 296 帧：It wasn't x 255–451、基线 385；about 从 x 215 起、基线 900；coffee x 252–497、基线 962
    near: [
      {size: 51, color: 'inkSoft', x: 255, baseline: 385},
      {size: 51, color: 'inkSoft', x: 215, baseline: 900},
      {size: 104, color: 'ink', x: 252, baseline: 962},
    ],
    // 第 340 帧：It was 从 x 327 起、基线 456；about 从 x 360 起、基线 528；the 从 x 361 起、基线 594；feeling 从 x 280 起、基线 648
    close: [
      {size: 71, color: 'ink', x: 327, baseline: 456},
      {size: 96, color: 'ink', x: 360, baseline: 528},
      {size: 50, color: 'ink', x: 361, baseline: 586},
      {size: 98, color: 'ink', x: 300, baseline: 652},
    ],
    // 第 296 帧对比第 340 帧：杯子上圆标的直径从约 90 变成 248，也就是放大到约 2.8 倍；圆标中心从 (357, 615) 挪到 (27, 602)，高度几乎不变
    zoom: {scale: 2.8, logo: {x: 27, y: 602}},
  },
  // 第 140 帧：那一行字 542 宽，竖屏里留 648
  capWrap: 648,
  // 第 84 帧的虚线圆半径 205
  motifR: 205,
};

/** 把一份全是数字的版面整个乘 k。“rot”是角度、“scale”是倍数，都不乘。 */
const scaleLayout = (spec: unknown, k: number): unknown =>
  Array.isArray(spec)
    ? spec.map((v) => scaleLayout(v, k))
    : typeof spec === 'number'
      ? spec * k
      : spec && typeof spec === 'object'
        ? Object.fromEntries(Object.entries(spec).map(([key, v]) => [key, key === 'rot' || key === 'scale' ? v : scaleLayout(v, k)]))
        : spec;

const SCALED = scaleLayout(REF, 1.5) as Omit<Layout, 'w' | 'h' | 'k'>;
const PORTRAIT: Layout = {
  ...SCALED,
  opening: {...SCALED.opening, ribbon: {width: 68 * 1.5, space: 1.5, line: REF.opening.ribbon.line as [number, number, number, number]}},
  ending: {...SCALED.ending, zoom: {scale: REF.ending.zoom.scale, logo: SCALED.ending.zoom.logo}}, // 放大倍数不是坐标，不跟着乘
  w: 1080,
  h: 1920,
  k: 1.5,
};

// 横屏：没有参考，照竖屏的疏密重新排。产品图和卡片在左边（中轴 x≈600），字在右边。位移按画面高度 1080/1280 换算。
const wide = (p: Petal): Petal => ({...p, x: p.x * 2.667, y: p.y * 0.844, len: p.len * 1.25, wid: p.wid * 0.95, blur: p.blur * 0.9});
const CARD_SHADOW: Shadow[] = [
  {dx: 6, dy: 8, blur: 14, alpha: 0.5},
  {dx: 18, dy: 22, blur: 44, alpha: 0.4},
];
const LAND: Layout = {
  w: 1920,
  h: 1080,
  k: 1080 / 1280,
  cup: REF.cup,
  opening: {
    cup: {x: 600, y: 430, lidW: 150},
    halo: {x: 610, y: 590, r: 340},
    focus: {x: 600, y: 560, scale: 1.1},
    cornerCups: [
      {x: 1860, y: 40, lidW: 140, rot: -52},
      {x: 40, y: 1050, lidW: 140, rot: 36},
    ],
    title: {small: {size: 50, color: 'inkSoft'}, big: {size: 100, color: 'ink'}, right: 1560, smallBase: 408, bigBase: 492},
    tag: {small: {size: 50, color: 'inkSoft'}, big: {size: 104, color: 'ink'}, smallLeft: 1040, bigLeft: 1130, smallBase: 800, bigBase: 906}, // 放在丝带下面，别压着
    // 重新排的：从左边 (0, 380) 到右边 (1920, 858)，中间平、两头陡，从产品图 (600, 430) 的杯身后面过
    ribbon: {width: 62, space: 1, line: [380.3, 0.4992, -0.00039074, 1.3567e-7]},
  },
  styles: {
    圆环: {
      card: {x: 470, y: 330, w: 340, h: 440},
      radius: 26,
      shadow: [{dx: 0, dy: 22, blur: 18, alpha: 0.42}],
      circle: {x: 640, y: 560, r: 300},
      cap: {size: 54, color: 'inkSoft'},
      capBox: {x: 240, w: 800, baseline: 214},
      capBelow: {size: 82, color: 'inkGrey', baseline: 912, x: 240, w: 800}, // 离色块底 50，和竖屏一样紧贴在下面
      focus: {x: 640, y: 560, scale: 1},
    },
    小卡: {
      card: {x: 360, y: 180, w: 480, h: 726},
      radius: 32,
      shadow: CARD_SHADOW,
      cap: {size: 64, color: 'ink'},
      capBox: {x: 960, w: 900, baseline: 430},
      focus: {x: 600, y: 560, scale: 1.2},
    },
    大卡: {
      card: {x: 330, y: 120, w: 540, h: 822},
      radius: 34,
      shadow: CARD_SHADOW,
      cap: {size: 72, color: 'ink'},
      capBox: {x: 980, w: 880, baseline: 430},
      focus: {x: 600, y: 560, scale: 1.1},
    },
  },
  ribbonBeat: {
    width: 60,
    // 重新排的：横屏的短句在卡片右上方，丝带贴着画面下半走，别压着字（右上头 (1980, 520)、左下尾 (−80, 860)，中间藏在卡片后面）
    a: [
      [1980, 500],
      [1480, 540],
      [760, 800],
      [-80, 880],
    ],
    b: [
      [-80, 250],
      [400, 280],
      [1300, 830],
      [2000, 870],
    ],
  },
  petals: {
    none: [],
    圆环: REF.petals.圆环.map(wide),
    小卡: REF.petals.小卡.map(wide),
    大卡: REF.petals.大卡.map(wide),
    near: REF.petals.near.map(wide),
    close: REF.petals.close.map(wide),
  },
  ending: {
    cup: {x: 630, y: 400, lidW: 160},
    focus: {x: 620, y: 560, scale: 1.15},
    near: [
      {size: 60, color: 'inkSoft', x: 1000, baseline: 410},
      {size: 60, color: 'inkSoft', x: 950, baseline: 520},
      {size: 112, color: 'ink', x: 1040, baseline: 625},
    ],
    close: [
      {size: 78, color: 'ink', x: 1000, baseline: 440},
      {size: 112, color: 'ink', x: 1060, baseline: 540},
      {size: 58, color: 'ink', x: 1062, baseline: 600},
      {size: 150, color: 'ink', x: 900, baseline: 700},
    ],
    zoom: {scale: 2.8, logo: {x: 150, y: 530}}, // 重新排的：圆标落在左边，杯子占左边三分之一
    farFocus: {x: 1250, y: 540, scale: 1.6}, // 重新排的：一道大弧在右边字后面
  },
  capWrap: 880,
  motifR: 300,
};

export const layoutFor = (orientation: TemplateProps['orientation']): Layout => (orientation === '竖屏' ? PORTRAIT : LAND);

/** 纸杯上圆标中心相对杯盖中心的位置（单位：杯盖宽），这是杯子竖直站着时的。对着参考第 296 帧：圆标中心 (357, 615)，杯盖中心 (357, 481)，杯盖宽 180；
 *  往左偏一点是为了抵掉杯身的倾斜，转完正好在杯盖中心正下方。 */
export const CUP_LOGO: [number, number] = [-0.07, 0.745];

/** 竖直站着的杯子上的一点（相对杯盖中心，单位：杯盖宽），杯子倾斜 tilt 度以后落在哪儿。 */
export const cupPoint = (tilt: number, p: [number, number]): [number, number] => {
  const a = (tilt * Math.PI) / 180;
  return [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]; // 和 SVG、CSS 的 rotate 是同一个方向
};
