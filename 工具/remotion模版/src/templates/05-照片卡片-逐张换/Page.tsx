import React, {useId} from 'react';
import {Img, staticFile} from 'remotion';
import {FONT_METRICS} from '../../shared/fontMetrics';
import {HANS, SANS, SERIF} from '../../shared/fonts';
import {CUP_LOGO} from './layout';
import type {Layout, Petal, Shadow, TextStyle} from './layout';
import type {Beat, TemplateProps} from './schema';
import type {BeatView, EndingView, Float, OpeningView, View} from './view';

type Colors = TemplateProps['colors'];
const ZERO: Float = {dx: 0, dy: 0, opacity: 0, blur: 0};

const cssShadow = (list: Shadow[]): string => list.map((s) => `${s.dx}px ${s.dy}px ${s.blur}px rgba(24, 32, 30, ${s.alpha})`).join(', ');
const cssDrop = (list: Shadow[]): string => `drop-shadow(${list.map((s) => `${s.dx}px ${s.dy}px ${s.blur}px rgba(38, 52, 47, ${s.alpha})`).join(') drop-shadow(')})`;
const isDark = (hex: string): boolean => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 128;
};

/** 底：浅灰的压纹纸。中间亮、四角暗：量参考第 0 帧，中心亮度 236，左右边上一半 214，上下边上一半 176，角上 161。 */
export const Paper: React.FC<{L: Layout; c: Colors}> = ({L, c}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(ellipse ${(0.72 * L.w).toFixed(0)}px ${(0.594 * L.h).toFixed(0)}px at 50% 50%, ${c.paper} 0%, ${c.paperMid} 72%, ${c.paperEdge} 100%)`,
    }}
  />
);

// 压纹图案：一圈细环、里面三道细圈、外面一圈小叶子（单位是“基准半径 205”）。参考里压的是品牌标志，这里换成这个中性的图案。
const LEAF = 'M 0 -221 C 10 -229, 12 -247, 6 -261 C 3 -268, -3 -268, -6 -261 C -12 -247, -10 -229, 0 -221 Z';

/** 压纹：图案画成实心的，但只留它的边缘——左上一侧发亮、右下一侧发暗，像纸上压出来的凹凸，若隐若现。 */
export const Motif: React.FC<{L: Layout; focus: {x: number; y: number; scale: number}; strong?: number}> = ({L, focus, strong = 1}) => {
  const id = `motif-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = L.motifR * focus.scale;
  return (
    <svg style={{position: 'absolute', inset: 0, width: L.w, height: L.h, overflow: 'visible'}}>
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation={r * 0.011} result="b" />
          <feOffset in="b" dx={-r * 0.011} dy={-r * 0.011} result="hl" />
          <feOffset in="b" dx={r * 0.011} dy={r * 0.011} result="sh" />
          <feComposite in="hl" in2="sh" operator="arithmetic" k1="0" k2="3.4" k3="-3.4" k4="0" result="lit" />
          <feComposite in="sh" in2="hl" operator="arithmetic" k1="0" k2="3.4" k3="-3.4" k4="0" result="dark" />
          <feFlood floodColor="#ffffff" floodOpacity={0.44 * strong} result="w" />
          <feComposite in="w" in2="lit" operator="in" result="wh" />
          <feFlood floodColor="#22302b" floodOpacity={0.13 * strong} result="k" />
          <feComposite in="k" in2="dark" operator="in" result="kd" />
          <feMerge>
            <feMergeNode in="kd" />
            <feMergeNode in="wh" />
          </feMerge>
        </filter>
      </defs>
      <g transform={`translate(${focus.x} ${focus.y}) scale(${r / 205})`} filter={`url(#${id})`} fill="#000000">
        <circle r={205} fill="none" stroke="#000000" strokeWidth={13} />
        <circle r={172} fill="none" stroke="#000000" strokeWidth={5} />
        <circle r={118} fill="none" stroke="#000000" strokeWidth={5} />
        <circle r={66} fill="none" stroke="#000000" strokeWidth={5} />
        {Array.from({length: 18}, (_, i) => (
          <path key={i} d={LEAF} transform={`rotate(${i * 20})`} />
        ))}
      </g>
    </svg>
  );
};

