/** 每张卡片各摆各的：给它一个“放在哪儿、放大多少、转多少”的 pose，出一个矩阵。坐标是还没过镜头的画面坐标，单位像素；角度是度。
 *  02 的 camera.ts 是整套页面共用一个镜头，这里是一个画面里七八样东西各有各的姿势，所以写成“给一个 pose，出一个矩阵”。 */
export type Pose = {
  x: number; // 卡片中心落在画面哪儿
  y: number;
  s: number; // 放大多少：大于 1 是离镜头近
  rx: number; // 绕横轴（上下低头、抬头）
  ry: number; // 绕竖轴（左右翻页）
  rz: number; // 绕自己转
  blur: number; // 糊多少像素（按摆成 s = 1 时算，近大远小，所以乘回 s 才是画面上看到的）
};

type M = number[][];
const DEG = Math.PI / 180;

const mul = (a: M, b: M): M => a.map((row, i) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));
const move = (x: number, y: number, z = 0): M => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];
const grow = (s: number): M => [[s, 0, 0, 0], [0, s, 0, 0], [0, 0, s, 0], [0, 0, 0, 1]];
const persp = (d: number): M => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, -1 / d, 1]];
const rotX = (a: number): M => [[1, 0, 0, 0], [0, Math.cos(a), -Math.sin(a), 0], [0, Math.sin(a), Math.cos(a), 0], [0, 0, 0, 1]];
const rotY = (a: number): M => [[Math.cos(a), 0, Math.sin(a), 0], [0, 1, 0, 0], [-Math.sin(a), 0, Math.cos(a), 0], [0, 0, 0, 1]];
const rotZ = (a: number): M => [[Math.cos(a), -Math.sin(a), 0, 0], [Math.sin(a), Math.cos(a), 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

/** 透视距离（像素）。越小，转了一点的卡片近大远小越明显。 */
export const DEPTH = 1500;

/**
 * 一张宽 w、高 h 的东西摆成 pose 以后，它自己的像素坐标（左上角是 0, 0）到画面坐标的矩阵。
 * 顺序：先把它挪到以中心为原点、放大、绕三个轴转，再做透视除法，最后把中心平移到 (x, y)。
 * 平移放在透视之后，所以转过的卡片，它的中心还是落在 (x, y) 上，近的那一边往外凸。
 */
export const poseMatrix = (p: Pose, w: number, h: number): M =>
  mul(
    mul(mul(mul(mul(mul(move(p.x, p.y), persp(DEPTH)), rotZ(p.rz * DEG)), rotY(p.ry * DEG)), rotX(p.rx * DEG)), grow(p.s)),
    move(-w / 2, -h / 2)
  );

/** 4×4 矩阵写成 CSS 的 matrix3d()，CSS 要的是按列排的 16 个数。配上 transform-origin: 0 0 用。 */
export const toCss = (m: M): string => {
  const cols: number[] = [];
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      cols.push(m[i][j]);
    }
  }
  return `matrix3d(${cols.map((v) => v.toFixed(5)).join(',')})`;
};

/** 卡片自己的一个点 (x, y) 经过这个矩阵以后落在画面的哪儿。 */
export const project = (m: M, x: number, y: number): [number, number] => {
  const w = m[3][0] * x + m[3][1] * y + m[3][3];
  return [(m[0][0] * x + m[0][1] * y + m[0][3]) / w, (m[1][0] * x + m[1][1] * y + m[1][3]) / w];
};
