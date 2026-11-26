import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {curve, Key} from '../../shared/curve';
import {Grain} from '../../shared/Grain';
import {Lens} from '../../shared/Lens';
import {LensSpec, lensPadsFor, lensProject, lensUnproject} from '../../shared/lensMath';
import {Camera, cameraMatrix, project, toCss} from './camera';
import {Block, L, Page, Scanlines} from './Page';
import {TemplateProps} from './schema';

const DEG = Math.PI / 180;
const K = L.h / 1102; // 下面那些数是参考画面（1080×1102）上的像素，换成横屏的

// ---- 画面的漂移：内容在动，镜头不动 ----
// 末态（参考第 29 帧起不变）时内容相对第 0 帧的变换，单位是参考像素、照参考自己的几何量的：
// 绕横轴转 21.3°、绕竖轴转 26.2°（右边远、左边近）、再转 −7.4°，透视距离 2659，缩到 0.907，往右上平移 (+206, −54)。
// 量法：镜头固定成第 0 帧量出的那一组，拿末帧四条边界（顶部带下沿、气泡上沿、下沿、右沿）的九个读数去解这七个数，
// 解出来带下沿、气泡上沿、下沿各读数都落在实测值 3–10 像素内，右沿差 20–50 像素（这套模型对不上的地方，详见 README）。
const END = {rx: 21.3, ry: 26.2, rz: -7.4, d: 2659, s: 0.907, tx: 205.9, ty: -54.3};
// 快慢照参考：在参考第 0 帧的字上钉 20 个小图块逐帧跟踪位移，逐帧解出内容变换，再把平移和转角的进度合成一条曲线。
// 平移和转角共用这一条：各用一条的话两边进度差两三帧，叠在角上的点上速度会忽大忽小。
// 第 4 帧起看得出来，第 14–16 帧最快（正文一帧挪 20 多个参考像素），第 29 帧停住。
const Q: Key[] = [[0, 0], [2, 0], [4, 0], [6, 0.03], [8, 0.12], [10, 0.24], [12, 0.37], [14, 0.52], [16, 0.69], [18, 0.81], [20, 0.89], [22, 0.95], [24, 0.978], [26, 0.995], [29, 1]];
const DRIFT_REF_FROM = 4; // 参考里漂移从第几帧起（到第 29 帧）
const DRIFT_REF_LEN = 25;

const SHUTTER = 0.5; // 快门开半帧：动态模糊拖多长按它算
const BLUR_STEP = 4; // 动态模糊里相邻两个样之间内容挪多少像素
const BLUR_GAP = 2; // 相邻两个样隔这么远以内不用再补模糊
const MAX_SAMPLES = 6; // 样再多出片太慢（每个样都要把头像、号码、气泡、正文重画一遍）
const FADE_OUT = 8; // 高亮消失用几帧从左往右刷走

/** 某一刻的内容变换（镜头前面的那个） */
export type CameraAt = (t: number) => Camera;