/** 背景里的深色装饰形状：两头圆的长条，带一点漂移，边缘是虚的（像在景深外）。参考里是品牌图形的一部分，换成了这个。 */
export const Petals: React.FC<{list: Petal[]; age: number; color: string; opacity: number}> = ({list, age, color, opacity}) => (
  <>
    {opacity <= 0.002
      ? null
      : list.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: p.x + p.vx * age - p.len / 2,
              top: p.y + p.vy * age - p.wid / 2,
              width: p.len,
              height: p.wid,
              borderRadius: p.wid / 2,
              background: color,
              transform: `rotate(${p.rot}deg)`,
              filter: p.blur > 0.3 ? `blur(${p.blur}px)` : undefined,
              opacity,
            }}
          />
        ))}
  </>
);

const DEPTH = {thin: FONT_METRICS.sans.baseline, bold: FONT_METRICS.serif.baseline}; // 行框顶到基线的距离（单位 em）
const hasWide = (text: string): boolean => /[^\u0000-\u2e7f]/.test(text); // 有没有汉字这类方块字

/**
 * 几行字上下叠着放的行距是按参考里的拉丁字母量的（字母有高有低，行挨得很紧）。汉字的字身是方的，照这个行距会叠在一起，
 * 所以汉字行改成接在上一行的底下再让一点；纯拉丁的行照原样。返回每行要往下挪多少。
 */
const cjkDrops = (lines: {text: string; top: number; size: number}[]): number[] => {
  let prevBottom = Number.NEGATIVE_INFINITY;
  return lines.map((l) => {
    const wide = hasWide(l.text);
    const top = wide ? Math.max(l.top, prevBottom + l.size * 0.12) : l.top;
    prevBottom = top + l.size * (wide ? 1 : 0.76); // 拉丁行算到字母头上为止，不管往下伸的那一点
    return top - l.top;
  });
};

/** 一行字，按基线摆放。x 是左沿、右沿或中心；bold 是衬线斜体，否则是无衬线细体。居中的要给 wrap（这一块的宽，超出会折行）。 */
export const Line: React.FC<{
  text: string;
  style: TextStyle;
  color: string;
  frameW: number;
  x: number;
  baseline: number;
  align: 'left' | 'right' | 'center';
  bold?: boolean;
  f?: Float;
  wrap?: number;
  reveal?: number; // 从左往右擦出来擦到哪儿：0 一点没出来，1.25 以上全出来
}> = ({text, style, color, frameW, x, baseline, align, bold = false, f = ZERO, wrap, reveal = 1.25}) => {
  if (!text || f.opacity <= 0.002) {
    return null;
  }
  const place = align === 'left' ? {left: x} : align === 'right' ? {right: frameW - x} : {left: x - (wrap ?? 0) / 2, width: wrap};
  return (
    <div
      style={{
        position: 'absolute',
        top: baseline - style.size * DEPTH[bold ? 'bold' : 'thin'] + f.dy,
        ...place,
        maxWidth: wrap,
        fontFamily: bold ? `${SERIF}, ${HANS}` : `${SANS}, ${HANS}`,
        fontStyle: bold ? 'italic' : 'normal',
        fontWeight: bold ? 700 : 260, // Archivo 是可变字体，细体压到 260 才接近参考那种细
        fontStretch: bold ? 'normal' : '85%', // 参考的细体字面窄，Archivo 拉窄一点
        fontSize: style.size,
        lineHeight: 1,
        whiteSpace: wrap ? 'pre-wrap' : 'pre',
        textAlign: align === 'right' ? 'right' : align === 'center' ? 'center' : 'left',
        color,
        opacity: f.opacity,
        transform: `translateX(${f.dx}px)`,
        filter: f.blur > 0.3 ? `blur(${f.blur}px)` : undefined,
        ...(reveal < 1.25
          ? {
              WebkitMaskImage: `linear-gradient(to right, #000 ${Math.max(-20, reveal * 130 - 40)}%, rgba(0, 0, 0, 0) ${Math.min(200, reveal * 130 + 50)}%)`,
              maskImage: `linear-gradient(to right, #000 ${Math.max(-20, reveal * 130 - 40)}%, rgba(0, 0, 0, 0) ${Math.min(200, reveal * 130 + 50)}%)`,
            }
          : null),
      }}
    >
      {text}
    </div>
  );
};

/** 产品图。给了图片就摆图片（图的中心放在杯身正中）；没给画一只占位纸杯：白杯子、带盖、盖子左低右高一点，正面一个圆形色标。
 *  杯盖宽算 180，(x, y) 是杯盖中心。 */
