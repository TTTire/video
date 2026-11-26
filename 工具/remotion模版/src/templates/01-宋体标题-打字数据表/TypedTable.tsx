import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../shared/Backdrop';
import {FONT_METRICS} from '../../shared/fontMetrics';
import {HANS, SANS, SERIF, SONG} from '../../shared/fonts';
import {Grain} from '../../shared/Grain';
import {Channel, RGB, SplitGroup, Typed, channelColor, dotPattern, isWide, splitRuns} from '../../shared/textParts';
import {
  floatOffset,
  settleProgress,
  tableSlide,
  TITLE_CREEP,
  TITLE_LAYOUT_FRAME,
  titleLift,
  wipeProgress,
} from './motion';
import {TitlePart, TypedTableProps} from './schema';

/* ---------- 取自参考视频的颜色。文字、黄块、线都走正片叠底，所以填的是压到约 205 的浅底上以后等于参考色的值 ---------- */
const INK: RGB = [41, 39, 49];
const RED = 'rgb(255, 38, 56)';
const YELLOW = 'rgb(255, 206, 6)';
const LINE = 'rgb(224, 224, 224)';
const DOT = 'rgb(150, 150, 150)';

const SPLIT = 1.5; // 红份左移、蓝份右移各多少像素，出蓝红色散

/* ---------- 版面：1920×1080。表格的坐标是表格停稳时（参考第 104 帧）的屏幕坐标 ---------- */
const TABLE = {
  headerX: 413, // 英文字身框左边，墨迹从 411 起
  headerLatinSize: 96,
  headerLatinTracking: 3.8, // 参考里的衬线体比 Liberation Serif 宽，用字距补
  headerCjkSize: 84,
  headerBaseline: 373,
  headerCjkGap: 17,
  nameX: 411, // 墨迹从 410 起
  valueX: 1246, // 墨迹从 1240 起
  rowSize: 100,
  rowBaseline0: 537.5,
  rowPitch: 141,
  lineFirstY: 567.5,
  linePitch: 141,
  lineX0: 392,
  lineX1: 1700,
  dividerX: 1080,
  dividerTop: 421,
  hiliteX: 1084,
  hiliteTop: 444,
  hiliteW: 513,
  hiliteRadius: 48,
  dotX: 940,
  dotEndY: 286,
};

/* ---------- 版面：标题。坐标是参考第 30 帧（落定后、开始退场前）的屏幕坐标 ---------- */
const TITLE = {
  left: 415, // 第一个字的字身框左边（“长”的墨迹从 414 起）
  bottom: 563, // 第一个字的字身框底边，其余各段默认和它对齐
  tracking: 4, // 字与字之间额外留多少
  subtitleLeft: 301,
  subtitleDrift: 0.75, // 副标题落定后每帧往左挪多少
  subtitleSize: 116,
  subtitleStretch: '92%',
  subtitleGap: 18, // 副标题的大写顶比大字底边高出多少（参考里副标题是塞在大字下面的）
  subtitleCreep: 1, // 副标题落定后每帧上漂多少（标题大字是 3.3）
  subtitleSettle: 36, // 副标题进场时从下方多少像素升上来
  dotX: 938,
  dotGap: 100, // 点线从副标题大写顶往下多少开始
  maxWidth: 1640, // 标题居中时最宽多少，超了整块缩小
};

type TitleChar = {ch: string; x: number; size: number; sx: number; sy: number; dy: number; part: number};

/** 把标题各段连成一排，算出每个字相对第一个字左边的距离。汉字按一字宽排，其他字符按半字宽。 */
const layoutTitle = (parts: TitlePart[], tracking: number): TitleChar[] => {
  const out: TitleChar[] = [];
  let x = 0;
  parts.forEach((part, pi) => {
    x += part.gap;
    const sx = part.scaleX ?? 1;
    Array.from(part.text).forEach((ch) => {
      out.push({ch, x, size: part.size, sx, sy: part.scaleY ?? 1, dy: part.dy, part: pi});
      x += part.size * sx * (isWide(ch) ? 1 : 0.55) + tracking;
    });
  });
  return out;
};

