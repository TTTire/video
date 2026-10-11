// 通用照片场景引擎：每期只写一份 photo.json（场景 → 照片、推拉、每句出什么字、字放哪），这里负责渲染。
// 特殊图表（柱状图、表格）写在 src/epN/custom.tsx，在 photo.json 里用 {"type":"custom","name":"..."} 引用。
// 字段说明见 工具/video-broll-maker/references/photo-json.md
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {CountUp, FlyIn, Sfx, SfxName, Stamp, StrikeLine, useSpringAt} from '../fx';
import {at, Box, Clock, Em, Grad, H, P, Panel, Photo, PHOTO_THEME, Rings, SHADOW, Spot, T, Tag, TITLE_FONT, clamp, ease} from './kit';

// ---------- 类型 ----------
type Dir = 'left' | 'right' | 'up' | 'down';
export type BoxSpec = {x?: number; y?: number; w?: number; right?: number; bottom?: number; align?: 'left' | 'center' | 'right'};
type Base = {at?: number; delay?: number; until?: number; dir?: Dir; box?: string; sfx?: SfxName | null; vol?: number};
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
  | {type: 'spot'; x: number; y: number; r?: number; strength?: number}
  | {type: 'rings'; x: number; y: number; n?: number; max?: number; color?: string}
  | {type: 'sfx'; name: SfxName; variant?: string; dur?: number; endAt?: number; fade?: number}
  | {type: 'custom'; name: string}
);
export type PhotoLayer = {photo: string; zoom?: [number, number]; move?: 'in' | 'out' | 'still'; origin?: string; grad?: Grad; dim?: number; blur?: number; pos?: string};
export type SceneSpec = PhotoLayer & {
  id: string; name?: string;
  type?: 'photo' | 'chapter' | 'series';
  swap?: PhotoLayer & {at: number; delay?: number};
  split?: {at: [number, number]; photos: [string, string]; pos?: [string, string]};
  box?: BoxSpec; boxes?: Record<string, BoxSpec>;
  center?: boolean; ambience?: boolean | string; enterSfx?: SfxName | null;
  items?: Item[];
  // type: 'series'
  num?: number; title?: string; tagline?: string; label?: string;
};
export type EpisodeSpec = {
  ep: string; badge: string; photos: string; chapterPhoto: string;
  series?: string; scenes: SceneSpec[];
};
export type CustomMap = Record<string, React.FC<P & {spec: SceneSpec}>>;

