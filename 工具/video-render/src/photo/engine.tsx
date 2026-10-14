// 通用照片场景引擎：每期只写一份 photo.json（场景 → 照片、推拉、每句出什么字、字放哪），这里负责渲染。
// 特殊图表（柱状图、表格）写在 src/epN/custom.tsx，在 photo.json 里用 {"type":"custom","name":"..."} 引用。
// 字段说明见 工具/video-broll-maker/references/photo-json.md
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Theme, useC} from '../ui';
import {Enter} from '../fx';
import {CountUp, FlyIn, Sfx, SfxName, Stamp, StrikeLine, useSpringAt} from '../fx';
import {at, Box, BoxSpec, Clock, Em, FONTS, FontKey, Grad, H, P, Panel, Photo, PHOTO_THEME, Quote, Rings, SHADOW, Spot, T, Tag, TITLE_FONT, TITLE_FONTS, clamp, ease, regionBox, regionOrigin, regionXY} from './kit';
export type {BoxSpec} from './kit';

// ---------- 类型 ----------
type Dir = 'left' | 'right' | 'up' | 'down';
// font：单个元素换字体（title 得意黑 / song 锦书宋 / kai 文楷 / num 数黑体 / sans 思源黑）；quote：对白，走文楷 + 金色引号
type Base = {at?: number; delay?: number; until?: number; dir?: Dir; box?: string; sfx?: SfxName | null; vol?: number; font?: FontKey; quote?: boolean};
export type Item = Base & (
  | {type: 'h'; text: string; size?: number; color?: string; strikeAt?: number}
  | {type: 't'; text: string; size?: number; color?: string}
  | {type: 'tag'; text: string; size?: number; color?: string; dark?: boolean}
  | {type: 'stamp'; text: string; size?: number; color?: string; rotate?: number}
  | {type: 'big'; text: string; size?: number; color?: string}
  | {type: 'count'; from?: number; to: number; prefix?: string; suffix?: string; size?: number; color?: string; dur?: number; label?: string; before?: string}
  | {type: 'nums'; items: {label?: string; value: string; color?: string}[]; size?: number; arrow?: string}
  | {type: 'panel'; lines: string[]; label?: string; size?: number}
  | {type: 'compare'; left: string; right: string; mid?: string; size?: number}
  | {type: 'clock'; h: number; m: number; to?: number; dur?: number}
  | {type: 'spot'; x?: number; y?: number; r?: number; strength?: number; region?: string}
  | {type: 'rings'; x?: number; y?: number; n?: number; max?: number; color?: string; region?: string}
  | {type: 'sfx'; name: SfxName; variant?: string; dur?: number; endAt?: number; fade?: number}
  | {type: 'custom'; name: string}
);
// origin 可以写区域名（"MR"）或百分比（"68% 62%"）
export type PhotoLayer = {photo: string; zoom?: [number, number]; move?: 'in' | 'out' | 'still'; origin?: string; grad?: Grad; dim?: number; blur?: number; pos?: string};
export type SceneSpec = PhotoLayer & {
  id: string; name?: string;
  type?: 'photo' | 'chapter' | 'series';
  swap?: PhotoLayer & {at: number; delay?: number};
  split?: {at: [number, number]; photos: [string, string]; pos?: [string, string]};
  // box 可以写区域名（"TL" "MR" "BW"…）或像素框
  box?: BoxSpec | string; boxes?: Record<string, BoxSpec | string>;
  center?: boolean; ambience?: boolean | string; enterSfx?: SfxName | null;
  items?: Item[];
  // type: 'series'
  num?: number; title?: string; tagline?: string; label?: string;
};
// 每期的视觉方案：在不动栏目固定件（角标、章节卡结构、音效语言、字幕位）的前提下换"长相"
export type Style = {
  layout?: 'topleft' | 'bottom' | 'right' | 'center';   // 默认文字母版：左上大字 / 底部字幕带式居中 / 右侧右对齐 / 居中
  titleFont?: keyof typeof TITLE_FONTS | string;        // 标题字体：smiley | serif | hei | kai 或任意 CSS font-family
  theme?: Partial<Theme>;                               // 覆盖配色：gold（强调）、teal（正面）、coral（负面）、bg（压暗色）、white、dim
  tint?: string; tintOpacity?: number;                  // 给所有照片统一罩一层色（mixBlendMode color），比如冷蓝 #1B2A44
  letterbox?: boolean;                                  // 上下黑边（2.35:1 电影感）
  enter?: Enter;                                        // 场景入场：blur（默认）| cut 硬切 | slideL | zoom | slideUp
  grain?: boolean;                                      // 胶片颗粒
};
export type EpisodeSpec = {
  ep: string; badge: string; photos: string; chapterPhoto: string;
  series?: string; style?: Style; scenes: SceneSpec[];
};
export type CustomMap = Record<string, React.FC<P & {spec: SceneSpec}>>;