export const CupShape: React.FC<{L: Layout; x: number; y: number; lidW: number; opacity: number; rot?: number; image?: string; mark: string; label?: string}> = ({L, x, y, lidW, opacity, rot = 0, image = '', mark, label = ''}) => {
  const scale = lidW / 180;
  if (opacity <= 0.002) {
    return null;
  }
  if (image) {
    return (
      <Img
        src={staticFile(image)}
        style={{position: 'absolute', left: x - lidW * 0.75, top: y - lidW * 0.75, width: lidW * 1.5, opacity, transform: `rotate(${rot}deg) translateY(${lidW * 0.6}px)`}}
      />
    );
  }
  const id = `cup-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg viewBox="-100 -60 200 400" width={200 * scale} height={400 * scale} style={{position: 'absolute', left: x - 100 * scale, top: y - 60 * scale, overflow: 'visible', transform: `rotate(${rot}deg)`, transformOrigin: `${100 * scale}px ${60 * scale}px`, opacity}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity="0.13" />
          <stop offset="0.4" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${L.cup.tilt})`} style={{filter: cssDrop(L.cup.shadow)}}>
        {/* 杯身：上宽 168、下宽 130（四舍五入到曲线里），从杯盖下面到杯底 308 */}
        <path d="M -84 10 L -65 298 Q -64 318 -44 318 L 44 318 Q 64 318 65 298 L 84 10 Z" fill={L.cup.body} />
        <path d="M -84 10 L -65 298 Q -64 318 -44 318 L 44 318 Q 64 318 65 298 L 84 10 Z" fill={`url(#${id})`} />
        <rect x={-90} y={-12} width={180} height={28} rx={9} fill={L.cup.lid} />
        <rect x={-84} y={-26} width={168} height={22} rx={9} fill={L.cup.lidTop} />
        <circle cx={CUP_LOGO[0] * 180} cy={CUP_LOGO[1] * 180} r={38} fill={mark} />
        {label ? (
          <text x={0} y={232} textAnchor="middle" fontSize={15} fill="#9c9c95" fontFamily={HANS}>
            {label}
          </text>
        ) : null}
      </g>
    </svg>
  );
};

