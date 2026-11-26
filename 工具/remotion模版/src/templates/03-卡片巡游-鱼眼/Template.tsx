import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {curve, track} from '../../shared/curve';
import {isWide} from '../../shared/textParts';
import {HANS, SANS} from '../../shared/fonts';
import {Grain} from '../../shared/Grain';
import {Lens} from '../../shared/Lens';
import {LensSpec, lensProject} from '../../shared/lensMath';
import {BarsCard, DonutCard, ExpenseCard, InvoiceCard, ListCard} from './Cards';
import {CARDS, CardId, DRIFT, SIZE, TITLE_POS, pillsFor, poseAt, tablesFor, timesFor} from './layout';
import {TemplateProps} from './schema';
import {poseMatrix, project, toCss} from './space';

const W = 1920;
const H = 1080;
/** 镜头中心。主角落定的位置就在它下面，所以主角的边只弯一点点，越往四面越弯（参考里也是主角在画面正中附近最平）。 */
const CENTER: [number, number] = [960, 585];

const POP = 7; // 标题里一个词从冒头到落定用几帧（参考是 60fps 的 10 帧）
const GAP = 4; // 相邻两个词隔几帧（参考是 8 帧）
const OUT = 5; // 标题退场用几帧
const SHUTTER = 0.5; // 快门开半帧：动态模糊拖多长按它算
const BLUR_STEP = 6; // 动态模糊里相邻两个样之间卡片挪多少像素。太大了能看出一个个分开的重影
const BLUR_GAP = 3; // 相邻两个样隔这么远以内不用再补模糊
const MAX_SAMPLES = 10; // 样再多出片就太慢

const UI = `${SANS}, ${HANS}`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const popEase = Easing.out(Easing.back(1.7));
const outEase = Easing.in(Easing.cubic);

type Word = {text: string; o: number; s: number; r: number; b: number; flash: number};
type Pt = [number, number];
type CardView = {id: CardId; m: number[][]; pose: ReturnType<typeof poseAt>; c: Pt; corner: Pt; show: boolean};
type PillView = {x: number; y: number; w: number; h: number; rot: number; blur: number};
type Title = {x: number; y: number; rise: number; size: number; lines: (Word | null)[][]};
export type View = {cards: CardView[]; pills: PillView[]; titles: Title[]; probes: Pt[]};

const lensFor = (props: TemplateProps): LensSpec => ({w: W, h: H, strength: props.lens, center: CENTER});

