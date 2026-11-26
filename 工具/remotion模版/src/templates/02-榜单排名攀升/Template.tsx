import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Curve, Key, curve, easeInOutQuad, easeOutCubic, easeOutQuad, track} from '../../shared/curve';
import {Grain} from '../../shared/Grain';
import {Camera, cameraMatrix, project, rollForAngle, toCss, tyForLineY} from './camera';
import {Layout, layoutFor, Page} from './Page';
import {TemplateProps} from './schema';

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---- 逐帧从参考（竖屏）上量出来的曲线。帧号是参考上的（rowAt = 4），长度是竖屏画面上的像素，横屏按画面高度等比换算 ----
// 高亮卡片中线在画面 x=60 处的高度：进场时一路往下走，先快后慢，中间再冲一下，第 84 帧附近落定。
const ENTER_Y: Key[] = [
  [4, 47], [8, 326], [12, 503], [16, 588], [24, 683], [32, 765], [38, 805], [44, 920], [52, 1009], [60, 1058], [72, 1093], [84, 1100],
  [96, 1101], [120, 1089], [136, 1080], [156, 1072],
];
// 高亮卡片在画面上的倾角（度，负的是右端高）：平滑地转正，中间没有过冲。参考头 16 帧量出来有来回晃，那是运动重影造成的，没跟。
const ENTER_ANGLE: Key[] = [[4, -16], [10, -17.5], [20, -15.3], [32, -13.4], [44, -11], [60, -9.6], [84, -7.6], [108, -6.3], [128, -5.1], [156, -3.6]];
// 发白最亮的那一下之后，上面两条曲线的取值（高度是竖屏画面上的像素）
const FLASH_Y = 1102;
const FLASH_ANGLE = -2.4;
// 镜头一路在慢慢往后退：进场时的放大是落定以后的多少倍
const NEAR: Key[] = [[4, 1.24], [40, 1.15], [60, 1.044], [100, 1]];
// 高亮行自己的放大：冲进来时最大，越往上爬越小
const POP: Key[] = [[2, 1], [12, 1.4], [36, 1.32], [56, 1.22], [96, 1.18]];
// 名字那一栏钉在画面的哪个横坐标上：爬到一半时挪一下，之后不动。竖屏的数是量参考的，横屏是定的
const LABEL_X: Record<TemplateProps['orientation'], Key[]> = {竖屏: [[4, 252], [52, 190]], 横屏: [[4, 330], [52, 400]]};
// 竖屏那两张表量的是薄荷色那块的中心。卡片的光晕会把它往下带几十像素，所以目标要往上提这么多，拉远时归零
const LIFT: Key[] = [[0, 68], [32, 72], [56, 46], [96, 36], [148, 40]];

// ---- 镜头的底数 ----
const SLOT_PX = 107; // 近景时相邻两行在画面上的间距，全程都是这么多
const REST_TILT = 45 * DEG; // 落定以后页面向后仰多少
const TILT_MAX = 54 * DEG; // 进场时最倾
const RY = -4.76 * DEG; // 左右偏转：它让页面上的竖线有点斜，越靠下的行越往左偏
const PERSPECTIVE = 900; // 透视距离是放大倍数的多少倍
const LINE_X = 60; // 卡片的位置按它中线在画面这一列上的高度来对
const ZOOM_LEN = 56; // 参考里拉远用了 56 帧
// 镜头拉远的进度：前 4 帧几乎不动，然后一下拉开，后面拖着一条长尾
const ZOOM_Q: Key[] = [[0, 0], [4, 0.03], [8, 0.21], [12, 0.5], [16, 0.68], [20, 0.8], [28, 0.91], [40, 0.973], [56, 1]];
const SHUTTER = 0.5; // 快门开半帧：动态模糊拖多长按它算
const BLUR_STEP = 4; // 动态模糊里相邻两个样之间页面挪多少像素。太大了能看出一个个分开的重影
const MAX_SAMPLES = 16;