/** 开场：丝带从左边扫进来，压在产品图后面；角落两只小杯子；四行字。 */
export const OpeningLayer: React.FC<{L: Layout; data: TemplateProps; o: OpeningView; c: Colors}> = ({L, data, o, c}) => {
  const O = L.opening;
  let ribbon: React.ReactNode = null;
  if (o.ribbon && o.ribbon.tip * L.w > -0.08 * L.w) {
    const space = O.ribbon.space; // 丝带坐标 → 画面像素
    const W = L.w / space;
    // 落定的中线（第 60 帧量）：y = a0 + a1·x + a2·x² + a3·x³。刚扫进来时左边那一头更高、更陡（第 44 帧：左沿高 24，到 x=320 处就和落定的一样了），
    // 所以只把左沿的高度差和斜率差加在左边 60–75% 这一段上，越靠右加得越少
    const a0 = O.ribbon.line[0];
    const a1 = O.ribbon.line[1];
    const lift = o.ribbon.a0 / space;
    const tilt = O.ribbon.line[1] * (o.ribbon.a1 - 1);
    const yAt = (x: number): number => {
      const base = a0 + a1 * x + O.ribbon.line[2] * x * x + O.ribbon.line[3] * x * x * x;
      const wl = Math.max(0, Math.min(1, (0.6 * W - x) / (0.6 * W)));
      const wt = Math.max(0, 1 - x / (0.75 * W));
      return (base + lift * wl + tilt * x * wt * wt) * space;
    };
    const tipX = Math.min(W + 0.2, o.ribbon.tip * W); // 带尖走到了哪
    const pts: string[] = [];
    const step = W / 90;
    for (let n = 0; n < 200; n++) {
      const x = Math.min(tipX, -0.08 * W + n * step);
      pts.push(`${(x * space).toFixed(1)},${yAt(x).toFixed(1)}`);
      if (x >= tipX) {
        break;
      }
    }
    ribbon = (
      <svg style={{position: 'absolute', inset: 0, width: L.w, height: L.h, overflow: 'visible'}}>
        <path d={`M ${pts.join(' L ')}`} fill="none" stroke={c.ribbon} strokeWidth={O.ribbon.width} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  const titleDrop = cjkDrops([
    {text: data.opening.titleSmall, top: O.title.smallBase - O.title.small.size * DEPTH.thin, size: O.title.small.size},
    {text: data.opening.titleBig, top: O.title.bigBase - O.title.big.size * DEPTH.bold, size: O.title.big.size},
  ]);
  const tagDrop = cjkDrops([
    {text: data.opening.tagSmall, top: O.tag.smallBase - O.tag.small.size * DEPTH.thin, size: O.tag.small.size},
    {text: data.opening.tagBig, top: O.tag.bigBase - O.tag.big.size * DEPTH.bold, size: O.tag.big.size},
  ]);
  return (
    <>
      {ribbon}
      {O.cornerCups.map((cc, i) => (
        <CupShape key={i} L={L} x={cc.x} y={cc.y} lidW={cc.lidW} rot={cc.rot} opacity={o.cornerOpacity} image={data.opening.image} mark={c.ribbon} />
      ))}
      <CupShape L={L} x={o.cup.x} y={o.cup.y} lidW={O.cup.lidW * o.cup.scale} opacity={o.cup.opacity} image={data.opening.image} mark={c.ribbon} label="产品图" />
      <Line text={data.opening.titleSmall} style={O.title.small} color={c[O.title.small.color]} frameW={L.w} x={O.title.right} baseline={O.title.smallBase} align="right" f={{...o.title, dy: o.title.dy + titleDrop[0]}} />
      <Line text={data.opening.titleBig} style={O.title.big} color={c[O.title.big.color]} frameW={L.w} x={O.title.right} baseline={O.title.bigBase} align="right" bold f={{...o.titleBig, dy: o.titleBig.dy + titleDrop[1]}} />
      <Line text={data.opening.tagSmall} style={O.tag.small} color={c[O.tag.small.color]} frameW={L.w} x={O.tag.smallLeft} baseline={O.tag.smallBase} align="left" f={{...o.tag, dy: o.tag.dy + tagDrop[0]}} />
      <Line text={data.opening.tagBig} style={O.tag.big} color={c[O.tag.big.color]} frameW={L.w} x={O.tag.bigLeft} baseline={O.tag.bigBase} align="left" bold f={{...o.tagBig, dy: o.tagBig.dy + tagDrop[1]}} />
    </>
  );
};

/** 中间几拍卡片后面的丝带：一条贯穿画面的斜带，从一头扫到另一头（用虚线偏移做“画出来”）。 */
export const RibbonBeat: React.FC<{L: Layout; r: NonNullable<View['ribbon']>; color: string}> = ({L, r, color}) => {
  const p = L.ribbonBeat[r.path];
  const d = `M ${p[0][0]} ${p[0][1]} C ${p[1][0]} ${p[1][1]}, ${p[2][0]} ${p[2][1]}, ${p[3][0]} ${p[3][1]}`;
  return (
    <svg style={{position: 'absolute', inset: 0, width: L.w, height: L.h, overflow: 'visible', opacity: r.opacity}}>
      <path d={d} pathLength={1000} fill="none" stroke={color} strokeWidth={L.ribbonBeat.width} strokeDasharray="1000 1000" strokeDashoffset={Math.max(0, 1000 * (1 - r.progress))} strokeLinecap="butt" />
    </svg>
  );
};

/** 虚线圆是“画出来”的：用一个扇形当遮罩，从顶上顺时针转一圈。 */
const wedge = (cx: number, cy: number, rr: number, p: number): string => {
  const ang = Math.min(0.99999, Math.max(0, p)) * 2 * Math.PI;
  return `M ${cx} ${cy} L ${cx} ${cy - rr} A ${rr} ${rr} 0 ${p > 0.5 ? 1 : 0} 1 ${cx + rr * Math.sin(ang)} ${cy - rr * Math.cos(ang)} Z`;
};

/** 一拍：照片卡片（圆角、投影）或者抠图产品图外面一圈虚线圆，短句在卡片上方；圆环版式下面还有一行。整组的升降、虚化都按 v。 */
export const BeatLayer: React.FC<{L: Layout; beat: Beat; v: BeatView; c: Colors}> = ({L, beat, v, c}) => {
  const S = L.styles[v.style];
  const box = {left: S.card.x, top: S.card.y + v.dy, width: S.card.w, height: S.card.h};
  const cut = v.style === '圆环'; // 抠图：没有卡片边框，影子只落在下面
  const ring = S.circle ?? null;
  const cid = `ring-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const capWrap = Math.min(S.capBox.w, L.capWrap);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: L.w,
        height: L.h,
        opacity: v.opacity,
        filter: v.blur > 0.3 ? `blur(${v.blur}px)` : undefined,
        transform: v.scale !== 1 ? `scale(${v.scale})` : undefined,
        transformOrigin: `${S.card.x + S.card.w / 2}px ${S.card.y + v.dy + S.card.h / 2}px`,
      }}
    >
      {cut && beat.photo ? (
        // 给了抠图：原样摆，不裁
        <Img src={staticFile(beat.photo)} style={{position: 'absolute', ...box, display: 'block', objectFit: 'contain'}} />
      ) : (
        <div
          style={{
            position: 'absolute',
            ...box,
            borderRadius: S.radius,
            overflow: 'hidden',
            background: beat.color,
            boxShadow: cut ? undefined : cssShadow(S.shadow),
            filter: cut ? cssDrop(S.shadow) : undefined,
          }}
        >
          {beat.photo ? <Img src={staticFile(beat.photo)} style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover'}} /> : null}
          {!beat.photo ? (
            <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <span style={{fontFamily: HANS, fontWeight: 700, fontSize: Math.max(18, L.motifR * 0.13), letterSpacing: 6, color: isDark(beat.color) ? 'rgba(255, 255, 255, 0.86)' : 'rgba(20, 26, 24, 0.7)'}}>照片</span>
            </div>
          ) : null}
        </div>
      )}
      {ring ? (
        <svg style={{position: 'absolute', inset: 0, width: L.w, height: L.h, overflow: 'visible'}}>
          <defs>
            <mask id={cid} maskUnits="userSpaceOnUse" x={-200} y={-400} width={L.w + 400} height={L.h + 1200}>
              <path d={wedge(ring.x, ring.y + v.dy, ring.r + 20, v.circle)} fill="#ffffff" />
            </mask>
          </defs>
          <circle cx={ring.x} cy={ring.y + v.dy} r={ring.r} fill="none" stroke={c.ink} strokeWidth={Math.max(2.6, 4 * (L.k / 1.5))} strokeDasharray="0.8 9.5" strokeLinecap="round" mask={`url(#${cid})`} />
        </svg>
      ) : null}
      <Line
        text={beat.caption}
        style={S.cap}
        color={c[S.cap.color]}
        frameW={L.w}
        x={S.capBox.x + S.capBox.w / 2}
        baseline={S.capBox.baseline + v.dy}
        align="center"
        f={v.cap}
        wrap={capWrap}
        reveal={v.capWipe}
      />
      {v.white > 0.002 ? ( // 闪白：一块和卡片一样大、一样圆角的白，盖在卡片上
        <div style={{position: 'absolute', ...box, borderRadius: S.radius, background: '#fdfcf8', opacity: v.white}} />
      ) : null}
      {
        S.capBelow ? (
          <Line text={beat.captionBelow} style={S.capBelow} color={c[S.capBelow.color]} frameW={L.w} x={S.capBelow.x + S.capBelow.w / 2} baseline={S.capBelow.baseline + v.dy} align="center" bold f={v.below} wrap={S.capBelow.w} />
        ) : null
      }
    </div>
  );
};