/** 给一组参数，返回“某一刻 t 画面该是什么样”的函数。t 可以带小数：算动态模糊时要在两帧之间再取几个样。 */
export const makeView = (props: TemplateProps): ((t: number) => View) => {
  const T = timesFor(props);
  const tables = tablesFor(T);
  const pills = pillsFor(T);
  const toScreen = lensProject(lensFor(props));
  const driftX = curve(DRIFT.x);
  const driftY = curve(DRIFT.y);
  // 每一站的标题切成行、再切成词（空格分开），一个词一个词弹出
  const words = props.stations.map((s) => s.title.split('\n').map((line) => line.trim().split(/\s+/).filter(Boolean)));

  return (t) => {
    // 镜头的漂移到第四站之前就停住，之后画面完全不动
    const drift = clamp01((T.a[3] - 4 - t) / 8);
    const dx = driftX(Math.min(t, 180)) * drift;
    const dy = driftY(Math.min(t, 180)) * drift;

    // 画面外这么远以内的内容才可能被镜头拉进来，再远的卡片这一帧不用画
    const margin = props.lens + 80;
    const cards: CardView[] = CARDS.map((id) => {
      const pose = poseAt(tables[id], t, dx, dy);
      const [w, h] = SIZE[id];
      const m = poseMatrix(pose, w, h);
      const [c0, c1, c2, c3] = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => project(m, x, y));
      const pad = pose.blur * pose.s * 2 + 40;
      const xs = [c0[0], c1[0], c2[0], c3[0]];
      const ys = [c0[1], c1[1], c2[1], c3[1]];
      const show = Math.max(...xs) + pad > -margin && Math.min(...xs) - pad < W + margin && Math.max(...ys) + pad > -margin && Math.min(...ys) - pad < H + margin;
      return {id, m, pose, c: toScreen(...project(m, w / 2, h / 2)), corner: toScreen(...c0), show};
    });

    const titles: Title[] = props.stations.map((s, k) => {
      const out = k < 3 ? outEase(clamp01((t - T.u[k]) / OUT)) : 0; // 退场的进度
      const lines = words[k].map((line, li) =>
        line.map((word, wi) => {
          const age = t - (T.a[k] + GAP * (li + wi)); // 这个词冒出来多久了
          if (age < 0) {
            return null;
          }
          const e = popEase(clamp01(age / POP));
          return {
            text: word,
            o: clamp01(age / 2) * (1 - out),
            s: 1.9 - 0.9 * e + 0.45 * out, // 从很大缩到位，略微缩过头再弹回来
            r: -18 * (1 - Math.min(1, e)), // 带着一点斜度转正
            b: 18 * Math.pow(clamp01(1 - age / (POP * 0.75)), 1.3) + 16 * out,
            flash: clamp01(1 - age / POP), // 刚出来时外圈那层辉光特别大，然后收回去
          };
        })
      );
      const pos = TITLE_POS[k] ?? {at: [W / 2, 205], maxW: 1240};
      // 标题最宽的一行按字数估出宽度（汉字一个字算一个字号，拉丁字母算 0.6 个），超了就把整个标题缩小
      const widest = Math.max(0, ...words[k].map((line) => line.reduce((sum, word) => sum + Array.from(word).reduce((n, ch) => n + (isWide(ch) ? 1 : 0.6), 0) + 0.26, 0)));
      return {x: pos.at[0], y: pos.at[1], rise: -50 * out, size: Math.min(props.fontSize, pos.maxW / Math.max(widest, 0.01)), lines};
    });

    return {
      cards,
      pills: pills.map((p) => ({x: track(t, p.x) + dx, y: track(t, p.y) + dy, w: p.w, h: p.h, rot: p.rot, blur: p.blur})),
      titles,
      // 五张卡片各取中心和一个角；motion.mjs 要每一帧点的个数都一样
      probes: cards.flatMap((c) => [c.c, c.corner]),
    };
  };
};

/** 标题的辉光：里层贴着字，外层又大又软；flash 是刚弹出来时多出来的一圈。 */
const glow = (flash: number, color: string): string =>
  `0 0 ${16 + 30 * flash}px ${color}, 0 0 ${54 + 90 * flash}px rgba(170, 255, 80, ${0.32 + 0.5 * flash}), 0 10px 34px rgba(0, 0, 0, 0.3)`;

