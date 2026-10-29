// A-roll 层（2026-10-29）：你的出镜视频叠在 B-roll 上，用自己的时间轴，不碰场景排版。
// photo.json 顶层：
//   "aroll": {
//     "src": "ai03/aroll.mp4",         // public/ 下，和 srt 同一条时间线、从 0 秒对齐、1080p 30fps
//     "idle": "bubble",                // cue 之外的状态：bubble 右下小圆 | hide 不出现
//     "bubble": {"d": 300, "x": 1620, "y": 740},   // 小圆直径和圆心（默认右下角，落在抖音图标区 × 字幕区交界，B-roll 从不放字）
//     "cues": [{"at": [0, 7], "mode": "full"}, {"at": [146, 150], "mode": "half"}, ...]
//   }
// cue 的 at 是口播稿行号 [起, 止)，和场景表同口径；mode: full 全屏 | half 左半屏 | bubble 小圆 | hide
// 切换：bubble ⇄ full 是圆形 iris（圆从小圆位置长大到盖满屏 / 缩回），24 帧；half ⇄ 其他是竖直 wipe + 圆角卡；每次切换 whoosh。
// A-roll 一律 muted —— 人声由用户在剪映里放原音轨；这里只出画面和音效。
import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Video} from '@remotion/media';
import {useC} from '../ui';
import {Sfx} from '../sfx';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export type ArollMode = 'full' | 'half' | 'bubble' | 'hide';
export type ArollCue = {at: [number, number]; mode: ArollMode};
// face: 脸在 A-roll 画面里的位置（0–1 比例，默认 [0.5, 0.42]），bubble 态放大时以它为中心、把它对到圆心
// hideOn: 这些场景 id 自动 hide（默认 ["chapter", "series"]：章节卡和栏目卡不露脸），不用手写行号
export type ArollSpec = {src: string; idle?: ArollMode; bubble?: {d?: number; x?: number; y?: number}; cues: ArollCue[]; dur?: number; pos?: string; ring?: boolean; face?: [number, number]; layout?: 'right' | 'topleft' | 'center' | 'bottom'; hideOn?: string[]};

// 把行号 cue 换成帧区间：lineFrames[i] = 第 i 行开始的帧
export type ArollSeg = {from: number; to: number; mode: ArollMode; side?: 'left' | 'right'};
// scenes 里每项可带 side：这个场景的 B-roll 字在哪边，bubble 就躲到另一边（photo.json 场景写 "arollSide": "right" 表示小圆放右边）
export const buildArollSegs = (spec: ArollSpec, lineFrames: number[], total: number, scenes: {scene: string; from: number; dur: number; side?: 'left' | 'right'}[] = []): ArollSeg[] => {
  const idle = spec.idle ?? 'bubble';
  // 行号 0 从第 0 帧算（口播稿第一句前有几帧静音，别让 idle 闪一下）
  const f = (i: number) => (i <= 0 ? 0 : i >= lineFrames.length ? total : lineFrames[i]);
  // 行号 cue + 场景 hide 合成一张帧级表：先铺 idle，再盖 cue，最后 hideOn 的场景强制 hide
  const hideOn = new Set(spec.hideOn ?? ['chapter', 'series']);
  const frames: ArollMode[] = new Array(total).fill(idle);
  [...spec.cues].sort((a, b) => a.at[0] - b.at[0]).forEach((c) => { for (let i = f(c.at[0]); i < Math.min(total, f(c.at[1])); i++) frames[i] = c.mode; });
  // 章节卡只在卡本身显示的那 ~3 秒 hide；有的期把章节后几句也归到 chapter 场景，那部分照 idle
  // 章节卡 / 栏目卡整段 hide
  scenes.filter((s) => hideOn.has(s.scene)).forEach((s) => { for (let i = s.from; i < Math.min(total, s.from + s.dur); i++) frames[i] = 'hide'; });
  const sides: (('left' | 'right') | undefined)[] = new Array(total).fill(undefined);
  scenes.forEach((s) => { if (s.side) for (let i = s.from; i < Math.min(total, s.from + s.dur); i++) sides[i] = s.side; });
  const segs: ArollSeg[] = [];
  for (let i = 0; i < total; i++) { const l = segs[segs.length - 1]; if (l && l.mode === frames[i] && l.side === sides[i]) l.to = i + 1; else segs.push({from: i, to: i + 1, mode: frames[i], side: sides[i]}); }
  // 合并相邻同模式
  const out: ArollSeg[] = [];
  segs.forEach((s) => { const l = out[out.length - 1]; if (l && l.mode === s.mode) l.to = s.to; else out.push({...s}); });
  return out;
};

