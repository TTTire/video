// A-roll 层（2026-10-29）：你的出镜视频叠在 B-roll 上，用自己的时间轴，不碰场景排版。
// photo.json 顶层：
//   "aroll": {
//     "src": "ai03/aroll.mp4",         // public/ 下，和 srt 同一条时间线、从 0 秒对齐、1080p 30fps
//     "idle": "bubble",                // cue 之外的状态：bubble 右下小圆 | hide 不出现
//     "bubble": {"d": 260},            // 小圆直径和圆心（默认 260；圆心左下 220,650 / 右上 1770,290，按 layout 和场景 arollSide / arollPos 定；右下不能放，抖音按钮会盖住）
//     "cues": [{"at": ["0.1", "0.4"], "mode": "full"}, {"at": ["2.3", "2.5"], "mode": "half"}, ...]
//   }
// cue 的 at 是要点 id [起, 止)（讲稿卡的 章.序，止写 "end" 到片尾），按 timeline.points 换成帧；ep8 及以前写的是口播稿行号，照旧认
// max：最多几秒（要点很长、只想在它开头露一下脸时写，如 {"at": ["1.5", "1.6"], "mode": "half", "max": 5}）
// mode: full 全屏 | half 左半屏 | bubble 小圆 | hide
// 切换：bubble ⇄ full 是圆形 iris（圆从小圆位置长大到盖满屏 / 缩回），24 帧；half ⇄ 其他是竖直 wipe + 圆角卡；每次切换 whoosh。
// style.sfx = "sparse"（精简音效）时，正好落在换场景那一帧的切换不响——换场景本身有 pop / 章节卡 flip，不再叠一声。bubble 之间换位置 / 换大小平滑滑过去，不响。
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
export type ArollCue = {at: [number | string, number | string]; mode: ArollMode; max?: number};
// 小圆大小（场景写 "arollSize"）：不写 = 默认直径（bubble.d，默认 260）；m = 1.3 倍，l = 1.6 倍。
// 放大时外沿贴住默认小圆的外沿（右上圆贴右上、左下圆贴左下），圆往画面里长：不出画、不进字幕区，但会多占字列和照片主体那一侧
export const BUBBLE_SIZE = {m: 1.3, l: 1.6} as const;
export type ArollSize = keyof typeof BUBBLE_SIZE;
// face: 脸在 A-roll 画面里的位置（0–1 比例，默认 [0.5, 0.42]），bubble 态放大时以它为中心、把它对到圆心
// bubbleView: 小圆直径装下 A-roll 画面高度的多少（默认 0.62 = 半身；0.31 = 只有脸，旧版效果）；bubbleFaceAt: 脸在圆里从上往下的位置（默认 0.32）
// hideOn: 这些场景 id 自动 hide（默认 ["chapter", "series"]：章节卡和栏目卡不露脸），不用手写 cue
// sfx: 跟 style.sfx（register.tsx 传进来），"sparse" 时落在换场景那一帧的切换不响
export type ArollSpec = {src: string; idle?: ArollMode; bubble?: {d?: number; x?: number; y?: number}; cues: ArollCue[]; dur?: number; pos?: string; ring?: boolean; face?: [number, number]; layout?: 'right' | 'topleft' | 'center' | 'bottom'; hideOn?: string[]; halfView?: number; bubbleView?: number; bubbleFaceAt?: number; sfx?: 'sparse'};