/** 标题：大字在左、小字在右的一行宋体字，加红色英文副标题和下面垂着的点线。 */
const Title: React.FC<{frame: number; props: TypedTableProps}> = ({frame, props}) => {
  // 有表格时，标题在表格进场那一刻刚好出画（从之前 23 帧开始冲）；没有表格就停到结尾，除非指定了 titleExitAt。
  const exitAt = props.titleExitAt ?? (props.rows.length > 0 ? props.tableAt : undefined);
  const lift = exitAt === undefined ? 0 : titleLift(frame - (exitAt - 53));
  if (lift > 1150) {
    return null;
  }
  const settle = settleProgress(frame);
  const rest = 1 - settle;
  const fly = Math.exp(-frame / 7.7); // 横向归位：先快后慢
  const creepBack = Math.max(0, TITLE_LAYOUT_FRAME - frame);
  const skew = -22 * (1 - Math.pow(settle, 1.6));
  const chars = layoutTitle(props.title, TITLE.tracking);
  // 副标题贴着第一个字的底边放；后面的小字比它低的话会压到副标题上，参考里就是这个样子。
  const lead = chars[0];
  const leadBottom = lead ? TITLE.bottom + lead.dy + 0.02 * lead.size * lead.sy : TITLE.bottom;
  const subtitleCapTop = leadBottom - TITLE.subtitleGap;
  const subtitleTop =
    subtitleCapTop +
    TITLE.subtitleCreep * creepBack +
    TITLE.subtitleSettle * rest * rest -
    (FONT_METRICS.sans.baseline - FONT_METRICS.sans.cap) * TITLE.subtitleSize;
  const dotTop = subtitleCapTop + TITLE.dotGap + TITLE.subtitleCreep * creepBack;
  // 标题居中：量出整块有多宽，以“底边中点”为轴缩小，再平移到画面正中。副标题是跟着大字底边走的，不会错位。
  let shiftX = 0;
  let zoom = 1;
  let pivotX = TITLE.left;
  if (props.titleCenter && chars.length > 0) {
    const last = chars[chars.length - 1];
    const width = last.x + last.size * last.sx * (isWide(last.ch) ? 1 : 0.55);
    pivotX = TITLE.left + width / 2;
    zoom = Math.min(1, TITLE.maxWidth / width);
    shiftX = 960 - pivotX;
  }
  const pivot = `${pivotX}px ${TITLE.bottom}px`;
  // 点线只跟着上下走、跟着缩放，不跟着字倾斜
  const moveUp = `translate(${shiftX}px, ${-lift}px) scale(${zoom})`;
  const move = `translate(${shiftX}px, ${-lift}px) scale(${zoom}) skewX(${skew}deg)`;
  // 进场时糊，冲出去时越快越糊
  const liftSpeed = exitAt === undefined ? 0 : titleLift(frame - (exitAt - 53) + 0.5) - titleLift(frame - (exitAt - 53) - 0.5);
  const blur = 18 * Math.pow(rest, 0.7) + Math.min(14, 0.14 * liftSpeed);

  return (
    <>
      {props.subtitle ? (
        // 副标题下面垂下来的点线。不拆通道，否则 2 像素宽的线三份对不齐会变成蓝色。
        <div
          style={{
            position: 'absolute',
            left: TITLE.dotX,
            top: dotTop,
            width: 2,
            height: 1080,
            backgroundImage: dotPattern('rgb(70, 70, 70)'),
            transform: moveUp,
            transformOrigin: `${pivotX - TITLE.dotX}px ${TITLE.bottom - dotTop}px`,
          }}
        />
      ) : null}
      <SplitGroup split={SPLIT} blur={blur} style={{transform: move, transformOrigin: pivot}}>
        {(channel) =>
          chars.map((c, i) => {
            const g = c.part === 0 ? 1 : c.part % 2 === 1 ? 0.78 : 0.46; // 越靠右的字进场时下移得越少
            const fromX = c.part === 0 ? -412 : c.part % 2 === 1 ? 35 : 110; // 大字从左边飞进来
            return (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: TITLE.left + c.x + fromX * fly,
                  top: TITLE.bottom + c.dy - c.size * c.sy + TITLE_CREEP * creepBack * g + 190 * rest * g,
                  display: 'block',
                  transform: `scale(${c.sx}, ${c.sy})`,
                  transformOrigin: '0 0',
                  fontFamily: `${SONG}, ${HANS}`,
                  fontSize: c.size,
                  lineHeight: 1,
                  whiteSpace: 'pre',
                  color: channelColor(INK, channel),
                }}
              >
                {c.ch}
              </span>
            );
          })
        }
      </SplitGroup>
      {props.subtitle ? (
        // 红色副标题不能走三通道叠底，单独一层，用左右两道彩色阴影做出色散边。
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: move,
            transformOrigin: pivot,
            mixBlendMode: 'multiply',
            filter: blur > 0.6 ? `blur(${blur * 0.5}px)` : undefined,
          }}
        >
          <Typed
            text={props.subtitle}
            frame={frame}
            at={props.subtitleAt}
            cps={props.subtitleCharsPerFrame}
            channel={1}
            color={RED}
            rise={8}
            fracture={3}
            style={{
              position: 'absolute',
              left: TITLE.subtitleLeft + TITLE.subtitleDrift * creepBack,
              top: subtitleTop,
              fontFamily: SANS,
              fontWeight: 500,
              fontStyle: 'italic',
              fontStretch: TITLE.subtitleStretch,
              fontSize: TITLE.subtitleSize,
              lineHeight: 1,
              textShadow: '-4px 0 0 rgba(30, 70, 255, 0.6), 4px 0 0 rgba(255, 130, 0, 0.45)',
            }}
          />
        </div>
      ) : null}
    </>
  );
};

