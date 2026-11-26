/** 某一刻画面的状态：全是数，渲染（Page.tsx）和量运动（scripts/motion.mjs）都从这里取。坐标都是画面像素。 */
import type {PetalSet, StyleName} from './layout';

export type Pt = [number, number];
/** 镜头：世界坐标里的 (x, y) 这一点不动，整个放大 scale 倍。 */
export type Cam = {scale: number; x: number; y: number};

/** 一行字或一组东西此刻的状态：挪了多少、多透明、虚多少。 */
export type Float = {dx: number; dy: number; opacity: number; blur: number};

export type OpeningView = {
  cup: {x: number; y: number; scale: number; opacity: number}; // 杯盖中心
  title: Float; // 细体小字
  titleBig: Float; // 粗斜体大字
  tag: Float; // 左下细体小字
  tagBig: Float; // 左下粗斜体大字
  cornerOpacity: number; // 角落里的小杯子
  ribbon: {tip: number; a0: number; a1: number} | null; // 丝带：带尖走到了几倍画面宽；左沿处中线比落定时高多少（px，正的在下）；左边那段比落定时斜多少（倍）
};

export type BeatView = {
  index: number;
  style: StyleName;
  dy: number; // 整组上下挪了多少（升入、飞走）
  opacity: number;
  scale: number; // 褪掉时放大一点
  blur: number; // 褪掉时虚掉
  cap: Float; // 卡片上方的短句
  below: Float; // 圆环下方那行
  circle: number; // 虚线圆画了多少
  capWipe: number; // 短句从左往右擦出来擦到哪儿（0 没出来，1.2 以上全出来）
  white: number; // 闪白：这一张卡片被白光盖住了多少（0 没有，1 全白）
};

export type EndingView = {
  cup: {x: number; y: number; scale: number; opacity: number}; // 推近前的杯盖中心（世界坐标，跟着推镜放大）
  near: (Float & {slot: number})[]; // 推近前的几行（画面坐标，不跟着放大）
  close: (Float & {slot: number})[]; // 推近后的几行
};

export type View = {
  probes: Pt[]; // 第一个是主角（杯盖或卡片的一个角），其余是画面上固定的几个点
  focus: {x: number; y: number; scale: number}; // 压纹图案的中心和大小（世界坐标）
  world: Cam; // 推近前那一套（卡片、产品图、压纹、装饰形状）的镜头；收尾推镜之前不放大
  nearFade: number; // 收尾推镜时，推近前那一套多透明（1 是全在）
  far: {cam: Cam; fade: number} | null; // 收尾的大特写那一套：它的镜头、多透明
  petals: {set: PetalSet; age: number; opacity: number}[]; // 背景装饰形状：用哪一组、出场了几帧、多透明（换场时新旧两组交叉淡化）
  opening: OpeningView | null;
  ribbon: {path: 'a' | 'b'; progress: number; opacity: number} | null; // 中间几拍卡片后面的丝带：哪条线、扫了多少、多透明
  beats: BeatView[];
  ending: EndingView | null;
  flash: {amount: number; x: number; y: number; w: number; h: number; radius: number} | null; // 闪白：白光多强，盖在卡片上的那块在哪儿、多大、圆角多少
  groups: {key: string; points: Pt[]}[]; // 动态模糊按组叠采样：每组给几个点，看它这一帧挪了多远
  motifStrong: number; // 纸上压纹的深浅（1 是全深）。收尾刚换过来那几帧它是淡进来的
  motifPrev: {focus: {x: number; y: number; scale: number}; strong: number} | null; // 压纹淡进来的时候，前一拍那一圈的这儿、还剩多深
};

/** 把世界坐标里的一个点换到画面上。 */
export const toScreen = (w: Cam, p: Pt): Pt => [(p[0] - w.x) * w.scale + w.x, (p[1] - w.y) * w.scale + w.y];
