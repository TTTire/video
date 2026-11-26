import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {curve, Curve, easeOutQuad, Key, track} from '../../shared/curve';
import {Grain} from '../../shared/Grain';
import {CUP_LOGO, cupPoint, Layout, layoutFor} from './layout';
import {BeatLayer, CupShape, EndingText, Motif, OpeningLayer, Paper, Petals, RibbonBeat} from './Page';
import {TemplateProps} from './schema';
import {toScreen} from './view';
import type {BeatView, Cam, Pt, View} from './view';

// ---- 下面几张表都是逐帧从参考上量的：横轴是“从这一拍出场算起第几帧”，纵轴是离开落定位置的像素数（参考 720×1280 上的像素，别的画幅乘 k）----

// 升入：卡片上沿离落定位置还有多远。店面卡片第 105–125 帧（量卡片外框的上沿）：614, 401, 295, 228, … 0。
// 来得很快、尾巴很长：晨练那一拍落定前 15 帧起量到的数和这条曲线差不到 15 像素。
const ENTER: Key[] = [[-3, 2700], [-2, 1600], [-1, 980], [0, 614], [1, 401], [2, 295], [3, 228], [4, 181], [5, 146], [6, 118], [7, 94], [8, 76], [9, 60], [10, 47], [11, 36], [12, 28], [13, 20], [14, 14], [15, 10], [16, 6], [17, 3], [18, 2], [19, 1], [20, 0]];
// 往上飞走：圆环那一拍的 More than（第 88–99 帧）和店面卡片的下沿（第 158–176 帧：1074 → 1068 → 1058 → 1044 → 1020 → 989 → 942 → 868 → 808 → 710 → …）量出来是同一条，越飞越快。
const EXIT: Key[] = [[-1, 0], [0, 0], [1, 3], [2, 6], [3, 9], [4, 15], [5, 22], [6, 30], [7, 39], [8, 52], [9, 67], [10, 85], [11, 105], [12, 132], [13, 163], [14, 206], [15, 266], [16, 364], [17, 560], [18, 884], [19, 1300], [20, 1900], [21, 2600]];

// 开场纸杯：杯盖中心在参考坐标里的位置，第 10–48 帧（第 10、11 两帧是顺着第 12–14 帧的速度倒推的），之后不动。
const CUP_X: Key[] = [[9, 158], [10, 178], [11, 198], [12, 218], [13, 238], [14, 258.5], [15, 269], [16, 280], [17, 290], [18, 300], [19, 308], [20, 316], [21, 321], [22, 325.5], [23, 329], [24, 333], [25, 334.5], [26, 336], [27, 339], [28, 342], [29, 342.5], [30, 343.5], [31, 344.5], [32, 345.5], [33, 345.5], [34, 346], [35, 346.5], [36, 347.5], [37, 348], [38, 349], [39, 348.5], [40, 348], [41, 347.5], [42, 347], [43, 347.5], [44, 348.5], [45, 348], [46, 348], [47, 347.5], [48, 348]];
const CUP_Y: Key[] = [[9, 782], [10, 762], [11, 742], [12, 722], [13, 701.5], [14, 681.5], [15, 663.5], [16, 645.5], [17, 635], [18, 624.5], [19, 615], [20, 606], [21, 596], [22, 586.5], [23, 579], [24, 572], [25, 566.5], [26, 561], [27, 555.5], [28, 550.5], [29, 545], [30, 540], [31, 536.5], [32, 533], [33, 527.5], [34, 522.5], [35, 521], [36, 520], [37, 518], [38, 516.5], [39, 514.5], [40, 513], [41, 510.5], [42, 508], [43, 506.5], [44, 505], [45, 504], [46, 503], [47, 502.5], [48, 502]];
const CUP_REST: Pt = [348, 502];
const CUP_S: Key[] = [[9, 0.5], [10, 0.58], [11, 0.62], [12, 0.68], [13, 0.86], [14, 1]];