/** 表头：英文用衬线粗斜体，中文用宋体并斜过去。 */
const Header: React.FC<{text: string; channel: Channel}> = ({text, channel}) => (
  <div
    style={{
      position: 'absolute',
      left: TABLE.headerX - TABLE.headerLatinSize * FONT_METRICS.serif.left,
      top: TABLE.headerBaseline - TABLE.headerLatinSize * FONT_METRICS.serif.baseline,
      whiteSpace: 'pre',
      fontFamily: SERIF,
      fontSize: TABLE.headerLatinSize,
      fontWeight: 700,
      fontStyle: 'italic',
      lineHeight: 1,
      color: channelColor(INK, channel),
    }}
  >
    {splitRuns(text).map((run, i) =>
      run.wide ? (
        <span
          key={i}
          style={{
            display: 'inline-block',
            fontFamily: SONG,
            fontSize: TABLE.headerCjkSize,
            fontWeight: 400,
            fontStyle: 'normal',
            transform: 'skewX(-10deg)',
            paddingLeft: i === 0 ? 0 : TABLE.headerCjkGap,
          }}
        >
          {run.text}
        </span>
      ) : (
        <span key={i} style={{letterSpacing: TABLE.headerLatinTracking}}>
          {run.text}
        </span>
      ),
    )}
  </div>
);

