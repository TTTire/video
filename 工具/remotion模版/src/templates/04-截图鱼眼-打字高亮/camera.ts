/** 透视镜头：页面先绕三个轴转，再做透视除法，最后缩放、平移。角度单位是弧度。照 02-榜单排名攀升/camera.ts 抄来的，只留这里用得到的三样。 */
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
