import {Easing, interpolate} from 'remotion';

/** 关键帧：[帧, 值]。 */
export type Key = [number, number];
/** 时间 t（可以带小数）到值的函数。 */
export type Curve = (t: number) => number;

const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const easeOutQuad = Easing.out(Easing.quad);
export const easeOutCubic = Easing.out(Easing.cubic);
export const easeInOutQuad = Easing.inOut(Easing.quad);

/** 关键帧表按帧号从小到大排好，帧号重了就往后挪一点，不然插值会出 NaN。 */
export const tidyKeys = (keys: Key[]): Key[] => {
  if (keys.length === 0) {
    throw new Error('关键帧表是空的：至少要给一个 [帧, 值]'); // 不拦的话算出来是 NaN，画面上什么都看不见，难查
  }
  const out: Key[] = [];
  for (const [f, v] of [...keys].sort((a, b) => a[0] - b[0])) {
    out.push([out.length ? Math.max(f, out[out.length - 1][0] + 0.01) : f, v]);
  }
  return out;
};

/**
 * 过一组关键帧 [帧, 值] 的平滑曲线。三阶 Hermite，接点两侧的斜率取成一样，所以速度是连续的，不会有顿一下的感觉；
 * 每一段的升降方向和数据一致，不会过冲。表外的帧夹在两头。照着 Fritsch 和 Carlson 的单调三次插值写的。
 * start / end 为真时，曲线从静止起步、停成静止。
 */
export const spline = (keys: Key[], soft: {start?: boolean; end?: boolean} = {}): Curve => {
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const n = xs.length;
  if (n === 1) {
    return () => ys[0];
  }
  const h: number[] = []; // 每一段多长
  const d: number[] = []; // 每一段的斜率
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m: number[] = []; // 每个接点的斜率：两侧一升一降就取 0，不然取调和平均
  for (let i = 0; i < n; i++) {
    if (i === 0) {
      m.push(soft.start ? 0 : d[0]);
    } else if (i === n - 1) {
      m.push(soft.end ? 0 : d[n - 2]);
    } else if (d[i - 1] * d[i] <= 0) {
      m.push(0);
    } else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]));
    }
  }
  return (t) => {
    if (t <= xs[0]) {
      return ys[0];
    }
    let i = 0;
    while (i < n - 2 && t > xs[i + 1]) {
      i++;
    }
    if (t >= xs[n - 1]) {
      return ys[n - 1];
    }
    const u = (t - xs[i]) / h[i];
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h[i] * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h[i] * m[i + 1];
  };
};

/** 关键帧表整理好以后直接做成曲线。 */
export const curve = (keys: Key[], soft?: {start?: boolean; end?: boolean}): Curve => spline(tidyKeys(keys), soft);

/**
 * 按关键帧表取某一刻的值。给了缓动、或者只有两个关键帧时，段内按直线（或那个缓动）走；
 * 三个以上就用上面的平滑曲线。要动作顺，就别把很多段直线拼起来用。
 */
export const track = (t: number, keys: Key[], easing?: (u: number) => number): number => {
  const sorted = tidyKeys(keys);
  if (easing || sorted.length === 2) {
    return interpolate(t, sorted.map((k) => k[0]), sorted.map((k) => k[1]), easing ? {...CLAMP, easing} : CLAMP);
  }
  return spline(sorted)(t);
};