// 把 cue 换成帧区间：frameOf(要点 id 或老期行号) = 它开始的帧（register.tsx 的 cueFrame）
export type ArollSeg = {from: number; to: number; mode: ArollMode; side?: 'left' | 'right'; pos?: [number, number]; size?: ArollSize; quiet?: boolean};
// scenes 里每项可带 side / pos / size：photo.json 场景写 "arollSide": "right" 表示小圆放右上；两边都有字时写 "arollPos": [x, y] 直接给圆心；"arollSize": "m" / "l" 放大小圆
// sound：这个场景开头自己有声音（场景 pop / 章节卡、栏目卡 flip）；精简音效时正好落在这一帧的切换记 quiet，不响
export const buildArollSegs = (spec: ArollSpec, frameOf: (at: number | string) => number, total: number, scenes: {scene: string; from: number; dur: number; side?: 'left' | 'right'; pos?: [number, number]; size?: ArollSize; sound?: boolean}[] = []): ArollSeg[] => {
  const idle = spec.idle ?? 'bubble';
  // cue + 场景 hide 合成一张帧级表：先铺 idle，再盖 cue，最后 hideOn 的场景强制 hide
  const hideOn = new Set(spec.hideOn ?? ['chapter', 'series']);
  const frames: ArollMode[] = new Array(total).fill(idle);
  [...spec.cues].sort((a, b) => frameOf(a.at[0]) - frameOf(b.at[0])).forEach((c) => {
    const from = frameOf(c.at[0]);
    const to = Math.min(total, frameOf(c.at[1]), c.max ? from + Math.round(c.max * 30) : total);
    for (let i = from; i < to; i++) frames[i] = c.mode;
  });
  // 章节卡只在卡本身显示的那 ~3 秒 hide；有的期把章节后几句也归到 chapter 场景，那部分照 idle
  // 章节卡 / 栏目卡整段 hide
  scenes.filter((s) => hideOn.has(s.scene)).forEach((s) => { for (let i = s.from; i < Math.min(total, s.from + s.dur); i++) frames[i] = 'hide'; });
  // 位置只对 bubble 有意义：full / half / hide 不带位置，免得同模式因为换场景被切开、多响一次 whoosh
  // （旧版这里把相邻同模式一律合并，结果一段 bubble 里后面场景的 arollSide 全部失效——2026-10-30 修）
  const spots: {side?: 'left' | 'right'; pos?: [number, number]; size?: ArollSize}[] = new Array(total).fill(null).map(() => ({}));
  scenes.forEach((s) => { if (s.side || s.pos || s.size) for (let i = s.from; i < Math.min(total, s.from + s.dur); i++) spots[i] = {side: s.side, pos: s.pos, size: s.size}; });
  const key = (i: number) => (frames[i] === 'bubble' ? `${spots[i].side ?? ''}|${spots[i].pos?.join(',') ?? ''}|${spots[i].size ?? ''}` : '');
  const out: ArollSeg[] = [];
  for (let i = 0; i < total; i++) {
    const l = out[out.length - 1];
    if (l && l.mode === frames[i] && key(l.from) === key(i)) l.to = i + 1;
    else out.push({from: i, to: i + 1, mode: frames[i], ...(frames[i] === 'bubble' ? spots[i] : {})});
  }
  // 精简音效：切换落在自带声音的场景开头（±3 帧，要点起点和场景起点同源，只差取整）就不响
  if (spec.sfx === 'sparse') {
    const cuts = scenes.filter((s) => s.sound).map((s) => s.from);
    out.forEach((sg) => { if (cuts.some((c) => Math.abs(c - sg.from) <= 3)) sg.quiet = true; });
  }
  return out;
};