// ---------- 文本标记：**金** [[青]] ((红)) ~~划掉~~ \n 换行 ----------
export const rich = (s: string): React.ReactNode => {
  const C = PHOTO_THEME;
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
const col = (c: string | undefined, dflt: string) => {
  const C = PHOTO_THEME as any;
  if (!c) return dflt;
  return C[c] ?? c;
};
const zoomOf = (l: PhotoLayer): [number, number] => l.zoom ?? (l.move === 'out' ? [1.1, 1.0] : l.move === 'still' ? [1.04, 1.06] : [1.0, 1.12]);
const DEFAULT_BOX: BoxSpec = {x: 90, y: 120, w: 900};
const CENTER_BOX: BoxSpec = {x: 90, y: 110, w: 1740, align: 'center'};
const DEFAULT_SFX: Partial<Record<Item['type'], SfxName>> = {h: 'pop', t: 'pop', tag: 'pop', stamp: 'stamp', big: 'ding', count: 'ding', panel: 'page', compare: 'swipe', nums: 'drop', clock: 'click'};
const DEFAULT_DIR = (b: BoxSpec): Dir => (b.align === 'center' ? 'up' : b.right !== undefined || (b.x ?? 0) > 960 ? 'right' : 'left');

// 从上方落下的一个数字
const NumCell: React.FC<{at: number; label?: string; value: string; size: number; color: string}> = ({at: a, label, value, size, color}) => {
  const sp = useSpringAt(a, {damping: 12, stiffness: 140});
  return (
    <div style={{opacity: sp, transform: `translateY(${(1 - sp) * -120}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      {label && <T size={30}>{label}</T>}
      <H size={size} color={color} style={{lineHeight: 1}}>{value}</H>
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

  switch (it.type) {
    case 'h': return fly(
      <div style={{position: 'relative', display: 'inline-block'}}>
        <H size={it.size ?? 66} color={col(it.color, C.white)} align={align}>{rich(it.text)}</H>
        {it.strikeAt !== undefined && p.step >= it.strikeAt && <><Sfx at={at(p, it.strikeAt)} name="swipe" vol={0.45} /><StrikeLine at={at(p, it.strikeAt)} /></>}
      </div>);
    case 't': return fly(<T size={it.size ?? 38} color={col(it.color, C.dim)} style={{textAlign: align, letterSpacing: 3}}>{rich(it.text)}</T>, 100);
    case 'tag': return fly(<Tag size={it.size ?? 42} dark={it.dark} color={col(it.color, C.gold)}>{rich(it.text)}</Tag>, 140);
    case 'stamp': return <>{snd}<Stamp at={a} size={it.size ?? 60} rotate={it.rotate ?? -5} color={col(it.color, C.coral)}>{it.text}</Stamp></>;
    case 'big': return fly(<H size={it.size ?? 150} color={col(it.color, C.gold)} align={align} style={{lineHeight: 1}}>{rich(it.text)}</H>, 160);
    case 'count': {
      const dur = it.dur ?? 36;
      return fly(
        <div style={{display: 'flex', alignItems: 'baseline', gap: 28, justifyContent: align === 'center' ? 'center' : undefined}}>
          {it.label && <T size={40}>{it.label}</T>}
          {it.before && <><H size={(it.size ?? 150) * 0.7} color={C.dim} style={{lineHeight: 1}}>{it.before}</H><H size={(it.size ?? 150) * 0.5} color={C.dim}>→</H></>}
          <H size={it.size ?? 150} color={col(it.color, C.gold)} style={{lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>{it.prefix}<CountUp from={it.from ?? 0} to={it.to} at={a + 6} dur={dur} format={(n) => String(n)} />{it.suffix}</H>
        </div>);
    }
    case 'nums': return (
      <div style={{display: 'flex', gap: 40, alignItems: 'flex-end', justifyContent: align === 'center' ? 'center' : undefined}}>
        {it.items.map((n, i) => (
          <React.Fragment key={i}>
            {sfxName && <Sfx at={a + i * 14} name={sfxName} vol={0.25} />}
            <NumCell at={a + i * 14} label={n.label} value={n.value} size={(it.size ?? 120) - i * 8} color={col(n.color, C.white)} />
            {i < it.items.length - 1 && <H size={60} color={C.dim} style={{paddingBottom: 14}}>{it.arrow ?? '→'}</H>}
          </React.Fragment>
        ))}
      </div>);
    case 'panel': return fly(
      <Panel style={{padding: '24px 36px'}}>
        {it.label && <T size={34} color={C.gold} style={{letterSpacing: 4}}>{it.label}</T>}
        {it.lines.map((l, i) => <H key={i} size={it.size ?? 50} color={i ? C.dim : C.white} align={align}>{rich(l)}</H>)}
      </Panel>);
    case 'compare': return fly(
      <div style={{display: 'flex', gap: 80, alignItems: 'center', justifyContent: 'center'}}>
        <H size={it.size ?? 72} align="center">{rich(it.left)}</H>
        <H size={(it.size ?? 72) * 1.5} color={C.dim}>{it.mid ?? 'vs'}</H>
        <H size={it.size ?? 72} align="center">{rich(it.right)}</H>
      </div>, 140);
    case 'clock': return <Clock at={a} h={it.h} m0={it.m} m1={it.to} dur={it.dur} />;
    case 'spot': return <Spot x={it.x} y={it.y} r={it.r} at={a} strength={it.strength} />;
    case 'rings': return <Rings x={it.x} y={it.y} at={a} n={it.n} max={it.max} color={it.color ? col(it.color, C.gold) : undefined} />;
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
  const SceneView: React.FC<P> = (p) => {
    const C = useC();
    const f = useCurrentFrame();
    const items = spec.items ?? [];

    if (spec.type === 'chapter') {
      return (
        <AbsoluteFill>
          <Sfx at={0} name="flip" vol={0.4} />
          <Photo src={src(spec.photo || ep.chapterPhoto)} dur={p.dur} zoom={[1.05, 1.1]} blur={14} dim={0.55} />
          <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30}}>
            <FlyIn at={0} dir="down" dist={80}><Tag size={40}>第 {p.chapter} 章</Tag></FlyIn>
            <FlyIn at={6} dir="up" dist={120}><H size={110} align="center">{p.title}</H></FlyIn>
            <div style={{width: interpolate(f, [10, 40], [0, 420], clamp), height: 6, background: C.gold, borderRadius: 3}} />
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }

    const enterSfx = spec.enterSfx === null ? null : spec.enterSfx ?? 'pop';
    const swap = spec.swap ? interpolate(f, [at(p, spec.swap.at) + (spec.swap.delay ?? 0), at(p, spec.swap.at) + (spec.swap.delay ?? 0) + 24], [0, 1], clamp) : 0;
    const boxes: Record<string, BoxSpec> = {main: spec.center ? CENTER_BOX : {...DEFAULT_BOX, ...spec.box}, ...(spec.boxes ?? {})};
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
        <Photo src={src(spec.photo)} dur={p.dur} zoom={zoomOf(spec)} origin={spec.origin ?? '50% 50%'} grad={spec.grad ?? 'none'} dim={spec.dim} blur={spec.blur} pos={spec.pos} opacity={1 - swap} />
        {spec.swap && p.step >= spec.swap.at && (
          <>
            <Sfx at={at(p, spec.swap.at) + (spec.swap.delay ?? 0)} name="whoosh" vol={0.3} />
            <Photo src={src(spec.swap.photo)} dur={p.dur} zoom={zoomOf(spec.swap)} origin={spec.swap.origin ?? '50% 50%'} grad={spec.swap.grad ?? spec.grad ?? 'none'} dim={spec.swap.dim} blur={spec.swap.blur} pos={spec.swap.pos} opacity={swap} />
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
  const b = {...DEFAULT_BOX, ...spec.box};
  return (
    <>
      <Sfx at={0} name="flip" vol={0.4} />
      {p.step >= 1 && <><Sfx at={s1} name="tick" dur={0.65} vol={0.4} /><Sfx at={s1 + 20} name="ding" vol={0.3} /></>}
      {p.step >= 2 && spec.tagline && <Sfx at={s2} name="cash" vol={0.3} />}
      <Box x={b.x} y={b.y} w={b.w}>
        <FlyIn at={0} dir="left" dist={120}><T size={40} style={{letterSpacing: 6}}>{spec.label ?? `像素呼吸 ·《${ep.series ?? '100 个经济学原理'}》`}</T></FlyIn>
        {p.step >= 1 && (
          <FlyIn at={s1} dir="up" dist={160}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 28}}>
              <H size={230} color={C.gold} style={{lineHeight: 1}}>{String(num).padStart(2, '0')}</H>
              <H size={110}>{spec.title}</H>
            </div>
          </FlyIn>
        )}
        {p.step >= 2 && spec.tagline && <FlyIn at={s2} dir="up" dist={100}><H size={56} color={C.dim}>{rich(spec.tagline)}</H></FlyIn>}
      </Box>
    </>
  );
};

// ---------- 装配：photo.json → Episode 需要的 scenes / enter / manual ----------
export const buildPhotoEpisode = (ep: EpisodeSpec, custom: CustomMap = {}) => {
  const scenes: Record<string, React.FC<any>> = {};
  ep.scenes.forEach((s) => { scenes[s.id] = makeScene(s, ep, custom); });
  if (!scenes.chapter) scenes.chapter = makeScene({id: 'chapter', type: 'chapter', photo: ep.chapterPhoto}, ep, custom);
  const enter = Object.fromEntries(Object.keys(scenes).map((k) => [k, k === 'chapter' ? 'flip' : 'blur'])) as Record<string, 'blur' | 'flip'>;
  return {scenes, theme: PHOTO_THEME, fx: {enter, manual: Object.keys(scenes)}};
};

export {TITLE_FONT, SHADOW};