/** 收尾的字：推近前产品图上下的几行、推近后右边的几行。字不跟着镜头放大。 */
export const EndingText: React.FC<{L: Layout; data: TemplateProps; e: EndingView; c: Colors}> = ({L, data, e, c}) => {
  const M = L.ending;
  const slotTop = (s: {size: number; baseline: number}, bold: boolean): number => s.baseline - s.size * DEPTH[bold ? 'bold' : 'thin'];
  // 推近前的第一行在产品图上方，后两行在下面，所以只把后两行当成叠着的
  const nearDrop = cjkDrops(data.ending.near.slice(0, 1).map((ln, i) => ({text: ln.text, top: slotTop(M.near[i], ln.bold), size: M.near[i].size}))).concat(
    cjkDrops(data.ending.near.slice(1).map((ln, i) => ({text: ln.text, top: slotTop(M.near[i + 1], ln.bold), size: M.near[i + 1].size})))
  );
  const closeDrop = cjkDrops(data.ending.close.map((ln, i) => ({text: ln.text, top: slotTop(M.close[i], ln.bold), size: M.close[i].size})));
  return (
    <>
      {e.near.map((f) => {
        const s = M.near[f.slot];
        const ln = data.ending.near[f.slot];
        return s && ln ? <Line key={`n${f.slot}`} text={ln.text} style={s} color={c[s.color]} frameW={L.w} x={s.x} baseline={s.baseline} align="left" bold={ln.bold} f={{...f, dy: f.dy + (nearDrop[f.slot] ?? 0)}} /> : null;
      })}
      {e.close.map((f) => {
        const s = M.close[f.slot];
        const ln = data.ending.close[f.slot];
        return s && ln ? <Line key={`c${f.slot}`} text={ln.text} style={s} color={c[s.color]} frameW={L.w} x={s.x} baseline={s.baseline} align="left" bold={ln.bold} f={{...f, dy: f.dy + (closeDrop[f.slot] ?? 0)}} /> : null;
      })}
    </>
  );
};