// ---------- 文本标记：**金** [[青]] ((红)) ~~划掉~~ \n 换行 ----------
export const rich = (s: string, C: Theme = PHOTO_THEME): React.ReactNode => {
  const parts = s.split(/(\*\*.+?\*\*|\[\[.+?\]\]|\(\(.+?\)\)|~~.+?~~|\\n|\n)/g);
  return parts.map((x, i) => {
    if (x === '\\n' || x === '\n') return <br key={i} />;
    if (/^\*\*.+\*\*$/.test(x)) return <Em key={i}>{x.slice(2, -2)}</Em>;
    if (/^\[\[.+\]\]$/.test(x)) return <Em key={i} color={C.teal}>{x.slice(2, -2)}</Em>;
    if (/^\(\(.+\)\)$/.test(x)) return <Em key={i} color={C.coral}>{x.slice(2, -2)}</Em>;
    if (/^~~.+~~$/.test(x)) return <span key={i} style={{textDecoration: 'line-through', textDecorationColor: C.coral}}>{x.slice(2, -2)}</span>;
    return x;
  });
};
const col = (c: string | undefined, dflt: string, C: Theme = PHOTO_THEME) => {
  if (!c) return dflt;
  return (C as any)[c] ?? c;
};
const zoomOf = (l: PhotoLayer): [number, number] => l.zoom ?? (l.move === 'out' ? [1.1, 1.0] : l.move === 'still' ? [1.04, 1.06] : [1.0, 1.12]);
const DEFAULT_BOX: BoxSpec = {x: 90, y: 120, w: 900};
const CENTER_BOX: BoxSpec = {x: 90, y: 110, w: 1740, align: 'center'};
// 文字母版：每期在 style.layout 里选一个，场景里不写 box / grad 时按它来
const LAYOUTS: Record<NonNullable<Style['layout']>, {box: BoxSpec; grad: Grad}> = {
  topleft: {box: DEFAULT_BOX, grad: 'left'},
  bottom: {box: {x: 160, w: 1600, bottom: 150, align: 'center'}, grad: 'bottom'},
  right: {box: {x: 960, y: 120, w: 870, align: 'right'}, grad: 'right'},
  center: {box: {x: 90, y: 300, w: 1740, align: 'center'}, grad: 'all'},
};
const GRAIN_SVG = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='300' height='300' filter='url(%23n)'/></svg>\")";
const Grain: React.FC = () => <AbsoluteFill style={{opacity: 0.12, mixBlendMode: 'overlay', backgroundImage: GRAIN_SVG, backgroundSize: '300px 300px'}} />;
const DEFAULT_SFX: Partial<Record<Item['type'], SfxName>> = {h: 'pop', t: 'pop', tag: 'pop', stamp: 'stamp', big: 'ding', count: 'ding', panel: 'page', compare: 'swipe', nums: 'drop', clock: 'click'};
const DEFAULT_DIR = (b: BoxSpec): Dir => (b.align === 'center' ? 'up' : b.right !== undefined || (b.x ?? 0) > 960 ? 'right' : 'left');