/** 表里的帧号整体挪一下（rowAt、zoomAt 这些改了的时候，表跟着走）。 */
const shiftKeys = (keys: Key[], by: number): Key[] => keys.map(([f, v]) => [f + by, v]);
/** 拉远那一段的表：按参考上 56 帧的时长等比伸缩。 */
const stretchKeys = (keys: Key[], at: number, span: number): Key[] => keys.map(([f, v]) => [at + (f * span) / ZOOM_LEN, v]);
/** 邻行有多虚，单位是成片画面上的像素。 */
const screenBlur = (t: number, rowAt: number, zoomAt: number): number =>
  track(t, [[rowAt, 8], [rowAt + 32, 6.5], [rowAt + 40, 3], [rowAt + 52, 2.5], [zoomAt + 6, 2.5], [zoomAt + 14, 0]], easeOutQuad);

/**
 * 爬升的进度曲线（0 到 1）。每一格越过的时刻照参考量的：先在起点停留，第一下用 10 帧，接着连着每 4 帧越一行，最后两行各用 12 帧。
 * 中间那几格是匀速滑过去的，不是一格一格顿上去的。
 */
const climbCurve = (rowAt: number, passes: number): Curve => {
  const keys: Key[] = [[0, 0], [rowAt + 30, 0]];
  let t = rowAt + 30;
  for (let i = 1; i <= passes; i++) {
    t += i === 1 ? 10 : i > passes - 2 ? 12 : 4;
    keys.push([t, i / passes]);
  }
  return curve(keys, {start: true, end: true});
};

type View = {
  css?: string;
  probes: [number, number][]; // 页面上几个点此刻落在画面哪儿：第一个在高亮行的行首，其余是页面上固定的点。用来算页面动得多快
  scale: number; // 此刻画面放大了多少倍
  angle: number; // 此刻高亮卡片的倾角（度，负的是右端高）
  slot: number;
  rowY: number;
  score: number;
  bar: number;
  unfold: number;
  pop: number;
  cardTop: number;
  cardBottom: number;
  shift: number;
  baseBlur: number;
  sharp: number;
  defocus: number;
  flash: number;
  fadeIn: number;
};