const TRANS = 24;      // 切换帧数
const HALF = {x: 60, y: 60, w: 900, h: 960};   // half 态左侧大卡
// 每种模式的几何：圆心、半径（full 的半径足够盖住全屏对角）、半屏宽
type Geo = {cx: number; cy: number; r: number; halfW: number; op: number};
const geoOf = (mode: ArollMode, b: Required<NonNullable<ArollSpec['bubble']>>): Geo => {
  switch (mode) {
    case 'full': return {cx: 960, cy: 540, r: 1150, halfW: 0, op: 1};
    case 'half': return {cx: HALF.x + HALF.w / 2, cy: 540, r: 1150, halfW: HALF.w, op: 1};
    case 'bubble': return {cx: b.x, cy: b.y, r: b.d / 2, halfW: 0, op: 1};
    case 'hide': return {cx: b.x, cy: b.y, r: 0, halfW: 0, op: 0};
  }
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const ArollLayer: React.FC<{spec: ArollSpec; segs: ArollSeg[]}> = ({spec, segs}) => {
  const C = useC();
  const f = useCurrentFrame();
  // bubble 默认落在"B-roll 不放字"的那一角：字在右（layout=right）→ 左下；其他 → 右下。都在字幕线（820）之上一点
  const defSide: 'left' | 'right' = spec.layout === 'right' ? 'left' : 'right';
  const bubbleFor = (side?: 'left' | 'right') => ({d: 300, x: (side ?? defSide) === 'left' ? 240 : 1680, y: 640, ...(spec.bubble ?? {})});
  const [fx, fy] = spec.face ?? [0.5, 0.42];
  let idx = segs.findIndex((s) => f >= s.from && f < s.to);
  if (idx < 0) idx = segs.length - 1;
  const cur = segs[idx], prev = segs[idx - 1];
  const k = prev ? interpolate(f, [cur.from, cur.from + TRANS], [0, 1], {...clamp, easing: easeInOut}) : 1;
  const m0 = prev?.mode ?? cur.mode, m1 = cur.mode;
  const b0 = bubbleFor(prev?.side ?? cur.side), b = bubbleFor(cur.side);
  const changing = !!prev && k < 1;
  const video = <Video src={staticFile(spec.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fx * 100}% ${fy * 100}%`}} />;

  // half 卡：进入时从左 wipe 开（宽 0 → HALF.w），退出时反过来
  const halfK = m1 === 'half' ? k : m0 === 'half' ? 1 - k : 0;
  const showHalf = halfK > 0.001;
  const hw = m1 === 'half' ? HALF.w * interpolate(halfK, [0, 1], [0, 1], {...clamp, easing: easeOut}) : HALF.w;
  // 离开 half 时卡在前 40% 淡掉，圆接着长；进入 half 时卡最后 60% 才淡入
  const halfOp = m0 === 'half' && m1 !== 'half' ? interpolate(k, [0, 0.4], [1, 0], clamp) : m1 === 'half' && m0 !== 'half' ? interpolate(k, [0.3, 1], [0, 1], clamp) : 1;
  // 圆在 half 参与的切换里：进 half 时前 40% 缩完；出 half 时 30% 后才开始长
  const kc = m1 === 'half' && m0 !== 'half' ? interpolate(k, [0, 0.4], [0, 1], clamp) : m0 === 'half' && m1 !== 'half' ? interpolate(k, [0.3, 1], [0, 1], clamp) : k;

  // ---- 两种容器：圆（full / bubble / hide 之间）和卡（half）。半屏卡和其他态之间不做形变，用 wipe + 淡 ----
  // half 的"圆"定义在卡里脸的位置、半径 0：从 half 切到 full/bubble 时，圆从脸那里长出来；反向则缩进脸里
  const halfFace = {cx: HALF.x + HALF.w / 2, cy: HALF.y + fy * HALF.h, r: 0, halfW: 0, op: 1};
  const circleGeo = (mode: ArollMode, bb: typeof b): Geo => (mode === 'half' ? halfFace : geoOf(mode, bb));
  const g0 = circleGeo(m0, b0), g1 = circleGeo(m1, b);
  const g: Geo = {cx: lerp(g0.cx, g1.cx, kc), cy: lerp(g0.cy, g1.cy, kc), r: lerp(g0.r, g1.r, kc), halfW: 0, op: lerp(g0.op, g1.op, kc)};
  // 圆里的视频变换：full 原样；bubble 以脸为中心放大、脸对圆心
  const faceX = fx * 1920, faceY = fy * 1080;
  const tfOf = (mode: ArollMode, bb: typeof b) => {
    if (mode === 'half') { const sc = HALF.h / 1080; return {sc, tx: halfFace.cx - faceX * sc, ty: halfFace.cy - faceY * sc}; }
    if (mode === 'bubble' || mode === 'hide') { const sc = (bb.d / 1080) * 2.6 * 1.25; return {sc, tx: bb.x - faceX * sc, ty: bb.y - faceY * sc}; }
    return {sc: 1, tx: 0, ty: 0};
  };
  const t0 = tfOf(m0, b0), t1 = tfOf(m1, b);
  const sc = lerp(t0.sc, t1.sc, k), tx = lerp(t0.tx, t1.tx, k), ty = lerp(t0.ty, t1.ty, k);
  const showCircle = g.op > 0.001 && g.r > 0.5;
  const ring = spec.ring !== false && g.r < 1100;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {prev && !(m0 === 'bubble' && m1 === 'bubble') && <Sfx at={cur.from} name="whoosh" vol={0.3} />}
      {showCircle && (
        <>
          <AbsoluteFill style={{clipPath: `circle(${g.r}px at ${g.cx}px ${g.cy}px)`, opacity: g.op}}>
            <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: '0 0'}}>{video}</AbsoluteFill>
            {g.r < 1100 && <AbsoluteFill style={{background: `radial-gradient(circle at ${g.cx}px ${g.cy}px, transparent ${g.r * 0.72}px, #00000066 ${g.r}px)`}} />}
          </AbsoluteFill>
          {ring && <div style={{position: 'absolute', left: g.cx - g.r, top: g.cy - g.r, width: g.r * 2, height: g.r * 2, borderRadius: '50%', boxSizing: 'border-box', border: `3px solid ${C.gold}`, boxShadow: `0 0 0 10px ${C.bg}CC, 0 24px 60px #000A`, opacity: g.op * interpolate(g.r, [900, 1100], [1, 0], clamp)}} />}
          {changing && <div style={{position: 'absolute', left: g.cx - g.r - 14, top: g.cy - g.r - 14, width: (g.r + 14) * 2, height: (g.r + 14) * 2, borderRadius: '50%', border: `6px solid ${C.gold}`, opacity: (1 - k) * 0.6 * g.op, filter: 'blur(6px)'}} />}
        </>
      )}
      {showHalf && (
        <>
          <div style={{position: 'absolute', left: HALF.x, top: HALF.y, width: hw, height: HALF.h, overflow: 'hidden', borderRadius: 28, boxShadow: '0 30px 80px #000B', opacity: halfOp}}>
            {/* 卡里的视频：按卡高等比缩放（1080 → HALF.h），再水平平移让脸在卡中线上 */}
            {(() => { const sc = HALF.h / 1080; const vw = 1920 * sc; const left = Math.max(HALF.w - vw, Math.min(0, HALF.w / 2 - fx * vw)); return <div style={{position: 'absolute', left, top: 0, width: vw, height: HALF.h}}>{video}</div>; })()}
          </div>
          <div style={{position: 'absolute', left: HALF.x, top: HALF.y, width: hw, height: HALF.h, borderRadius: 28, boxSizing: 'border-box', border: `2px solid ${C.gold}88`, opacity: halfOp}} />
          {/* wipe 前沿一道亮线 */}
          {halfK < 1 && halfK > 0 && m1 === 'half' && <div style={{position: 'absolute', left: HALF.x + hw - 3, top: HALF.y, width: 6, height: HALF.h, background: C.gold, filter: 'blur(3px)', opacity: 0.8}} />}
        </>
      )}
    </AbsoluteFill>
  );
};