// 从上方落下的一个数字
const NumCell: React.FC<{at: number; label?: string; value: string; size: number; color: string}> = ({at: a, label, value, size, color}) => {
  const sp = useSpringAt(a, {damping: 12, stiffness: 140});
  return (
    <div style={{opacity: sp, transform: `translateY(${(1 - sp) * -120}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {label && <T size={30}>{label}</T>}
      <H size={size} color={color} style={{lineHeight: 1, fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0}}>{value}</H>
    </div>
  );
};

// ---------- 单个元素 ----------
const ItemView: React.FC<{it: Item; p: P; box: BoxSpec; custom: CustomMap; spec: SceneSpec}> = ({it, p, box, custom, spec}) => {
  const C = useC();
  const f = useCurrentFrame();
  const step = it.at ?? 0;
  if (p.step < step) return null;
  if (it.until !== undefined && p.step >= it.until) return null;
  const a = at(p, step) + (it.delay ?? 0);
  const dir = it.dir ?? DEFAULT_DIR(box);
  const align = box.align ?? 'left';
  const sfxName = it.sfx === null ? null : it.sfx ?? DEFAULT_SFX[it.type] ?? null;
  // 场景第一帧出现的元素不响（场景切换已经有声音）
  const snd = sfxName && a > 2 ? <Sfx at={a} name={sfxName} vol={it.vol ?? (sfxName === 'impact' ? 0.45 : 0.3)} /> : null;
  const fly = (node: React.ReactNode, dist = 120) => <>{snd}<FlyIn at={a} dir={dir} dist={dist}>{node}</FlyIn></>;
  // 元素级换字体：font: "song" / "kai" / "num" / "sans" / "title"
  const ff = it.font ? {fontFamily: FONTS[it.font]} : {};
  // 对白：稿子里已经带了引号就先去掉，Quote 自己加金色引号
  const unq = (t: string) => t.replace(/^[“"「『']+|[”"」』']+$/g, '');
  const NUM = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: 0};

  switch (it.type) {
    case 'h':
      if (it.quote) return fly(<Quote size={it.size ?? 52} color={col(it.color, C.white, C)} align={align}>{rich(unq(it.text), C)}</Quote>);
      return fly(
      <div style={{position: 'relative', display: 'inline-block'}}>
        <H size={it.size ?? 66} color={col(it.color, C.white, C)} align={align} style={ff}>{rich(it.text, C)}</H>
        {it.strikeAt !== undefined && p.step >= it.strikeAt && <><Sfx at={at(p, it.strikeAt)} name="swipe" vol={0.45} /><StrikeLine at={at(p, it.strikeAt)} /></>}
      </div>);
    case 't':
      if (it.quote) return fly(<Quote size={it.size ?? 44} color={col(it.color, C.dim, C)} align={align}>{rich(unq(it.text), C)}</Quote>, 100);
      return fly(<T size={it.size ?? 38} color={col(it.color, C.dim, C)} style={{textAlign: align, letterSpacing: 3, ...ff}}>{rich(it.text, C)}</T>, 100);
    case 'tag': return fly(<Tag size={it.size ?? 42} dark={it.dark} color={col(it.color, C.gold, C)} style={it.quote ? {fontFamily: FONTS.kai, fontWeight: 500} : ff}>{it.quote ? <>“{rich(unq(it.text), C)}”</> : rich(it.text, C)}</Tag>, 140);
    case 'stamp': return <>{snd}<Stamp at={a} size={it.size ?? 60} rotate={it.rotate ?? -5} color={col(it.color, C.coral, C)}>{it.text}</Stamp></>;
    // 大字：纯数字走数黑体，汉字走得意黑；定义卡大词用 font: "song"
    case 'big': {
      const numeric = !it.font && /^[\d\s.,%+\-≈×÷→¥$€亿万千百倍]+$/.test(it.text.replace(/\*\*|\[\[|\]\]|\(\(|\)\)|~~/g, ''));
      return fly(<H size={it.size ?? 150} color={col(it.color, C.gold, C)} align={align} style={{lineHeight: 1, ...(numeric ? NUM : ff)}}>{rich(it.text, C)}</H>, 160);
    }
    case 'count': {
      const dur = it.dur ?? 36;
      return fly(
        <div style={{display: 'flex', alignItems: 'baseline', gap: 28, justifyContent: align === 'center' ? 'center' : undefined}}>
          {it.label && <T size={40}>{it.label}</T>}
          {it.before && <><H size={(it.size ?? 150) * 0.7} color={C.dim} style={{lineHeight: 1, ...NUM}}>{it.before}</H><H size={(it.size ?? 150) * 0.5} color={C.dim}>→</H></>}
          <H size={it.size ?? 150} color={col(it.color, C.gold, C)} style={{lineHeight: 1, ...NUM}}>{it.prefix}<CountUp from={it.from ?? 0} to={it.to} at={a + 6} dur={dur} format={(n) => String(n)} />{it.suffix}</H>
        </div>);
    }
    case 'nums': return (
      <div style={{display: 'flex', gap: 40, alignItems: 'flex-end', justifyContent: align === 'center' ? 'center' : undefined}}>
        {it.items.map((n, i) => (
          <React.Fragment key={i}>
            {sfxName && <Sfx at={a + i * 14} name={sfxName} vol={0.25} />}
            <NumCell at={a + i * 14} label={n.label} value={n.value} size={(it.size ?? 120) - i * 8} color={col(n.color, C.white, C)} />
            {i < it.items.length - 1 && <H size={60} color={C.dim} style={{paddingBottom: 14}}>{it.arrow ?? '→'}</H>}
          </React.Fragment>
        ))}
      </div>);
    case 'panel': return fly(
      <Panel style={{padding: '24px 36px'}}>
        {it.label && <T size={34} color={C.gold} style={{letterSpacing: 4}}>{it.label}</T>}
        {it.lines.map((l, i) => <H key={i} size={it.size ?? 50} color={i ? C.dim : C.white} align={align}>{rich(l, C)}</H>)}
      </Panel>);
    case 'compare': return fly(
      <div style={{display: 'flex', gap: 80, alignItems: 'center', justifyContent: 'center'}}>
        <H size={it.size ?? 72} align="center">{rich(it.left, C)}</H>
        <H size={(it.size ?? 72) * 1.5} color={C.dim}>{it.mid ?? 'vs'}</H>
        <H size={it.size ?? 72} align="center">{rich(it.right, C)}</H>
      </div>, 140);
    case 'clock': return <Clock at={a} h={it.h} m0={it.m} m1={it.to} dur={it.dur} />;
    case 'spot': { const [x, y] = regionXY({x: it.x, y: it.y, at: it.region}); return <Spot x={x} y={y} r={it.r} at={a} strength={it.strength} />; }
    case 'rings': { const [x, y] = regionXY({x: it.x, y: it.y, at: it.region}); return <Rings x={x} y={y} at={a} n={it.n} max={it.max} color={it.color ? col(it.color, C.gold, C) : undefined} />; }
    case 'sfx': return <Sfx at={a} name={it.name} variant={it.variant} vol={it.vol} dur={it.dur} endAt={it.endAt} fade={it.fade} />;
    case 'custom': {
      const Comp = custom[it.name];
      if (!Comp) return <div style={{position: 'absolute', left: 100, top: 500, color: 'red', fontSize: 40}}>custom "{it.name}" 不存在</div>;
      return <Comp {...p} spec={spec} />;
    }
  }
  return null;
};

const OVERLAY = new Set(['spot', 'rings', 'sfx', 'custom', 'stamp-abs']);

// ---------- 场景 ----------
const makeScene = (spec: SceneSpec, ep: EpisodeSpec, custom: CustomMap): React.FC<P> => {
  const src = (code: string) => staticFile(`${ep.photos}/${code}.jpg`);
  const st = ep.style ?? {};
  const L = LAYOUTS[st.layout ?? 'topleft'];
  const look = (
    <>
      {st.grain && <Grain />}
      {st.letterbox && <><div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 130, background: '#000'}} /><div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 130, background: '#000'}} /></>}
    </>
  );
  const SceneView: React.FC<P> = (p) => {
    const C = useC();
    const f = useCurrentFrame();
    const items = spec.items ?? [];

    if (spec.type === 'chapter') {
      return (
        <AbsoluteFill>
          <Sfx at={0} name="flip" vol={0.4} />
          <Photo src={src(spec.photo || ep.chapterPhoto)} dur={p.dur} zoom={[1.05, 1.1]} blur={14} dim={0.55} tint={st.tint} tintOpacity={st.tintOpacity} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
            <FlyIn at={0} dir="down" dist={80}><Tag size={40}>第 {p.chapter} 章</Tag></FlyIn>
            <FlyIn at={6} dir="up" dist={120}><H size={110} align="center">{p.title}</H></FlyIn>
            <div style={{width: interpolate(f, [10, 40], [0, 420], clamp), height: 6, background: C.gold, borderRadius: 3}} />
          </AbsoluteFill>
          {look}
        </AbsoluteFill>
      );
    }

    const enterSfx = spec.enterSfx === null ? null : spec.enterSfx ?? 'pop';
    const swap = spec.swap ? interpolate(f, [at(p, spec.swap.at) + (spec.swap.delay ?? 0), at(p, spec.swap.at) + (spec.swap.delay ?? 0) + 24], [0, 1], clamp) : 0;
    const boxes: Record<string, BoxSpec> = {main: spec.center ? CENTER_BOX : regionBox(spec.box, L.box)};
    Object.entries(spec.boxes ?? {}).forEach(([k, v]) => { boxes[k] = regionBox(v, DEFAULT_BOX); });
    const grad: Grad = spec.grad ?? (spec.center ? 'none' : L.grad);
    let splitL = 0, splitR = 0;
    if (spec.split) {
      const [sl, sr] = spec.split.at;
      splitL = p.step >= sl ? interpolate(f, [at(p, sl), at(p, sl) + 26], [0, 1], {...clamp, easing: ease}) : 0;
      splitR = p.step >= sr ? interpolate(f, [at(p, sr), at(p, sr) + 26], [0, 1], {...clamp, easing: ease}) : 0;
      boxes.L = boxes.L ?? {x: 70, y: 100, w: 820};
      boxes.R = boxes.R ?? {x: 1030, y: 100, w: 820};
    }
    const boxOpacity = (k: string) => (k === 'L' ? splitL : k === 'R' ? splitR : 1);

    const grouped: Record<string, Item[]> = {};
    const overlays: Item[] = [];
    items.forEach((it) => {
      if (OVERLAY.has(it.type)) overlays.push(it);
      else (grouped[it.box ?? 'main'] = grouped[it.box ?? 'main'] ?? []).push(it);
    });

    const Half: React.FC<{code: string; side: 'left' | 'right'; k: number; pos: string; start: number}> = ({code, side, k, pos, start}) => (
      <div style={{position: 'absolute', top: 0, bottom: 0, [side]: 0, width: 960, overflow: 'hidden', transform: `translateX(${(side === 'left' ? -1 : 1) * (1 - k) * 960}px)`, borderRight: side === 'left' ? `3px solid ${C.bg}` : undefined}}>
        <Img src={src(code)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${1.02 + 0.08 * Math.max(0, f - start) / 700})`}} />
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #0B0907D9 0%, #0B090766 35%, #0B090700 60%)'}} />
      </div>
    );

    return (
      <AbsoluteFill>
        {enterSfx && <Sfx at={0} name={enterSfx} vol={0.3} />}
        {spec.ambience && <Sfx at={0} name="ambience" variant={typeof spec.ambience === 'string' ? spec.ambience : undefined} dur={p.dur / 30} fade={0.8} vol={0.2} />}
        <Photo src={src(spec.photo)} dur={p.dur} zoom={zoomOf(spec)} origin={regionOrigin(spec.origin)} grad={grad} dim={spec.dim} blur={spec.blur} pos={spec.pos} opacity={1 - swap} tint={st.tint} tintOpacity={st.tintOpacity} />
        {spec.swap && p.step >= spec.swap.at && (
          <>
            <Sfx at={at(p, spec.swap.at) + (spec.swap.delay ?? 0)} name="whoosh" vol={0.3} />
            <Photo src={src(spec.swap.photo)} dur={p.dur} zoom={zoomOf(spec.swap)} origin={regionOrigin(spec.swap.origin)} grad={spec.swap.grad ?? grad} dim={spec.swap.dim} blur={spec.swap.blur} pos={spec.swap.pos} opacity={swap} tint={st.tint} tintOpacity={st.tintOpacity} />
          </>
        )}
        {spec.split && p.step >= spec.split.at[0] && <><Sfx at={at(p, spec.split.at[0])} name="whoosh" vol={0.35} /><Half code={spec.split.photos[0]} side="left" k={splitL} pos={spec.split.pos?.[0] ?? 'left center'} start={at(p, spec.split.at[0])} /></>}
        {spec.split && p.step >= spec.split.at[1] && <><Sfx at={at(p, spec.split.at[1])} name="whoosh" vol={0.35} /><Half code={spec.split.photos[1]} side="right" k={splitR} pos={spec.split.pos?.[1] ?? 'right center'} start={at(p, spec.split.at[1])} /></>}
        {overlays.map((it, i) => <ItemView key={'o' + i} it={it} p={p} box={boxes.main} custom={custom} spec={spec} />)}
        {spec.type === 'series' && <SeriesCard p={p} spec={spec} ep={ep} />}
        {Object.entries(grouped).map(([k, list]) => {
          const b = boxes[k] ?? boxes.main;
          const center = b.align === 'center';
          return (
            <Box key={k} x={b.x} y={b.bottom === undefined ? b.y : undefined} w={b.w} right={b.right}
              style={{bottom: b.bottom, alignItems: center ? 'center' : b.align === 'right' ? 'flex-end' : 'flex-start', opacity: boxOpacity(k)}}>
              {list.map((it, i) => <ItemView key={i} it={it} p={p} box={b} custom={custom} spec={spec} />)}
            </Box>
          );
        })}
        {look}
      </AbsoluteFill>
    );
  };
  return SceneView;
};