// 开场四行字离落定位置还差多少（参考像素，正的是还没走到）。两行标题从右边来（第 10 帧的 This 左沿在 574，落定 374），
// 大字第 18 帧还在画外右沿，第 19 帧 341，落定 254；两行小标语从左边来（built 第 31 帧在 130，第 60 帧 182；lifestyle 第 37 帧 200，第 60 帧 244）。
const TITLE_DX: Key[] = [[0, 200], [1, 175], [2, 153], [3, 139], [4, 128], [5, 119], [6, 111], [7, 104], [8, 97], [12, 78], [18, 56], [28, 28], [32, 20], [36, 15], [40, 10], [46, 4], [50, 1], [54, 0]];
const BIG_DX: Key[] = [[-1, 700], [0, 358], [1, 87], [2, 71], [3, 62], [4, 54], [5, 48], [6, 41], [7, 38], [8, 35], [9, 31], [10, 28], [14, 18], [18, 12], [22, 8], [26, 5], [30, 2], [35, 0]];
const TAG_DX: Key[] = [[-1, -54], [0, -52], [1, -44], [2, -38], [3, -33], [4, -30], [5, -27], [6, -25], [7, -23], [8, -22], [9, -20], [10, -19], [11, -17], [12, -16], [13, -15], [14, -14], [15, -13], [16, -12], [17, -11], [18, -10], [19, -9], [20, -8], [25, -3], [29, 0], [33, 5]];
const TAGBIG_DX: Key[] = [[-1, -46], [0, -45], [1, -44], [2, -44], [3, -42], [4, -38], [5, -34], [6, -31], [7, -28], [8, -25], [9, -22], [10, -20], [11, -19], [12, -16], [13, -15], [14, -13], [15, -12], [16, -10], [17, -9], [18, -8], [19, -6], [20, -5], [21, -4], [22, -3], [23, -2], [24, 0], [28, 4]];

// 开场丝带：带尖的 x（参考第 28 帧 60、30 帧 120、34 帧 280、40 帧 483、44 帧 637、48 帧出画）；
// 左沿处中线的高度（第 30 帧 386、34 帧 406、40 帧 428、48 帧 449、56 帧 460、60 帧 463）和左边那段的斜率（1.30 → 1.27 → 1.14 → 1.10）。
const RIB_TIP: Key[] = [[-1, -30], [0, -8], [3, 120], [7, 280], [13, 500], [17, 650], [19, 712], [24, 800], [30, 880]];
const RIB_A0: Key[] = [[0, 372], [3, 386], [7, 406], [13, 428], [21, 449], [29, 460], [33, 463], [40, 461]];
const RIB_A1: Key[] = [[0, 1.3], [9, 1.27], [21, 1.14], [33, 1.1]];
const RIB_REST: [number, number] = [463, 1.1];

// 中间几拍卡片后面的丝带，从一头扫到另一头扫了多少：店面那一拍第 112 帧 5%、120 帧 26%、140 帧 85%；咖啡馆那一拍第 216 帧 12%、260 帧 95%。
const RIB_SWEEP: Key[] = [[1, 0], [9, 0.08], [24, 0.4], [36, 0.86], [52, 1]];

// 收尾推镜。参考：第 296–303 帧小杯那一套往左挪了约 55 像素、越漂越淡，第 303→304 帧硬切成大特写
// （圆标直径从约 90 变成 248，也就是 2.8 倍，中心从 (357, 615) 落到 (27, 602)），切完之后 20 帧里再往左滑一点。
// 没有照搬成一帧硬切，也没有做成一口气的大推（2.8 倍要在两三帧里推完，画面四角一帧就得走过三分之一个画面高），用的是同构的两段：
//   推近前那套边推近（1 → 1.3 倍）边往左挪边淡出；大特写从“再大 10%、靠右 75 像素”的地方收回来、淡入。接缝藏在淡出淡入里。
// 两段都走 smootherstep（x³(6x²−15x+10)）：两头不但速度归零，加速度也归零。横轴是从 zoomAt 数的帧（参考 zoomAt 是第 297 帧）：
// 第 zoomAt+7 帧（参考第 304 帧）大特写基本到位，第 zoomAt+15 帧（参考第 312 帧）完全落定。
const PUSH_KEYS: Key[] = [[0, 0], [7, 1]]; // 推近前：轻轻推近
const SETTLE_KEYS: Key[] = [[6, 0], [15, 1]]; // 大特写：回到落定的位置
const NEAR_FADE: Key[] = [[4.5, 1], [5.5, 0.72], [6.5, 0.22], [7.2, 0]]; // 推近前那一套淡出（参考第 302、303 帧越来越淡）
const FAR_FADE: Key[] = [[6, 0], [6.5, 0.45], [7, 0.85], [7.6, 1]]; // 大特写淡入
const smootherstep = (x: number): number => x * x * x * (x * (6 * x - 15) + 10);
/** 镜头：让世界坐标里的 anchor 这一点落在画面上的 aim，整个放大 scale 倍（给出的是不动点）。 */
const camAbout = (anchor: Pt, aim: Pt, scale: number): Cam =>
  scale === 1 ? {scale: 1, x: aim[0], y: aim[1]} : {scale, x: (aim[0] - scale * anchor[0]) / (1 - scale), y: (aim[1] - scale * anchor[1]) / (1 - scale)};