type View = {
  css: string;
  typed: number; // 正文已经打出多少个字
  blocks: Record<number, Block>; // 哪些字身上盖着高亮块，盖到哪
  probes: [number, number][]; // 页面上几个点此刻落在画面哪儿：第一个在正文上，其余是页面上固定的点
  scale: number;
  stepBlur: number; // 动态模糊的样不够密时，每个样补多少模糊
  band: string; // 顶部深灰带这一刻在画面上的形状（SVG 路径）
  bandEdge: string; // 它下沿的那条线（点列），用来把边糊一下
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 给一组参数，返回“某一刻 t 画面该是什么样”的函数。t 可以带小数：算动态模糊时要在两帧之间再取几个样。 */
export const makeView = (props: TemplateProps): ((t: number) => View) & {camera: CameraAt} => {
  const spec: LensSpec = {w: L.w, h: L.h, strength: props.strength, center: [props.lensX, props.lensY]};
  const toLens = lensProject(spec);
  const amount = props.drift;
  const stretch = Math.max(props.driftEnd - props.driftFrom, 0.01) / DRIFT_REF_LEN; // 参考的 25 帧伸缩成现在的长短
  const q = curve(
    Q.map(([f, v]): Key => [props.driftFrom + (f - DRIFT_REF_FROM) * stretch, v]),
    {start: true, end: true}, // 两头都从静止起步、停成静止
  );

  // 正文里不算换行的第几个字；换行的位置不占号。打字和高亮都按这个号数
  const chars = Array.from(props.body);
  const flatPos: number[] = chars.map((c): number => (c === '\n' ? -1 : 0));
  let nf = 0;
  for (let i = 0; i < chars.length; i++) {
    if (flatPos[i] === 0) flatPos[i] = nf++;
  }
  // 每块高亮盖住哪几个字：子串在“去掉换行的正文”里的第一处
  const flatJoin = chars.filter((_, i) => flatPos[i] >= 0).join('');
  const ranges = props.highlights.map((h) => {
    const k = h.text ? flatJoin.indexOf(h.text) : -1;
    return k < 0 ? [] : Array.from({length: Array.from(h.text).length}, (_, j) => k + j);
  });

  // 正文里偏左的一个点跟主角（默认内容里“浙大”就在它附近），其余是页面上固定的点，用来算内容动得多快
  const bodyX = L.bubble.left + 60;
  const bodyY = L.bubble.top + L.body.inset;
  const probePoints: [number, number][] = [
    [bodyX + 3.3 * L.body.size, bodyY + 2.45 * L.body.line],
    [L.w / 2, L.bandBottom],
    [L.bubble.left + L.bubble.width, L.bubble.top + 10], // 气泡右上角
    [L.bubble.left + 16, L.bubble.top + L.bubble.height - 16], // 气泡左下角
    [L.bubble.left + 16, L.sender.centerY], // 气泡左边那一列、号码的高度
  ];

  const camera = (t: number): Camera => {
    const p = q(t);
    return {
      rx: END.rx * DEG * amount * p,
      ry: END.ry * DEG * amount * p,
      rz: END.rz * DEG * amount * p,
      d: END.d * K,
      s: 1 + (END.s - 1) * amount * p * p, // 缩小比转角来得晚
      tx: END.tx * K * amount * p,
      ty: END.ty * K * amount * p,
    };
  };
  const view = (t: number): View => {
    const typing = props.charsPerFrame > 0 && t >= props.typeAt;
    const typed = typing ? Math.min(nf, Math.floor((t - props.typeAt) * props.charsPerFrame) + 1) : 0;
    const blocks: Record<number, Block> = {};
    props.highlights.forEach((h, i) => {
      const range = ranges[i];
      if (!range.length) return;
      const n = range.length;
      const appear = ((t - h.at) / Math.max(h.wipe, 0.01)) * n; // 已经刷过几个字，可以是小数
      const leave = h.end === null ? -1 : ((t - h.end) / FADE_OUT) * n; // 消失时已经刷走几个字
      if (appear <= 0 || leave >= n) return;
      const color = h.color ?? props.highlightColor;
      range.forEach((flat, k) => {
        const c = clamp01(appear - k);
        let a = 0;
        let b = c;
        if (leave > 0) {
          // 从左往右刷走：这个字身上还剩靠右的多少
          b = c;
          a = c - clamp01(k + 1 - leave);
        }
        if (b - a > 0.002) blocks[flat] = {a, b, color};
      });
    });
    const cam = camera(t);
    const m = cameraMatrix(cam, props.lensX, props.lensY);
    const probes = probePoints.map(([x, y]) => {
      const [px, py] = project(m, x, y);
      return toLens(px, py);
    });
    const [band, bandEdge] = bandShape(m, spec, L.bandBottom);
    return {css: toCss(m), typed, blocks, probes, scale: cam.s, stepBlur: 0, band, bandEdge};
  };
  view.camera = camera;
  return view;
};

/** 一个点落在画面上时，它在内容（还没被镜头弯、还没做漂移变换的页面坐标）里的位置：先反解镜头，再反解内容变换。 */
export const whereOnPage = (m: number[][], x: number, y: number, toFlat: (x: number, y: number) => [number, number]): [number, number] => {
  const [fx, fy] = toFlat(x, y); // 过了内容变换、还没过镜头时的位置
  // 内容变换对平面上的点来说是一个 3×3 的单应（取 4×4 矩阵里 x、y 那几项）。用伴随矩阵求逆：
  //   H = [[a, b, c], [d, e, f], [g, h, i]]，(fx, fy, 1)·H⁻¹ = (x·w′, y·w′, w′)，行列式上下约掉了
  const [a, b, c] = [m[0][0], m[0][1], m[0][3]];
  const [d, e, f] = [m[1][0], m[1][1], m[1][3]];
  const [g, h, i] = [m[3][0], m[3][1], m[3][3]];
  const w = (d * h - e * g) * fx + (b * g - a * h) * fy + (a * e - b * d);
  const px = ((e * i - f * h) * fx + (c * h - b * i) * fy + (b * f - c * e)) / w;
  const py = ((f * g - d * i) * fx + (a * i - c * g) * fy + (c * d - a * f)) / w;
  return [px, py];
};

/**
 * 置换区域四边往画面外留多少：算法是共用的 lensMath.ts 的 lensPadsFor（把画面四条边上的点按镜头换回内容里的位置，
 * 最远到哪儿就留到哪儿，再加余量），这里多留 120 像素。这里只按镜头算、不管内容的漂移：内容缩小以后画面四角要采到内容里很远的地方，
 * 但那么远只有顶部那条纯色的带子，它不过置换（下面用 bandShape 把它直接画出来），所以置换区域用不着跟着变大；
 * 画面里的头像、号码、气泡、正文任何时候都落在这个区域里。相比四边都留 strength，置换面积小三成多，出片快一截。
 */
const lensPads = lensPadsFor;

/**
 * 顶部深灰带这一刻在画面上的形状。它的下沿在内容里是一条水平线（y = bandBottom），经过这一帧的内容变换和镜头以后是一条曲线。
 * 画面上每隔 4 列反解一次：这一列的哪一行显示的是这条线上的点（先按镜头把画面上的点换回内容，再反解内容变换）。
 * 只在画面上下各放宽一点的范围内找：出了这个范围，带透视的内容变换反解出来会翻过无穷远点，行号不再单调，没法二分。
 * 结果是 [填充路径, 下沿的点列]。
 */
export const bandShape = (m: number[][], spec: LensSpec, bandBottom: number): [string, string] => {
  const pageY = (x: number, y: number) => whereOnPage(m, x, y, lensUnproject(spec))[1];
  const TOP = -300;
  const BOTTOM = 1150;
  const pts: string[] = [];
  for (let x = 1936; x >= -16; x -= 4) {
    let lo = TOP;
    let hi = BOTTOM;
    if (pageY(x, hi) <= bandBottom) {
      pts.push(`${x},${BOTTOM}`); // 到下边界都还是带子
      continue;
    }
    if (pageY(x, lo) >= bandBottom) {
      pts.push(`${x},${TOP}`); // 上边界以上才是带子，画面里看不到
      continue;
    }
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (pageY(x, mid) < bandBottom) lo = mid;
      else hi = mid;
    }
    pts.push(`${x},${((lo + hi) / 2).toFixed(1)}`);
  }
  return [`M-16,${TOP} L1936,${TOP} ${pts.map((p) => `L${p}`).join(' ')} Z`, pts.join(' ')];
};

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const view = useMemo(() => makeView(props), [props]);
  const now = view(frame);

  // 动态模糊：内容在画面上动得快时，在前后半帧里多采几个样叠在一起；几乎不动的帧只采一个。
  // 整个快门时间里内容挪了多远，就是要拖多长的影；几个点里走得最远的那个说了算，按每 BLUR_STEP 像素一个样来算采几个
  const edge = view(frame + SHUTTER / 2).probes;
  const back = view(frame - SHUTTER / 2).probes;
  const motion = Math.max(...edge.map((pt, i) => Math.hypot(pt[0] - back[i][0], pt[1] - back[i][1])));
  const samples = props.motionBlur && motion >= 3 ? Math.min(MAX_SAMPLES, Math.ceil(motion / BLUR_STEP) + 1) : 1;
  const layers = samples === 1 ? [now] : Array.from({length: samples}, (_, i) => view(frame + (i / (samples - 1) - 0.5) * SHUTTER));
  // 样不够密（相邻两个样隔得比 BLUR_GAP 像素还远）就给每个样补一点模糊，把台阶揉平
  const gap = samples > 1 ? motion / (samples - 1) : 0;
  const stepBlur = Math.max(0, gap - BLUR_GAP) / 1.8;
  for (const v of layers) {
    v.stepBlur = stepBlur;
  }

  const spec: LensSpec = {w: L.w, h: L.h, strength: props.strength, center: [props.lensX, props.lensY]};
  const pads = useMemo(() => lensPads(spec, 120), [spec.w, spec.h, spec.strength, spec.center?.[0], spec.center?.[1]]);
  return (
    <AbsoluteFill style={{backgroundColor: '#000000'}}>
      {/* 顶部深灰带不过置换：每个样一条路径直接填（和置换用的是同一套反解）。样叠样的方式和下面一样，就是动态模糊 */}
      <svg style={{position: 'absolute', left: 0, top: 0, width: L.w, height: L.h, overflow: 'visible'}}>
        {layers.map((v, i) => (
          <g key={i} opacity={1 / (i + 1)} style={v.stepBlur > 0.3 ? {filter: `blur(${v.stepBlur.toFixed(2)}px)`} : undefined}>
            <path d={v.band} fill={props.bandColor} />
            <polyline points={v.bandEdge} fill="none" stroke={props.bandColor} strokeWidth={7} strokeOpacity={0.45} /> {/* 边糊一下，像拍下来的 */}
          </g>
        ))}
      </svg>
      <Lens spec={{...spec, pads}}>
        {/* 每一层就是画面本身的大小、左上角在 (0, 0)，内容溢出到画面外：矩阵是按画面坐标写的，轴心才会落在镜头中心上 */}
        {layers.map((v, i) => (
          // 一个压一个地叠上去，叠完正好是这几个样的平均，也就是动态模糊
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: L.w,
              height: L.h,
              opacity: 1 / (i + 1),
              transform: v.css,
              transformOrigin: '0 0',
              filter: v.stepBlur > 0.3 ? `blur(${v.stepBlur.toFixed(2)}px)` : undefined,
            }}
          >
            <Page P={props} typed={v.typed} blocks={v.blocks} scan={false} />
          </div>
        ))}
        {/* 扫描纹每个样都一样只差一两像素，所以不跟着叠样：只画一遍，跟着正中间那个样走 */}
        <div style={{position: 'absolute', left: 0, top: 0, width: L.w, height: L.h, transform: now.css, transformOrigin: '0 0'}}>
          <Scanlines P={props} />
        </div>
      </Lens>
      {/* 暗角：在镜头外面，压的是拍完的画面 */}
      {props.vignette > 0 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse farthest-corner at ${props.lensX}px ${props.lensY}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.26) 64%, rgba(0,0,0,0.62) 88%, rgba(0,0,0,0.95) 100%)`,
            opacity: Math.min(props.vignette, 1),
          }}
        />
      ) : null}
      {props.vignette > 1 ? <AbsoluteFill style={{backgroundColor: `rgba(0,0,0,${Math.min(props.vignette - 1, 1)})`}} /> : null}
      <Grain frame={frame} opacity={props.grain} />
    </AbsoluteFill>
  );
};