// 栏目卡：栏目名 → 序号滚到本期 + 标题 → 一句话
const SeriesCard: React.FC<{p: P; spec: SceneSpec; ep: EpisodeSpec}> = ({p, spec, ep}) => {
  const C = useC();
  const f = useCurrentFrame();
  const n = spec.num ?? parseInt(ep.badge, 10);
  const s1 = at(p, 1), s2 = p.steps.length > 2 ? at(p, 2) : s1 + 45;  // 只有两句时 tagline 晚 1.5 秒出
  const num = Math.min(n, Math.max(1, Math.floor(interpolate(f, [s1, s1 + 18], [1, n + 0.99], clamp))));
  const b = regionBox(spec.box, DEFAULT_BOX);
  return (
    <>
      <Sfx at={0} name="flip" vol={0.4} />
      {p.step >= 1 && <><Sfx at={s1} name="tick" dur={0.65} vol={0.4} /><Sfx at={s1 + 20} name="ding" vol={0.3} /></>}
      {p.step >= 2 && spec.tagline && <Sfx at={s2} name="cash" vol={0.3} />}
      <Box x={b.x} y={b.y} w={b.w}>
        <FlyIn at={0} dir="left" dist={120}>
          {spec.label
            ? <T size={40} style={{letterSpacing: 6}}>{spec.label}</T>
            : <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
                <span style={{fontFamily: FONTS.kai, fontSize: 46, color: C.white, letterSpacing: 3, textShadow: SHADOW}}>像素呼吸</span>
                <span style={{fontFamily: FONTS.title, fontSize: 40, color: C.dim, letterSpacing: 4, textShadow: SHADOW}}>· {ep.series ?? '100 个经济学原理'}</span>
              </div>}
        </FlyIn>
        {p.step >= 1 && (
          <FlyIn at={s1} dir="up" dist={160}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 28}}>
              <H size={230} color={C.gold} style={{lineHeight: 1, fontFamily: FONTS.num, letterSpacing: 0}}>{String(num).padStart(2, '0')}</H>
              <H size={110}>{spec.title}</H>
            </div>
          </FlyIn>
        )}
        {p.step >= 2 && spec.tagline && <FlyIn at={s2} dir="up" dist={100}><H size={56} color={C.dim}>{rich(spec.tagline, C)}</H></FlyIn>}
      </Box>
    </>
  );
};

// ---------- 装配：photo.json → Episode 需要的 scenes / enter / manual ----------
export const buildPhotoEpisode = (ep: EpisodeSpec, custom: CustomMap = {}) => {
  const scenes: Record<string, React.FC<any>> = {};
  ep.scenes.forEach((s) => { scenes[s.id] = makeScene(s, ep, custom); });
  if (!scenes.chapter) scenes.chapter = makeScene({id: 'chapter', type: 'chapter', photo: ep.chapterPhoto}, ep, custom);
  const st = ep.style ?? {};
  const enter = Object.fromEntries(Object.keys(scenes).map((k) => [k, k === 'chapter' ? 'flip' : st.enter ?? 'blur'])) as Record<string, Enter>;
  const tf = st.titleFont ? TITLE_FONTS[st.titleFont] ?? st.titleFont : undefined;
  const theme: Theme = {...PHOTO_THEME, ...(st.theme ?? {}), ...(tf ? {title: tf} : {})};
  return {scenes, theme, fx: {enter, manual: Object.keys(scenes)}};
};

export {TITLE_FONT, SHADOW};
