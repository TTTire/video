/** 鱼眼（桶形）镜头的算法，不碰画面。src/shared/Lens.tsx 用它铺贴图；模版用它算内容里的点最后落在画面哪儿。 */

/** 位移贴图 public/lens/barrel.png：scripts/make_lens_map.py 生成的，所有模版共用这一张。 */
export const LENS_MAP = 'lens/barrel.png';

/** 位移里“半径的五次方”那部分占多少。要和生成贴图时的 --高次 一致，不然 lensProject 算出来的位置和画面对不上。 */
const HIGH = 0.4;

export type LensSpec = {
  w: number; // 画面多宽、多高
  h: number;
  strength: number; // 画面离镜头中心最远的那一角，内容往外挪多少像素。0 就是没有镜头
  center?: [number, number]; // 镜头中心在画面的哪儿，默认画面中心
};

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