const SHUTTER = 0.5; // 快门开半帧：动态模糊拖多长按它算
const BLUR_STEP = 4; // 动态模糊里相邻两个样之间主角挪多少像素。太大了能看出一个个分开的重影
const MAX_SAMPLES = 16;
const EXIT_LEAD = 16.5; // 下一拍升入之前的多少帧，这一拍开始往上飞（参考：89 → 105，162 → 174）
const FLASH_EARLY = 2; // 闪白进来：白光快到最亮的时候，新卡片就在白底下开始往外透（参考第 206 帧最亮，205 帧已经透出来两成多）
const ZERO = {dx: 0, dy: 0, opacity: 0, blur: 0};
const worldCss = (w: Cam): string => `translate(${w.x}px, ${w.y}px) scale(${w.scale}) translate(${-w.x}px, ${-w.y}px)`;

/** 给一组参数，返回“某一刻 t 画面该是什么样”的函数。t 可以带小数：算动态模糊时要在两帧之间再取几个样。 */
export const makeView = (props: TemplateProps): ((t: number) => View) => {
  const L: Layout = layoutFor(props.orientation);
  const k = L.k;
  const O = props.opening;
  const E = props.ending;
  const beats = props.beats;
  const enter = curve(ENTER, {end: true});
  const exit = curve(EXIT, {start: true});
  const cupX = curve(CUP_X);
  const cupY = curve(CUP_Y);
  const cupS = curve(CUP_S, {end: true});
  const titleDx = curve(TITLE_DX, {end: true});
  const bigDx = curve(BIG_DX);
  const tagDx = curve(TAG_DX);
  const tagBigDx = curve(TAGBIG_DX);
  const ribTip = curve(RIB_TIP);
  const ribA0 = curve(RIB_A0);
  const ribA1 = curve(RIB_A1);
  const sweep = curve(RIB_SWEEP);
  // 乘 k：表里的像素数换到这个画幅
  const px = (keys: Key[]): Key[] => keys.map(([f, v]) => [f, v * k]);
  // 表是空的就当 0（track 拿空表会算出 NaN）
  const val = (t: number, keys: Key[], easing?: (u: number) => number): number => (keys.length < 2 ? 0 : track(t, keys, easing));

  // 推近前圆标中心在哪儿（杯身是歪的，先转一下）
  const tilted = cupPoint(L.cup.tilt, CUP_LOGO);
  const logo0: Pt = [L.ending.cup.x + tilted[0] * L.ending.cup.lidW, L.ending.cup.y + tilted[1] * L.ending.cup.lidW];
  const corner = cupPoint(L.cup.tilt, [0.42, -0.24]); // 杯盖右上角，给量运动当主角

  return (t) => {
    const first = beats[0].at;
    const groups: View['groups'] = [];
    const heroPt = (x: number, y: number, lidW: number, scale: number): Pt => [x + corner[0] * lidW * scale, y + corner[1] * lidW * scale]; // 杯盖右上角

    // ---- 开场 ----
    let opening: View['opening'] = null;
    let focus = L.opening.focus;
    let petals: View['petals'] = [];
    if (t < first) {
      const lidW = L.opening.cup.lidW;
      const age = t - O.cupAt;
      const scale = cupS(age + 10);
      const cup = {x: L.opening.cup.x + (cupX(age + 10) - CUP_REST[0]) * k, y: L.opening.cup.y + (cupY(age + 10) - CUP_REST[1]) * k, scale, opacity: track(t, [[O.cupAt - 1, 0], [O.cupAt, 0.7], [O.cupAt + 2, 1]], easeOutQuad)};
      // 一行字：带着模糊滑进来，前 9 帧虚的越来越少
      const line = (dx: Curve, by: number, o: Key[]) => ({
        dx: dx(t - by) * k,
        dy: 0,
        opacity: track(t, o, easeOutQuad),
        blur: Math.max(0, track(t, px([[by, 10], [by + 2, 5], [by + 5, 2], [by + 9, 0]]))),
      });
      const ribbon = t >= O.ribbonAt ? {tip: ribTip(t - O.ribbonAt) / 720, a0: (ribA0(t - O.ribbonAt) - RIB_REST[0]) * k, a1: ribA1(t - O.ribbonAt) / RIB_REST[1]} : null;
      opening = {
        cup,
        title: line(titleDx, O.titleAt, [[O.titleAt - 1, 0], [O.titleAt, 0.42], [O.titleAt + 4, 0.68], [O.titleAt + 9, 1]]), // 墨量一半在第 16 帧前后
        titleBig: line(bigDx, O.titleAt + 8, [[O.titleAt + 7, 0], [O.titleAt + 8, 0.45], [O.titleAt + 11, 0.8], [O.titleAt + 14, 1]]),
        tag: line(tagDx, O.tagAt, [[O.tagAt - 1, 0], [O.tagAt, 0.3], [O.tagAt + 2, 1]]),
        tagBig: line(tagBigDx, O.tagAt + 6, [[O.tagAt + 6, 0], [O.tagAt + 7, 0.35], [O.tagAt + 10, 0.7], [O.tagAt + 14, 1]]),
        cornerOpacity: track(t, [[O.cupAt + 12, 0], [O.cupAt + 18, 1]], easeOutQuad),
        ribbon,
      };
      groups.push({
        key: 'opening',
        points: [
          heroPt(cup.x, cup.y, lidW, scale),
          [L.opening.title.right - 330 * k + opening.titleBig.dx, L.opening.title.bigBase],
          [L.opening.tag.bigLeft + opening.tagBig.dx, L.opening.tag.bigBase],
          ribbon ? [Math.min(1.1, ribbon.tip) * L.w, 520 * k] : [0, 0],
        ],
      });
    }

    // ---- 中间几拍 ----
    const views: BeatView[] = [];
    beats.forEach((beat, i) => {
      const next = beats[i + 1];
      const nextAt = next ? next.at : E.at;
      if (t < beat.at - (beat.transition === '闪白' ? FLASH_EARLY : 0)) {
        return;
      }
      const rises = next?.transition === '升入';
      // 下一拍闪白进来的，白光最亮的时候（新那一拍开始透出来的同一刻）这一张就撤掉：再留的话它的短句会一直压在新短句底下，两层字叠着
      if (!rises && t >= (next && next.transition === '闪白' ? next.at - FLASH_EARLY : nextAt)) {
        return; // 切入：到点就换掉
      }
      const a = beat.at;
      const S = L.styles[beat.style];
      const v: BeatView = {index: i, style: beat.style, dy: 0, opacity: 1, scale: 1, blur: 0, cap: {...ZERO}, below: {...ZERO}, circle: 0, capWipe: 0, white: 0};
      if (beat.transition === '升入') {
        v.dy = enter(t - a) * k;
      }
      if (next?.transition === '闪白') {
        // 下一拍闪白进来：白光把这一张卡片盖没（参考第 202–206 帧卡片那一块的亮度 55、150、187、201、213，第 206 帧最亮，
        // 到那时候只留不到两成卡片透出来，从来没有全白）。是盖白而不是褪成透明：透明了会露出卡片后面的丝带和压纹。
        // 最亮之前两帧，这一张就被白底下的新卡片盖住了。
        // 这里的数比量出来的亮度折算的白少一截：外面那圈柔光是盖在整个卡片上的，两层加起来才是量到的那个亮度（2026-11-26 调过）
        v.white = track(t, [[nextAt - 5, 0], [nextAt - 4, 0.42], [nextAt - 3, 0.59], [nextAt - 1, 0.7]]);
      }
      if (beat.transition === '闪白') {
        // 闪白进来：白光快到最亮的那两帧（第 at−2、at−1 帧）新卡片就在白底下了，透出来两成多；第 at 帧回来近八成，第 at+1 帧全回。
        // （参考第 205、206 帧卡片那一块透出两成多，207 帧八成，208 帧全回来）白本身的取值同上，留了柔光那一份
        v.white = track(t, [[a - 2.4, 0.75], [a - 2, 0.54], [a - 1, 0.6], [a, 0.09], [a + 1, 0]]);
      }
      if (rises) {
        // 下一拍要升上来了：这一拍往上飞走。圆环那一组起步早七成帧（参考里 More than 那一行往上挪的像素数：第 90 帧 6、96 帧 56、100 帧 141、102 帧 224，
        // 等于大卡片那条曲线从第 87.7 帧起走；不提前的话到第 104 帧会落后一百多像素，新卡片露头时它还没飞高）
        v.dy -= exit(t - (next!.at - (beat.style === '圆环' ? EXIT_LEAD + 0.7 : EXIT_LEAD))) * k;
        if (beat.style === '圆环') {
          // 圆环那一拍不是整张飞出画面：一直实着往上飞（带着动态模糊），到新卡片进场的那一帧直接拿掉。
          // 参考第 104 帧它还在（上沿到了 74，还是实的），第 105 帧就没了。半帧以内就要拿掉的样也不画，不然它会在第 105 帧多留一帧。
          // 不拿掉的话它会照飞走的曲线一直占到第 108 帧，和正在升上来的新卡片叠在一起
          if (t >= next!.at - SHUTTER / 2 - 0.01) {
            return;
          }
        }
        if (S.card.y + S.card.h + v.dy < -80 * k) {
          return; // 已经飞出画面
        }
      } else if (!next) {
        // 最后一拍：收尾之前卡片不淡也不放大，只是最后四帧整张发虚
        // （参考卡片里面的细节：第 268 帧剩九成、270 帧七成半、271 帧起六成），到第 E.at 帧直接换成压纹纸和产品图
        v.blur = val(t, px([[E.at - 7, 0], [E.at - 4.5, 1.2], [E.at - 2.5, 4], [E.at - 0.5, 7]]));
      }
      const put = (into: 'cap' | 'below', o: Key[], d: Key[] = [], b: Key[] = []) => {
        v[into] = {dx: 0, dy: val(t, px(d)), opacity: val(t, o, easeOutQuad), blur: Math.max(0, val(t, px(b)))};
      };
      if (beat.transition === '升入') {
        // 短句跟着卡片一起升，同时从左往右带虚边擦出来（前沿很软：右边远远就有一层淡淡的影子）：店面那一拍第 109 帧露出 They、112 帧 They focused、
        // 116 帧到 on、124 帧整行；晨练那一拍第 180 帧整行已经有一层淡淡的影子
        put('cap', [[a + 3, 0.35], [a + 10, 0.9], [a + 16, 1]], [], [[a + 3, 3], [a + 16, 0]]);
        v.capWipe = track(t, [[a + 2, 0], [a + 6, 0.45], [a + 10, 0.85], [a + 16, 1.25]]);
      } else if (beat.transition === '闪白') {
        // 短句在白光快到最亮的时候就开始透出来，跟着卡片一起回到全实（参考第 205 帧隐约有、206 帧三成、207 帧八成、208 帧写满）
        put('cap', [[a - 2.4, 0], [a - 2, 0.9], [a - 1, 1]], [[a - 2.4, 18], [a - 2, 16], [a + 5, 7], [a + 10, 3], [a + 16, 0]], [[a - 2, 5], [a + 8, 0]]);
      } else {
        put('cap', [[a - 1, 0], [a, 0.5], [a + 6, 1]], [], [[a, 5], [a + 6, 0]]);
      }
      v.capWipe = beat.transition === '升入' ? v.capWipe : 1.25;
      if (beat.transition === '闪白') {
        v.cap = {...v.cap, opacity: v.cap.opacity * (1 - v.white)}; // 新短句跟着卡片一起从白底下透出来
      }
      if (!next) {
        // 最后一拍的短句先淡掉（参考第 263 帧是满的，265 帧八成、266 帧六成、267 帧一半，268 帧没了），卡片再留五帧才换
        v.cap = {...v.cap, opacity: v.cap.opacity * (1 - val(t, [[E.at - 9, 0.1], [E.at - 7, 0.35], [E.at - 6, 0.55], [E.at - 5, 1]]))};
      }
      put('below', [[a + 9, 0], [a + 18, 1]], [], [[a + 9, 5], [a + 20, 0]]);
      v.circle = track(t, [[a + 2, 0], [a + 12, 1]]);
      views.push(v);
      groups.push({
        key: `beat:${i}`,
        points: [
          [S.card.x, S.card.y + v.dy],
          [S.card.x + S.card.w, S.card.y + S.card.h + v.dy],
          [S.capBox.x + S.capBox.w / 2 + v.cap.dx, S.capBox.baseline + v.cap.dy],
        ],
      });
    });
    const front = views[views.length - 1];

    // 背景的压纹和装饰形状跟着最新的一拍走。同一个版式连着的几拍装饰不动；升入换场时新旧两组交叉淡 8 帧
    if (front) {
      focus = L.styles[beats[front.index].style].focus;
      let run = front.index;
      while (run > 0 && beats[run - 1].style === beats[run].style) {
        run--;
      }
      const prev = beats[front.index - 1];
      // 升入换场时新旧两组交叉淡化 8 帧。新的一组要跟着淡进来：一出来就是满的话，头几帧两组形状叠在一起像重影，旧的一组淡完又突然变清楚
      const mixed = prev && beats[front.index].transition === '升入';
      const out = mixed ? track(t, [[beats[front.index].at, 0], [beats[front.index].at + 8, 1]]) : 1;
      petals = [{set: beats[front.index].style, age: t - beats[run].at, opacity: out}];
      if (mixed && prev && out < 1) {
        petals.unshift({set: prev.style, age: t - beats[Math.max(0, front.index - 2)].at, opacity: 1 - out});
      }
    }

    // 卡片后面的丝带：第一张卡片从右上往左下扫，之后都从左上往右下
    let ribbon: View['ribbon'] = null;
    if (front && front.index >= 1) {
      // 丝带从“最近一次升入或闪白进来的那一拍”起扫。硬切换进来的一拍不算新的一拍：接着上一拍往下扫
      // （参考第 242 帧硬切前后丝带是连着的；按每拍从头算的话，它会在硬切那一帧消失、再从左上角重新长出来）
      let epoch = front.index;
      while (epoch > 1 && beats[epoch].transition === '切入') {
        epoch--;
      }
      const p = Math.min(1, sweep(t - beats[epoch].at));
      const after = beats[front.index + 1];
      const opacity = after?.transition === '升入' ? 1 - track(t, [[after.at - 4, 0], [after.at + 2, 1]]) : 1;
      if (p > 0 && opacity > 0) {
        ribbon = {path: epoch === 1 ? 'a' : 'b', progress: p, opacity};
      }
    }

    // 闪白：只在卡片那一块爆一团白光，纸和背景里的形状不白。卡片那一块的亮度（参考，时间轴帧号）：第 201 帧 45、202 帧 55、203 帧 150、204 帧 187、
    // 205 帧 201、206 帧 213（最亮；白底下的新卡片透出两成多）、207 帧 137、208 帧 105（新卡片全回来）
    let flash: NonNullable<View['flash']> | null = null;
    for (const b of beats) {
      if (b.transition === '闪白' && t >= b.at - 5.5 && t <= b.at + 1.5) {
        const box = L.styles[b.style].card;
        flash = {
          // 上面这一层只负责往卡片外化开的那一圈柔光，卡片自己是被 BeatLayer 里的白块盖住的
          amount: track(t, [[b.at - 5.5, 0], [b.at - 4, 0.4], [b.at - 3, 0.7], [b.at - 2, 0.8], [b.at - 1, 1], [b.at, 0.4], [b.at + 1, 0.1], [b.at + 1.5, 0]]) * 0.8,
          x: box.x,
          y: box.y,
          w: box.w,
          h: box.h,
          radius: L.styles[b.style].radius,
        };
      }
    }

    // ---- 收尾 ----
    let world: Cam = {scale: 1, x: logo0[0], y: logo0[1]}; // 推近前那一套的镜头（没放大时就是原样）
    let nearFade = 1;
    let far: View['far'] = null;
    let ending: View['ending'] = null;
    let motifPrev: View['motifPrev'] = null;
    let motifStrong = 1;
    if (t >= E.at) {
      // 第 E.at 帧（参考第 273 帧）卡片直接换成压纹纸和产品图。杯子先小一成、半透明，六帧里长到原大小、长实；长的时候是绕杯身正中长的
      // （参考：杯盖往上挪、杯底往下挪），所以杯盖中心要从略低的地方缩回来
      const age = t - E.at;
      const grown = track(age, [[0, 0.87], [1, 0.9], [3, 0.93], [6, 1]]);
      const cup = {x: L.ending.cup.x, y: L.ending.cup.y + 0.78 * L.ending.cup.lidW * (1 - grown), scale: grown, opacity: track(age, [[0, 0.5], [2, 0.75], [6, 1]], easeOutQuad)};
      let gone = 1; // 推近前那几行字跟着推近前那一套一起淡掉（参考第 300–303 帧）
      if (t > E.zoomAt) {
        const w = t - E.zoomAt;
        const push = track(w, PUSH_KEYS, smootherstep);
        // 推近前：圆标往左挪 42、往上 6，同时放大到 1.3 倍
        world = camAbout(logo0, [logo0[0] - 42 * k * push, logo0[1] - 6 * k * push], 1 + 0.3 * push);
        nearFade = track(w, NEAR_FADE);
        gone = nearFade;
        const settle = track(w, SETTLE_KEYS, smootherstep);
        const fade = track(w, FAR_FADE);
        if (fade > 0.002) {
          // 大特写：圆标落到 zoom.logo；刚切进来时再靠右 75 像素、再大 10%，然后滑回来（参考第 304–324 帧）
          const target = L.ending.zoom.logo;
          far = {cam: camAbout(logo0, [target.x + 75 * k * (1 - settle), target.y], L.ending.zoom.scale * (1 + 0.1 * (1 - settle))), fade};
        }
      }
      const near = E.near.map((ln, slot) => ({slot, dx: 0, dy: track(t, px([[ln.at, 10], [ln.at + 8, 0]])), opacity: track(t, [[ln.at - 1, 0], [ln.at + 5, 1]], easeOutQuad) * gone, blur: Math.max(0, track(t, px([[ln.at, 5], [ln.at + 6, 0]]))) + (1 - gone) * 7 * k}));
      const close = E.close.map((ln, slot) => ({slot, dx: 0, dy: track(t, px([[ln.at, 8], [ln.at + 9, 0]])), opacity: track(t, [[ln.at - 1, 0], [ln.at + 5, 1]], easeOutQuad), blur: Math.max(0, track(t, px([[ln.at, 6], [ln.at + 7, 0]])))}));
      ending = {cup, near, close};
      focus = L.ending.focus;
      // 纸上的压纹和背景形状跟着两三帧淡进来（参考第 273 帧那一圈压纹还很淡，第 276 帧才实），前一拍的那一圈同时淡掉
      motifStrong = track(t, [[E.at - 1, 0], [E.at + 3, 1]]);
      const last = L.styles[beats[beats.length - 1].style];
      motifPrev = {focus: last.focus, strong: 1 - motifStrong};
      petals = [{set: 'near', age: age, opacity: motifStrong}];
      groups.push({key: 'ending-near', points: [toScreen(world, heroPt(cup.x, cup.y, L.ending.cup.lidW, cup.scale))]});
      if (far) {
        // 大特写里的装饰形状直接按画面坐标摆（close 那一组），不跟着镜头
        petals.push({set: 'close', age: t - E.zoomAt - 7, opacity: far.fade});
        groups.push({key: 'ending-far', points: [toScreen(far.cam, heroPt(cup.x, cup.y, L.ending.cup.lidW, cup.scale))]});
      }
    }

    // ---- 量运动用的几个点：第一个跟主角（此刻在最前面的那张卡片或纸杯的角），其余是画面上固定的四个点 ----
    const cam = far && far.fade > nearFade ? far.cam : world;
    let hero: Pt = [L.w / 2, L.h / 2];
    if (ending) {
      hero = toScreen(cam, heroPt(ending.cup.x, ending.cup.y, L.ending.cup.lidW, ending.cup.scale));
    } else if (opening) {
      hero = heroPt(opening.cup.x, opening.cup.y, L.opening.cup.lidW, opening.cup.scale);
    } else if (front) {
      const S = L.styles[front.style];
      hero = [S.card.x, S.card.y + front.dy];
    }
    const fixed = ([
      [L.w * 0.08, L.h * 0.08],
      [L.w * 0.92, L.h * 0.08],
      [L.w * 0.92, L.h * 0.92],
      [L.w * 0.08, L.h * 0.92],
    ] as Pt[]).map((p) => toScreen(cam, p));

    return {probes: [hero, ...fixed], focus, world, nearFade, far, petals, opening, ribbon, beats: views, ending, flash, groups, motifStrong, motifPrev};
  };
};

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const L = layoutFor(props.orientation);
  const view = useMemo(() => makeView(props), [props]);
  const now = view(frame);

  // 动态模糊按组来（开场、每一拍、收尾各一组）：这一组在前后半帧里挪了多远，就叠几个样；几乎不动的帧只画一次
  const stack = (key: string, draw: (v: View) => React.ReactNode) => {
    const g = now.groups.find((x) => x.key === key);
    if (!g) {
      return null;
    }
    const a = view(frame - SHUTTER / 2).groups.find((x) => x.key === key)?.points;
    const b = view(frame + SHUTTER / 2).groups.find((x) => x.key === key)?.points;
    let motion = a && b ? 0 : 24; // 半帧里才出现（或正好消失）的，按正在进场算
    g.points.forEach((_, i) => {
      if (a?.[i] && b?.[i]) {
        motion = Math.max(motion, Math.hypot(b[i][0] - a[i][0], b[i][1] - a[i][1]));
      }
    });
    const samples = props.motionBlur && motion >= 3 ? Math.min(MAX_SAMPLES, Math.ceil(motion / BLUR_STEP) + 1) : 1;
    const taken = samples === 1 ? [now] : Array.from({length: samples}, (_, i) => view(frame + (i / (samples - 1) - 0.5) * SHUTTER));
    // 这一组在半帧之内才出现（或者正要消失）的时候，有的样里它还没有（已经没了）。那些样是空的，不能算进“叠几层取平均”里：
    // 算进去的话，它出现的那一帧会被摊成六成不透明，看着像先闪了一下透明的（硬切换进来的卡片、闪白回来的卡片、收尾的纸杯都中过招）
    const subs = taken.filter((v) => v.groups.some((x) => x.key === key));
    if (!subs.length) {
      return null;
    }
    // 样不够密时（推镜最快那几帧已经采到上限）相邻两个样还隔得很远，补一点模糊把台阶揉平
    const stepBlur = samples > 1 ? Math.max(0, motion / (samples - 1) - 2.5) / 1.8 : 0;
    return subs.map((v, i) => (
      // 一个压一个地叠上去，叠完正好是这几个样的平均，也就是动态模糊
      <div key={i} style={{position: 'absolute', inset: 0, opacity: 1 / (i + 1), filter: stepBlur > 0.3 ? `blur(${stepBlur.toFixed(2)}px)` : undefined}}>
        {draw(v)}
      </div>
    ));
  };
  // 纸上的压纹和背景里的形状跟着镜头动：它们不叠采样（压纹那个滤镜太贵），太快的时候直接按速度补一层模糊
  const worldMotion = Math.max(...now.probes.slice(1).map((p, i) => Math.hypot(view(frame + SHUTTER / 2).probes[i + 1][0] - view(frame - SHUTTER / 2).probes[i + 1][0], view(frame + SHUTTER / 2).probes[i + 1][1] - view(frame - SHUTTER / 2).probes[i + 1][1])));
  const worldBlur = props.motionBlur ? Math.min(30, Math.max(0, worldMotion * 0.2 - 2)) : 0;

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Paper L={L} c={props.colors} />
      {/* 世界：压纹和装饰形状跟着“推近前”的镜头走；收尾推镜时这一套淡出 */}
      <div style={{position: 'absolute', inset: 0, transform: worldCss(now.world), transformOrigin: '0 0', opacity: now.nearFade, filter: worldBlur > 0.3 ? `blur(${worldBlur.toFixed(1)}px)` : undefined}}>
        <Motif L={L} focus={now.focus} strong={now.motifStrong} />
        {now.motifPrev ? <Motif L={L} focus={now.motifPrev.focus} strong={now.motifPrev.strong} /> : null}
        {now.petals
          .filter((p) => p.set !== 'close')
          .map((p, i) => (
            <Petals key={`${p.set}-${i}`} list={L.petals[p.set]} age={p.age} color={props.colors.shape} opacity={p.opacity} />
          ))}
      </div>
      {now.far ? (
        // 收尾的大特写那一套的背景：一道大弧和右上角的装饰形状，按画面坐标摆，跟着大特写一起淡入
        <AbsoluteFill style={{opacity: now.far.fade}}>
          <Motif L={L} focus={L.ending.farFocus} />
          {now.petals
            .filter((p) => p.set === 'close')
            .map((p, i) => (
              <Petals key={`close-${i}`} list={L.petals.close} age={Math.max(0, p.age)} color={props.colors.shape} opacity={1} />
            ))}
        </AbsoluteFill>
      ) : null}
      {/* 产品图那一圈压凸的亮斑 */}
      {now.opening ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(circle ${L.opening.halo.r}px at ${L.opening.halo.x}px ${L.opening.halo.y}px, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0) 100%)`,
            opacity: Math.min(1, now.opening.cup.opacity * 1.6),
          }}
        />
      ) : null}
      {stack('opening', (v) => (v.opening ? <OpeningLayer L={L} data={props} o={v.opening} c={props.colors} /> : null))}
      {now.ribbon ? <RibbonBeat L={L} r={now.ribbon} color={props.colors.ribbon} /> : null}
      {now.beats.map((b) =>
        stack(`beat:${b.index}`, (v) => {
          const vb = v.beats.find((x) => x.index === b.index);
          return vb ? <BeatLayer L={L} beat={props.beats[vb.index]} v={vb} c={props.colors} /> : null;
        })
      )}
      {stack('ending-near', (v) =>
        v.ending ? (
          <div style={{position: 'absolute', inset: 0, transform: worldCss(v.world), transformOrigin: '0 0'}}>
            <CupShape L={L} x={v.ending.cup.x} y={v.ending.cup.y} lidW={L.ending.cup.lidW * v.ending.cup.scale} opacity={v.ending.cup.opacity * v.nearFade} image={props.ending.image || props.opening.image} mark={props.colors.ribbon} label="产品图" />
          </div>
        ) : null
      )}
      {stack('ending-far', (v) =>
        v.ending && v.far ? (
          <div style={{position: 'absolute', inset: 0, transform: worldCss(v.far.cam), transformOrigin: '0 0'}}>
            <CupShape L={L} x={v.ending.cup.x} y={v.ending.cup.y} lidW={L.ending.cup.lidW * v.ending.cup.scale} opacity={v.ending.cup.opacity * v.far.fade} image={props.ending.image || props.opening.image} mark={props.colors.ribbon} label="产品图" />
          </div>
        ) : null
      )}
      {now.ending ? <EndingText L={L} data={props} e={now.ending} c={props.colors} /> : null}
      {now.flash && now.flash.amount > 0 ? (
        // 一块和卡片一样大、一样圆角的毛白，边上化开一点
        <div
          style={{
            position: 'absolute',
            left: now.flash.x,
            top: now.flash.y,
            width: now.flash.w,
            height: now.flash.h,
            borderRadius: now.flash.radius,
            background: 'rgba(253, 252, 248, 0.45)',
            boxShadow: '0 0 56px 40px #fdfcf8',
            opacity: now.flash.amount,
          }}
        />
      ) : null}
      <Grain frame={frame} opacity={0.07} />
    </AbsoluteFill>
  );
};
