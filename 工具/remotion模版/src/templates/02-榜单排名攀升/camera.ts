/** 透视镜头：页面先绕三个轴转，再做透视除法，最后缩放、平移。角度单位是弧度。 */
export type Camera = {rx: number; ry: number; rz: number; d: number; s: number; tx: number; ty: number};

type M = number[][];

const mul = (a: M, b: M): M => a.map((row, i) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
const translate = (x: number, y: number): M => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, 0], [0, 0, 0, 1]];
const scale = (s: number): M => [[s, 0, 0, 0], [0, s, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const persp = (d: number): M => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1 / d, 1]];
const rotX = (a: number): M => [[1, 0, 0, 0], [0, Math.cos(a), -Math.sin(a), 0], [0, Math.sin(a), Math.cos(a), 0], [0, 0, 0, 1]];
const rotY = (a: number): M => [[Math.cos(a), 0, Math.sin(a), 0], [0, 1, 0, 0], [-Math.sin(a), 0, Math.cos(a), 0], [0, 0, 0, 1]];
const rotZ = (a: number): M => [[Math.cos(a), -Math.sin(a), 0, 0], [Math.sin(a), Math.cos(a), 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

/** 页面上的 (ox, oy) 是旋转和透视的轴心。 */
export const cameraMatrix = (c: Camera, ox: number, oy: number): M =>
  mul(
    mul(mul(mul(mul(mul(translate(ox + c.tx, oy + c.ty), scale(c.s)), persp(c.d)), rotZ(c.rz)), rotX(c.rx)), rotY(c.ry)),
    translate(-ox, -oy),
  );

/** 4×4 矩阵写成 CSS 的 matrix3d()，CSS 要的是按列排的 16 个数。 */
export const toCss = (m: M): string => {
  const cols: number[] = [];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      cols.push(m[i][j]);
    }
  }
  return `matrix3d(${cols.map((v) => v.toFixed(5)).join(',')})`;
};

/** 页面上的一个点经过镜头后落在画面的哪里。 */
export const project = (m: M, x: number, y: number): [number, number] => {
  const w = m[3][0] * x + m[3][1] * y + m[3][3];
  return [(m[0][0] * x + m[0][1] * y + m[0][3]) / w, (m[1][0] * x + m[1][1] * y + m[1][3]) / w];
};

/** 页面上一条水平线（纵坐标 rowY）在画面横坐标等于 x 的地方的纵坐标。只用来反推镜头要往下移多少。 */
const lineYAt = (m: M, rowY: number, x: number): number => {
  let prev = project(m, -4000, rowY);
  for (let px = -3990; px <= 6000; px += 10) {
    const cur = project(m, px, rowY);
    if (Math.abs(cur[0] - prev[0]) < 2000 && (prev[0] - x) * (cur[0] - x) <= 0 && cur[0] !== prev[0]) {
      const k = (x - prev[0]) / (cur[0] - prev[0]);
      return prev[1] + k * (cur[1] - prev[1]);
    }
    prev = cur;
  }
  return Number.NaN;
};

/**
 * 让那条水平线在画面 x = screenX 处的高度等于 targetY，返回镜头该有的 ty。
 * 平移是在缩放、透视之后加上去的，所以画面坐标是随 ty 一比一移动的。
 */
export const tyForLineY = (c: Camera, ox: number, oy: number, rowY: number, screenX: number, targetY: number): number => {
  const m = cameraMatrix({...c, tx: 0, ty: 0}, ox, oy);
  return targetY - lineYAt(m, rowY, screenX - c.tx);
};

/**
 * 页面要绕 z 轴转多少，才能让纵坐标 rowY 的水平线在画面上斜成 angle（都是弧度）。
 * 这条线的斜率随转角单调变大，所以二分。平移是透视之后才加的，不影响斜率，这里不用管 tx、ty。
 */
export const rollForAngle = (c: Camera, ox: number, oy: number, rowY: number, angle: number): number => {
  const want = Math.tan(angle);
  const slopeAt = (rz: number): number => {
    const m = cameraMatrix({...c, tx: 0, ty: 0, rz}, ox, oy);
    const a = project(m, ox - 500, rowY);
    const b = project(m, ox + 500, rowY);
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  let lo = (-89 * Math.PI) / 180;
  let hi = (60 * Math.PI) / 180;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (slopeAt(mid) < want) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
};
