/** 鱼眼（桶形）镜头的算法，不碰画面。src/shared/Lens.tsx 用它铺贴图；模版用它算内容里的点最后落在画面哪儿。 */

/** 位移贴图：public/lens/band-0.png 起按顺序的几张，scripts/make_lens_map.py 生成，所有模版共用。
 *  part 是这一段占总位移多少（加起来是 1），要和生成时一致；Lens 里每段的 scale 是 2 × part × strength。
 *  为什么要分成几段：贴图只有 8 位，一次挪几百像素会有上像素的台阶；里圈那段只占总位移的一小份，主角待的那一带才够细。 */
export const LENS_BANDS: {file: string; part: number}[] = [
  {file: 'lens/band-0.png', part: 0.07},
  {file: 'lens/band-1.png', part: 0.24},
  {file: 'lens/band-2.png', part: 0.24},
  {file: 'lens/band-3.png', part: 0.24},
  {file: 'lens/band-4.png', part: 0.21},
];

/** 位移里“半径的五次方”那部分占多少。要和生成贴图时的 --高次 一致，不然 lensProject 算出来的位置和画面对不上。 */
const HIGH = 0.4;

/** 位移贴图的圆铺成 reach 的几倍，要和生成贴图时的 --铺 一致。铺大是为了把伸到画面外的内容全罩进去（Chrome 做置换时，
 *  落在贴图圆以外的内容靠不住，见 make_lens_map.py 的说明）；弯曲规律不受它影响，Lens 铺贴图时要用到。 */
export const LENS_SPREAD = 2;

export type LensSpec = {
  w: number; // 画面多宽、多高
  h: number;
  strength: number; // 画面离镜头中心最远的那一角，内容往外挪多少像素。0 就是没有镜头
  center?: [number, number]; // 镜头中心在画面的哪儿，默认画面中心
  pads?: LensPads; // 置换层四边各往画面外留多少。不填就四边都留 lensPad；要省渲染时间的话可以按实际要采多远逐边给
};

/** 置换层的四边各往画面外留多少像素。 */
export type LensPads = {l: number; r: number; t: number; b: number};

const centerOf = (s: LensSpec): [number, number] => s.center ?? [s.w / 2, s.h / 2];

/** 从一点离开多少个“半径”，它挪多远：圆心不挪，越靠边挪得越多，而且涨得越来越快。半径 1 时正好是 1。 */
const shift = (rho: number) => (1 - HIGH) * rho ** 3 + HIGH * rho ** 5;

/** 镜头中心到画面最远的一角有多远。位移贴图的圆盘就铺成这么大，所以那一角的位移正好是 strength。 */
export const lensReach = (s: LensSpec): number => {
  const [cx, cy] = centerOf(s);
  return Math.hypot(Math.max(cx, s.w - cx, 0), Math.max(cy, s.h - cy, 0)) || 1;
};

/** 内容层四周至少要比画面大出多少像素：画面边上往外采样的最大距离，再加一点余量。 */
export const lensPad = (s: LensSpec): number => Math.ceil(s.strength) + 4;

/**
 * 内容里的一个点经过镜头以后落在画面的哪儿。给的是画面坐标（不看镜头时它在哪儿），回的也是画面坐标。
 * 画面上的点显示的是往外挪过之后的内容，所以这是在反解“挪多远才落到这个点上”，二分。
 * 用它算 probes：motion.mjs 量的是画面上的位置，内容动得多快要经过镜头才算得准。
 */
export const lensProject = (s: LensSpec) => (x: number, y: number): [number, number] => {
  const [cx, cy] = centerOf(s);
  const dx = x - cx;
  const dy = y - cy;
  const out = Math.hypot(dx, dy); // 这个点离镜头中心多远
  if (out === 0 || s.strength === 0) {
    return [x, y];
  }
  const reach = lensReach(s);
  // 画面半径 r 上显示的点，内容里离中心 r + strength × shift(r / reach)；它随 r 单调变大，所以二分找 r
  let lo = 0;
  let hi = out;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (mid + s.strength * shift(mid / reach) < out) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const k = (lo + hi) / 2 / out;
  return [cx + dx * k, cy + dy * k];
};

/**
 * lensProject 的反方向：画面上的一个点显示的是内容里的哪个点（不看镜头时它在画面上的位置）。这个方向是直接算的：
 * 离中心 r 的地方，显示的是离中心 r + strength × shift(r / reach) 的内容。给置换层逐边留白、把画面上的线反解回内容里的线时用。
 */
export const lensUnproject = (s: LensSpec) => (x: number, y: number): [number, number] => {
  const [cx, cy] = s.center ?? [s.w / 2, s.h / 2];
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy);
  const k = r === 0 ? 1 : 1 + (s.strength * shift(r / lensReach(s))) / r;
  return [cx + dx * k, cy + dy * k];
};

/**
 * 按镜头自己算四边各要留多少：把画面四条边上的点换回内容里的位置，最远到哪儿就留到哪儿，再加 margin 像素余量。
 * 只算镜头，不算内容的移动；内容会挪出这个范围的话得自己把范围放宽，或者干脆用四边一样的 lensPad。
 */
export const lensPadsFor = (s: LensSpec, margin = 40): LensPads => {
  const toContent = lensUnproject(s);
  const out: LensPads = {l: 0, r: 0, t: 0, b: 0};
  const take = (x: number, y: number) => {
    const [px, py] = toContent(x, y);
    out.l = Math.max(out.l, -px);
    out.r = Math.max(out.r, px - s.w);
    out.t = Math.max(out.t, -py);
    out.b = Math.max(out.b, py - s.h);
  };
  for (let x = 0; x <= s.w; x += 4) {
    take(x, 0);
    take(x, s.h);
  }
  for (let y = 0; y <= s.h; y += 4) {
    take(0, y);
    take(s.w, y);
  }
  return {l: Math.ceil(out.l) + margin, r: Math.ceil(out.r) + margin, t: Math.ceil(out.t) + margin, b: Math.ceil(out.b) + margin};
};