const TRANS = 24;      // 切换帧数
const HALF = {x: 60, y: 90, w: 640, h: 720};   // half 态左侧卡：右边界 700，不碰 layout=right 的字列（x≥760）；底边 810 不进字幕区
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
  // 小圆两个默认落点（依据见 工具/video-broll-maker/references/douyin-safe-zone.md）：
  //   左 → 左下 (220, 650)：抖音信息流里 16:9 画面的左下角没有遮挡，字幕线（820）之上
  //   右 → 右上 (1770, 290)：整个圆（含描边）都在 x≥1626 的"抖音图标列"里，永远不碰 B-roll 的字（右列右边界 SAFE_RIGHT_X=1620）；
  //        放上面不放下面，是因为抖音右侧的头像 / 点赞 / 评论列从画面中部往下盖，右下还有"全屏观看"按钮——右下角不能放（2026-10-30 用户实测）
  // 默认侧：字在右（layout=right）→ 左；其他 → 右。场景 arollSide 换边，arollPos 直接给圆心。
  const BUBBLE_AT = {left: {x: 220, y: 650}, right: {x: 1770, y: 290}} as const;
  const defSide: 'left' | 'right' = spec.layout === 'right' ? 'left' : 'right';
  const bubbleFor = (side?: 'left' | 'right', pos?: [number, number], size?: ArollSize) => {
    const s = side ?? defSide;
    const b = {d: 260, ...BUBBLE_AT[s], ...(spec.bubble ?? {})};
    const d = size ? Math.round(b.d * BUBBLE_SIZE[size]) : b.d;
    if (pos) return {...b, d, x: pos[0], y: pos[1]};
    // 放大：圆心沿对角线往画面里挪半个增量，外沿和默认小圆对齐（右上圆往左下挪，左下圆往右上挪）
    const g = (d - b.d) / 2;
    return {...b, d, x: b.x + (s === 'right' ? -g : g), y: b.y + (s === 'right' ? g : -g)};
  };
  const [fx, fy] = spec.face ?? [0.5, 0.42];
  let idx = segs.findIndex((s) => f >= s.from && f < s.to);
  if (idx < 0) idx = segs.length - 1;
  const cur = segs[idx], prev = segs[idx - 1];
  const k = prev ? interpolate(f, [cur.from, cur.from + TRANS], [0, 1], {...clamp, easing: easeInOut}) : 1;
  const m0 = prev?.mode ?? cur.mode, m1 = cur.mode;
  const b0 = prev?.mode === 'bubble' ? bubbleFor(prev.side, prev.pos, prev.size) : bubbleFor(cur.side, cur.pos, cur.size), b = cur.mode === 'bubble' ? bubbleFor(cur.side, cur.pos, cur.size) : prev?.mode === 'bubble' ? bubbleFor(prev.side, prev.pos, prev.size) : bubbleFor(cur.side, cur.pos, cur.size);
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
  // halfView：半屏卡只显示 A-roll 画面从顶上往下的这一截（默认 1 = 整个高度；A-roll 底部有烧进去的字幕时设 0.8 把它裁掉）
  const halfSc = HALF.h / ((spec.halfView ?? 1) * 1080);
  const halfFace = {cx: HALF.x + HALF.w / 2, cy: HALF.y + fy * 1080 * halfSc, r: 0, halfW: 0, op: 1};
  const circleGeo = (mode: ArollMode, bb: typeof b): Geo => (mode === 'half' ? halfFace : geoOf(mode, bb));
  const g0 = circleGeo(m0, b0), g1 = circleGeo(m1, b);
  const g: Geo = {cx: lerp(g0.cx, g1.cx, kc), cy: lerp(g0.cy, g1.cy, kc), r: lerp(g0.r, g1.r, kc), halfW: 0, op: lerp(g0.op, g1.op, kc)};
  // 圆里的视频变换：full 原样；bubble 以脸为中心放大、脸对圆心
  const faceX = fx * 1920, faceY = fy * 1080;
  const tfOf = (mode: ArollMode, bb: typeof b) => {
    if (mode === 'half') { const sc = halfSc; return {sc, tx: halfFace.cx - faceX * sc, ty: halfFace.cy - faceY * sc}; }
    if (mode === 'bubble' || mode === 'hide') {
      // 小圆取景：圆的直径装下 A-roll 画面高度的 view（默认 0.62 ≈ 头到胸口的半身），脸放在圆里从上往下 faceAt 处（默认 0.32）
      // 再夹一下，保证视频始终盖满整个圆，不露黑边
      const view = spec.bubbleView ?? 0.62, faceAt = spec.bubbleFaceAt ?? 0.32;
      const sc = bb.d / (view * 1080);
      const vw = 1920 * sc, vh = 1080 * sc, l = bb.x - bb.d / 2, t = bb.y - bb.d / 2;
      const tx = Math.min(l, Math.max(l + bb.d - vw, bb.x - faceX * sc));
      const ty = Math.min(t, Math.max(t + bb.d - vh, t + faceAt * bb.d - faceY * sc));
      return {sc, tx, ty};
    }
    return {sc: 1, tx: 0, ty: 0};
  };
  const t0 = tfOf(m0, b0), t1 = tfOf(m1, b);
  const sc = lerp(t0.sc, t1.sc, k), tx = lerp(t0.tx, t1.tx, k), ty = lerp(t0.ty, t1.ty, k);
  const showCircle = g.op > 0.001 && g.r > 0.5;
  const ring = spec.ring !== false && g.r < 1100;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {prev && !cur.quiet && !(m0 === 'bubble' && m1 === 'bubble') && <Sfx at={cur.from} name="whoosh" vol={0.3} />}
      {showCircle && (
        <>
          <AbsoluteFill style={{clipPath: `circle(${g.r}px at ${g.cx}px ${g.cy}px)`, opacity: g.op}}>
            <AbsoluteFill style={{transform: `translate(${tx}px, ${ty}px) scale(${sc})`, transformOrigin: '0 0'}}>{video}</AbsoluteFill>
          </AbsoluteFill>
          {/* 边缘照小Lin说的做法（2026-10-31 量过她 10 月两期成片）：3px 暖白细边压住视频边缘 + 两层软投影把圆托起来；不压内暗角、不加实心深色圈。
              旧版是金边 + 外圈 10px 实心深色带（box-shadow 只扩不糊）+ 内暗角，圆像贴上去的徽章，边缘发硬 */}
          {ring && <div style={{position: 'absolute', left: g.cx - g.r, top: g.cy - g.r, width: g.r * 2, height: g.r * 2, borderRadius: '50%', boxSizing: 'border-box', border: `3px solid ${C.white}D9`, boxShadow: '0 4px 10px #0000004D, 0 16px 44px #00000073', opacity: g.op * interpolate(g.r, [900, 1100], [1, 0], clamp)}} />}
          {changing && <div style={{position: 'absolute', left: g.cx - g.r - 14, top: g.cy - g.r - 14, width: (g.r + 14) * 2, height: (g.r + 14) * 2, borderRadius: '50%', border: `6px solid ${C.white}`, opacity: (1 - k) * 0.45 * g.op, filter: 'blur(6px)'}} />}
        </>
      )}
      {showHalf && (
        <>
          <div style={{position: 'absolute', left: HALF.x, top: HALF.y, width: hw, height: HALF.h, overflow: 'hidden', borderRadius: 28, boxShadow: '0 30px 80px #000B', opacity: halfOp}}>
            {/* 卡里的视频：按 halfSc 等比缩放（顶对齐，超出卡底的部分裁掉），再水平平移让脸在卡中线上 */}
            {(() => { const sc = halfSc; const vw = 1920 * sc; const left = Math.max(HALF.w - vw, Math.min(0, HALF.w / 2 - fx * vw)); return <div style={{position: 'absolute', left, top: 0, width: vw, height: 1080 * sc}}>{video}</div>; })()}
          </div>
          <div style={{position: 'absolute', left: HALF.x, top: HALF.y, width: hw, height: HALF.h, borderRadius: 28, boxSizing: 'border-box', border: `2px solid ${C.gold}88`, opacity: halfOp}} />
          {/* wipe 前沿一道亮线 */}
          {halfK < 1 && halfK > 0 && m1 === 'half' && <div style={{position: 'absolute', left: HALF.x + hw - 3, top: HALF.y, width: 6, height: HALF.h, background: C.gold, filter: 'blur(3px)', opacity: 0.8}} />}
        </>
      )}
    </AbsoluteFill>
  );
};