/** 一张卡片此刻在画面上的样子：不动的卡片直接用；动得快的卡片在前后半帧里各取一份，叠起来就是它的动态模糊。 */
type Snap = {card: CardView; blur: number; opacity: number};

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const view = useMemo(() => makeView(props), [props]);
  const now = view(frame);

  // 每张卡片在整个快门时间里挪了多远（画面上的像素）：按每 BLUR_STEP 像素一个样来算这张卡要叠几份
  const open = view(frame - SHUTTER / 2);
  const close = view(frame + SHUTTER / 2);
  const run = open.cards.map((c, j) => Math.hypot(close.cards[j].c[0] - c.c[0], close.cards[j].c[1] - c.c[1]));

  // 动态模糊只给动得快的那几张卡片叠样；不动的卡片、光点、标题只画一遍（换场时其实只有一进一出两张卡在动，
  // 整层一起叠的话每一份都要把所有东西重画一遍，白花好几倍时间）
  const stills: Snap[] = [];
  const movers: Snap[][] = [];
  now.cards.forEach((card, j) => {
    if (!card.show) {
      return;
    }
    const blurOf = (c: CardView) => c.pose.blur / c.pose.s;
    if (!props.motionBlur || run[j] < 3) {
      stills.push({card, blur: blurOf(card), opacity: 1});
      return;
    }
    const n = Math.min(MAX_SAMPLES, Math.ceil(run[j] / BLUR_STEP) + 1);
    const times = Array.from({length: n}, (_, i) => frame + (i / (n - 1) - 0.5) * SHUTTER);
    // 样不够密（相邻两个样之间卡片还隔着 BLUR_GAP 像素以上）时补一点模糊，把台阶揉平。卡片是先糊、再被摆到画面上的，所以除以放大倍数
    const step = Math.max(0, run[j] / (n - 1) - BLUR_GAP) / 1.8;
    movers.push(times.map((t) => ({card: view(t).cards[j], blur: blurOf(view(t).cards[j]) + step, opacity: 1 / (times.indexOf(t) + 1)})));
  });

  const body = (id: CardId) => {
    const c = props.cards;
    switch (id) {
      case 'bars':
        return <BarsCard d={c.bars} color={props.accent} />;
      case 'invoice':
        return <InvoiceCard d={c.invoice} />;
      case 'transactions':
        return <ListCard d={c.transactions} />;
      case 'donut':
        return <DonutCard d={c.donut} />;
      default:
        return <ExpenseCard d={c.expense} />;
    }
  };
  // 这是 filter 的，所以按卡片的姿势摆好、按它的远近糊
  const place = (snap: Snap, key?: React.Key) => (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: SIZE[snap.card.id][0],
        height: SIZE[snap.card.id][1],
        transformOrigin: '0 0',
        transform: toCss(snap.card.m),
        opacity: snap.opacity,
        filter: snap.blur > 0.3 ? `blur(${snap.blur.toFixed(2)}px)` : undefined,
      }}
    >
      {body(snap.card.id)}
    </div>
  );

  const glowOf = (wd: Word) => glow(wd.flash, props.titleColor);

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 1050px 700px at 960px 360px, #2b6121 0%, rgba(43, 97, 33, 0) 72%), radial-gradient(ellipse 150% 130% at 50% 55%, #123a1b 0%, #07220f 62%, #03130a 100%)',
      }}
    >
      <Lens spec={lensFor(props)}>
        {now.pills.map((p, j) => (
          <div
            key={j}
            style={{
              position: 'absolute',
              left: p.x - p.w / 2,
              top: p.y - p.h / 2,
              width: p.w,
              height: p.h,
              borderRadius: p.h / 2,
              background: '#dcff62',
              boxShadow: '0 0 40px 18px rgba(214, 255, 96, 0.7)',
              transform: `rotate(${p.rot}deg)`,
              filter: `blur(${p.blur}px)`,
            }}
          />
        ))}
        {now.titles.map((ti, k) => (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: ti.x - 800,
              top: ti.y,
              width: 1600,
              transform: `translateY(calc(-50% + ${ti.rise}px))`,
              textAlign: 'center',
              fontFamily: UI,
              fontWeight: 800,
              fontSize: ti.size,
              lineHeight: 1.1,
              color: props.titleColor,
              whiteSpace: 'pre',
            }}
          >
            {ti.lines.map((line, li) => (
              <div key={li}>
                {line.map((wd, wi) =>
                  wd ? (
                    <span
                      key={wi}
                      style={{
                        display: 'inline-block',
                        margin: '0 0.13em',
                        opacity: wd.o,
                        transform: `scale(${wd.s}) rotate(${wd.r}deg)`,
                        filter: wd.b > 0.3 ? `blur(${wd.b}px)` : undefined,
                        textShadow: glowOf(wd),
                      }}
                    >
                      {wd.text}
                    </span>
                  ) : null
                )}
              </div>
            ))}
          </div>
        ))}
        {stills.map((snap, i) => place(snap, `still-${i}`))}
        {/* 一个压一个地叠上去，叠完正好是这几个样的平均，也就是这张卡的动态模糊 */}
        {movers.map((samples, i) => samples.map((snap, k) => place(snap, `move-${i}-${k}`)))}
      </Lens>
      {/* 四角的暗角压在镜头外面，不和内容一起被拉弯 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 82% 88% at 50% 50%, rgba(0, 0, 0, 0) 48%, rgba(2, 14, 6, 0.6) 100%)'}} />
      <Grain frame={frame} opacity={0.1} />
    </AbsoluteFill>
  );
};