/** 数据表：横线、竖分隔线、竖直点线，表头，逐字打出的名字和数值，以及从左往右展开的黄色高亮。 */
const Table: React.FC<{frame: number; props: TypedTableProps}> = ({frame, props}) => {
  const k = frame - props.tableAt; // 表格进场后的帧数
  if (k < 0 || props.rows.length === 0) {
    return null;
  }
  const slide = tableSlide(k);
  const [floatX, floatY] = floatOffset(k);
  const speed = tableSlide(k + 0.5) - tableSlide(k - 0.5);
  const blur = Math.min(3, Math.abs(speed) * 0.04);
  // 滑入时带一点动态模糊，越快越糊。
  const moving: React.CSSProperties = {
    transform: `translate(${floatX + slide * 0.027}px, ${slide + floatY}px)`,
    filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
  };

  const lit = props.highlights
    .filter((h) => k >= h.at)
    .map((h) => {
      const y = TABLE.hiliteTop + TABLE.linePitch * (h.from - 1);
      const bottom = TABLE.lineFirstY + TABLE.linePitch * (h.to - 1) - 2;
      return {...h, y, h: bottom - y, w: TABLE.hiliteW * wipeProgress(k - h.at)};
    });

  return (
    <>
      <div style={{position: 'absolute', inset: 0, ...moving, mixBlendMode: 'multiply'}}>
        {lit.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: TABLE.hiliteX,
              top: b.y,
              width: b.w,
              height: b.h,
              backgroundColor: YELLOW,
              borderBottomRightRadius: TABLE.hiliteRadius,
            }}
          />
        ))}
        {props.rows.slice(0, -1).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: TABLE.lineX0,
              top: TABLE.lineFirstY + TABLE.linePitch * i,
              width: TABLE.lineX1 - TABLE.lineX0,
              height: 2,
              backgroundColor: LINE,
            }}
          />
        ))}
        <div style={{position: 'absolute', left: TABLE.dividerX, top: TABLE.dividerTop, width: 2, height: 1600, backgroundColor: LINE}} />
        {/* 从画面上方垂到表头上面一点的点线 */}
        <div
          style={{
            position: 'absolute',
            left: TABLE.dotX,
            top: -3000,
            width: 2,
            height: TABLE.dotEndY + 3000,
            backgroundImage: dotPattern(DOT),
          }}
        />
        <SplitGroup split={SPLIT} blur={0}>
          {(channel) => (
            <>
              <Header text={props.header} channel={channel} />
              {props.rows.map((row, i) => {
                const base = TABLE.rowBaseline0 + TABLE.rowPitch * i;
                const common: React.CSSProperties = {
                  position: 'absolute',
                  top: base - TABLE.rowSize * FONT_METRICS.sans.baseline,
                  fontFamily: `${SANS}, ${HANS}`,
                  fontSize: TABLE.rowSize,
                  fontWeight: row.strong ? 900 : 400,
                  lineHeight: 1,
                  color: channelColor(INK, channel),
                };
                return (
                  <React.Fragment key={i}>
                    <Typed
                      text={row.name}
                      frame={k}
                      at={row.nameAt}
                      cps={row.nameSpeed ?? props.nameCharsPerFrame}
                      channel={channel}
                      color={channelColor(INK, channel)}
                      // 粗体行和细体行各用一套宽窄；细体行名字里的数字在参考里明显比数值里的窄
                      digitStretch={row.strong ? '125%' : '100%'}
                      letterStretch={row.strong ? '112%' : '78%'}
                      style={{...common, left: TABLE.nameX - TABLE.rowSize * FONT_METRICS.sans.left}}
                    />
                    <Typed
                      text={row.value}
                      frame={k}
                      at={row.valueAt}
                      cps={row.valueSpeed ?? props.valueCharsPerFrame}
                      channel={channel}
                      color={channelColor(INK, channel)}
                      digitStretch="125%"
                      style={{...common, left: TABLE.valueX - TABLE.rowSize * FONT_METRICS.sans.left}}
                    />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </SplitGroup>
      </div>
      {/* 高亮块上的浅色分隔线：正片叠底提不亮，单独盖一层，跟着高亮一起展开 */}
      {lit
        .filter((b) => b.to > b.from)
        .map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              ...moving,
              left: TABLE.hiliteX,
              top: b.y,
              width: b.w,
              height: b.h,
              overflow: 'hidden',
              borderBottomRightRadius: TABLE.hiliteRadius,
            }}
          >
            {Array.from({length: b.to - b.from}, (_, j) => b.from + j).map((r) => (
              <div
                key={r}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: TABLE.lineFirstY + TABLE.linePitch * (r - 1) - 2 - b.y,
                  height: 4,
                  backgroundColor: 'rgba(245, 245, 243, 0.85)',
                }}
              />
            ))}
          </div>
        ))}
    </>
  );
};

/** 推镜的比例：有表格时，表格进场前 17 帧开始推、停稳后继续极缓慢地推；只有标题时全程缓慢地推。 */
const backdropScale = (frame: number, props: TypedTableProps) =>
  props.rows.length === 0
    ? interpolate(frame, [0, props.durationInFrames], [1, 1.08], {extrapolateRight: 'clamp'})
    : interpolate(frame - (props.tableAt - 17), [0, 44, 186], [1, 1.2, 1.24], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.inOut(Easing.cubic),
      });

export const TypedTable: React.FC<TypedTableProps> = (props) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#e6e6e4'}}>
      <Backdrop scale={backdropScale(frame, props)} image={props.backgroundImage} wash={props.wash} />
      <Title frame={frame} props={props} />
      <Table frame={frame} props={props} />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