/** 给一组参数，返回“某一刻 t 画面该是什么样”的函数。t 可以带小数：算动态模糊时要在两帧之间再取几个样。 */
export const makeView = (props: TemplateProps): ((t: number) => View) => {
  const {rowAt, countAt, countEnd, barAt, flashAt, zoomAt, zoomEnd} = props;
  const L: Layout = layoutFor(props.orientation);
  const ox = L.w / 2; // 旋转和透视的轴心：画面中心
  const oy = L.h / 2;
  const unit = L.h / 1920; // 那几张表是竖屏画面上的像素，换成当前画幅
  const hi = Math.min(props.highlight, props.rows.length - 1);
  const from = Math.max(hi, Math.min(props.climbFrom, props.rows.length - 2)); // 高亮行从第几格出发
  const span = Math.max(1, zoomEnd - zoomAt);
  const baseZoom = SLOT_PX / (L.rowH * Math.cos(REST_TILT)); // 落定以后画面放大多少倍，行距才是 SLOT_PX
  const labelPageX = L.tableLeft + L.logo.left + L.logo.box / 2;
  const lastY = L.tableTop + (hi + 0.5) * L.rowH; // 停下来以后中线的页面坐标，也是末帧画面上的高度

  // 离画面中心越远的点动得越快，所以除了高亮行的行首，再取四个靠边靠角的页面点，取它们里头动得最快的那个
  const probePoints = (rowY: number): [number, number][] => [
    [labelPageX, rowY],
    [ox + L.w * 0.36, oy - L.h * 0.4],
    [ox - L.w * 0.36, oy + L.h * 0.4],
    [ox + L.w * 0.36, oy + L.h * 0.4],
    [ox - L.w * 0.36, oy - L.h * 0.4],
  ];

  const climb = climbCurve(rowAt, from - hi);
  const near = curve(shiftKeys(NEAR, rowAt - 4));
  const popCurve = curve(shiftKeys(POP, rowAt - 4));
  // 两头都从静止起步、停成静止：不然进场和拉远的第一帧速度是凭空跳出来的
  const yTable = curve([...shiftKeys(ENTER_Y, rowAt - 4).map(([f, y]): Key => [f, y * unit]), [flashAt + 9, FLASH_Y * unit]], {start: true});
  const aTable = curve([...shiftKeys(ENTER_ANGLE, rowAt - 4), [flashAt + 9, FLASH_ANGLE]]);
  const labelX = curve(shiftKeys(LABEL_X[props.orientation], rowAt - 4));
  const zoomQ = curve(stretchKeys(ZOOM_Q, zoomAt, span), {start: true, end: true});
  const lift = props.orientation === '竖屏' ? curve(shiftKeys(LIFT, rowAt - 4)) : () => 0;
  const cardGrow = (t: number) => track(t, [[rowAt + 12, 0], [rowAt + 46, 1]], easeInOutQuad);

  return (t) => {
    const slot = lerp(from, hi, climb(t)); // 高亮行此刻停在第几格
    const rowY = L.tableTop + (slot + 0.5) * L.rowH; // 它中线的页面坐标
    const q = zoomQ(t); // 拉远的进度
    const zoomNow = baseZoom * near(t);
    const scale = lerp(zoomNow, 1, q); // 此刻画面放大了多少倍

    // 先按行距定近景的镜头：放大多少倍，就要倾多少度，行距才是 SLOT_PX
    const tilt = Math.min(TILT_MAX, Math.acos(Math.min(0.98, SLOT_PX / (L.rowH * zoomNow))));
    const cam: Camera = {
      rx: lerp(tilt, 0, q),
      ry: lerp(RY, 0, q),
      rz: 0,
      d: Math.exp(lerp(Math.log(PERSPECTIVE * zoomNow), Math.log(1e6), q)), // 透视距离按对数插，不然一下子就没透视了
      s: scale,
      tx: 0,
      ty: 0,
    };
    let css: string | undefined; // 不设就是正对画面
    let probes: [number, number][];
    // 页面转多少度，卡片才斜成该有的角度；拉远时角度一路回到 0
    const angle = t < zoomAt ? aTable(t) : aTable(zoomAt) * Math.max(0, 1 - (t - zoomAt) / span);
    if (q >= 1) {
      probes = probePoints(rowY);
    } else {
      cam.rz = rollForAngle(cam, ox, oy, rowY, angle * DEG);
      // 名字那一栏要落在画面固定的位置上，反推页面往右挪多少；拉远时挪回原处
      const [labelScreenX] = project(cameraMatrix(cam, ox, oy), labelPageX, rowY);
      cam.tx = (labelX(t) - labelScreenX) * (1 - q);
      // 镜头跟到多高，卡片中线才落在该有的高度。发白前后卡片在表上的值会被夹住，拉远就是从那儿等比回到末帧的位置
      const y = t < zoomAt ? yTable(t) : lerp(yTable(zoomAt), lastY, q);
      cam.ty = tyForLineY(cam, ox, oy, rowY, LINE_X, y - lift(t) * (1 - q));
      const m = cameraMatrix(cam, ox, oy);
      css = toCss(m);
      probes = probePoints(rowY).map(([x, y]) => project(m, x, y));
    }

    return {
      css,
      probes,
      scale,
      angle,
      slot,
      rowY,
      score: Math.round(track(t, [[countAt, props.countFrom], [countEnd, props.rows[hi].score]], easeOutCubic)),
      bar: track(t, [[barAt, 0], [barAt + 12, 0.27], [barAt + 36, 0.38], [barAt + 68, 0.46], [barAt + 100, 0.56], [barAt + 116, 0.62], [zoomAt + span / 2, 1]]),
      unfold: track(t, [[rowAt - 2, 0.05], [rowAt + 4, 1]], easeOutQuad),
      pop: 1 + (popCurve(t) - 1) * (1 - q),
      // 爬升的中段，卡片往上多出一成多行高、往下多出两成，把紧挨着两行的字各压掉一半（参考第 16 帧时还没有，第 50 帧最厚）
      cardTop: 0.1 * cardGrow(t) * (1 - q),
      cardBottom: 0.16 * cardGrow(t) * (1 - q),
      // 停到最后一格之后，下面所有的行往下让出一格
      shift: L.rowH * track(t, [[rowAt + 84, 0], [zoomAt - 4, 1]], easeInOutQuad),
      // 页面是先模糊、再被镜头放大的，所以要除以放大倍数，才是画面上看到的那个数
      baseBlur: screenBlur(t, rowAt, zoomAt) / scale,
      sharp: track(t, [[rowAt, 0.7], [rowAt + 32, 1]]),
      defocus: track(t, [[flashAt, 0], [flashAt + 10, 3], [zoomAt + 4, 2], [zoomAt + 12, 0]]) / scale,
      // 发白到顶只占两三帧（参考第 162 到 166 帧是全白），之前是慢慢虚掉，之后在拉远里退回去
      flash: track(t, [[flashAt + 6, 0], [flashAt + 8.5, 1], [flashAt + 9.5, 1], [zoomAt - 4, 0.25], [zoomAt + 4, 0]]),
      fadeIn: track(t, [[rowAt - 2, 0], [rowAt + 4, 1]]),
    };
  };
};

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const L = layoutFor(props.orientation);
  const view = useMemo(() => makeView(props), [props]);

  const now = view(frame);
  // 动态模糊：页面在画面上动得快时，在前后半帧里多采几个样叠在一起；几乎不动的帧只采一个，时间不花在它们身上
  // 整个快门时间里页面挪了多远，就是要拖多长的影；按每 BLUR_STEP 像素一个样来算采几个
  const edge = view(frame + SHUTTER / 2).probes;
  const motion = Math.max(...view(frame - SHUTTER / 2).probes.map((p, i) => Math.hypot(edge[i][0] - p[0], edge[i][1] - p[1])));
  const samples = props.motionBlur && motion >= 3 ? Math.min(MAX_SAMPLES, Math.ceil(motion / BLUR_STEP) + 1) : 1;
  const layers = samples === 1 ? [now] : Array.from({length: samples}, (_, i) => view(frame + (i / (samples - 1) - 0.5) * SHUTTER));
  // 相邻两个样之间页面还隔着的距离换算成模糊半径：样够密时是 0，样不够时靠它把台阶揉平
  const gap = samples > 1 ? motion / (samples - 1) : 0; // 相邻两个样之间页面还隔着多少像素
  // 样够密（隔 4 像素以内）不用管；拉远最快那几帧样已经采到上限还隔得更远，就补一点模糊把台阶揉平
  const stepBlur = Math.max(0, gap - 2.5) / 1.8 / now.scale;

  const page = (v: View) => <Page L={L} data={props} score={v.score} bar={v.bar} unfold={v.unfold} pop={v.pop} slot={v.slot} shift={v.shift} cardTop={v.cardTop} cardBottom={v.cardBottom} />;
  // 清楚的范围只有卡片自己和紧贴着它的窄边，上下的邻行照旧是 soft 的
  const bandOf = (v: View) => {
    const top = v.rowY - L.rowH / 2;
    return `linear-gradient(to bottom, transparent ${top - 70}px, #000 ${top - 20}px, #000 ${top + L.rowH + 20}px, transparent ${top + L.rowH + 70}px)`;
  };

  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 70% at 50% 32%, #fcfcfb 0%, #ededeb 45%, #c8c8c5 100%)'}}>
      <div style={{position: 'absolute', inset: 0, opacity: now.fadeIn}}>
        {layers.map((v, i) => (
          // 一个压一个地叠上去，叠完正好是这几个样的平均，也就是动态模糊
          <div key={i} style={{
            position: 'absolute',
            inset: 0,
            opacity: 1 / (i + 1),
            transform: v.css,
            transformOrigin: '0 0',
            filter: Math.max(v.defocus, stepBlur) > 0.3 ? `blur(${Math.max(v.defocus, stepBlur)}px)` : undefined,
          }}>
            <div style={{position: 'absolute', inset: 0, filter: v.baseBlur > 0.3 ? `blur(${v.baseBlur}px)` : undefined}}>{page(v)}</div>
            {v.sharp > 0 && v.baseBlur > 0.3 ? (
              <div style={{position: 'absolute', inset: 0, opacity: v.sharp, filter: 'blur(0.5px)', WebkitMaskImage: bandOf(v), maskImage: bandOf(v)}}>{page(v)}</div>
            ) : null}
          </div>
        ))}
      </div>
      {now.flash > 0 ? <AbsoluteFill style={{backgroundColor: '#ffffff', opacity: now.flash}} /> : null}
      <Grain frame={frame} opacity={0.1} />
    </AbsoluteFill>
  );
};
