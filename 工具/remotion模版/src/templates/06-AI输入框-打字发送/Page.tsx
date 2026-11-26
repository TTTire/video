import React from 'react';
import {HANS, SANS} from '../../shared/fonts';
import {fitFontSize} from './fitText';
import {L} from './layout';
import {View} from './motion';
import {TemplateProps} from './schema';
import {hexToRgba, luminance, Theme} from './themes';

const FONT = `${SANS}, ${HANS}`; // 拉丁字母用 Archivo，汉字回落到 Noto Sans SC
const BL = L.box.left;
const BT = L.box.top; // 输入框里的东西按框内的坐标摆：框的左上角是 (0, 0)

// 字块的上沿。行高里基线在 (行高 / 2 + 0.3305) 个字高处（Archivo 的度量，见共用的 fontMetrics.ts）
const TEXT_TOP = L.text.baseline - L.text.size * (L.text.line / 2 + 0.3305);

/** 问句前面的四角星标（22×22）。 */
const Star: React.FC<{color: string}> = ({color}) => (
  <svg width={L.star.size} height={L.star.size} viewBox="0 0 22 22" style={{display: 'inline-block', verticalAlign: 'baseline', transform: `translateY(${L.star.drop}px)`, marginRight: L.star.gap - 3}}>
    <path d="M11,0 Q12.6,9.4 22,11 Q12.6,12.6 11,22 Q9.4,12.6 0,11 Q9.4,9.4 11,0 Z" fill={color} />
  </svg>
);

/** 左下角的圆圈小图标。 */
const Icon: React.FC<{kind: TemplateProps['icons'][number]; left: number; T: Theme}> = ({kind, left, T}) => {
  const s = L.tools.size;
  const c = s / 2;
  const g = {fill: 'none', stroke: T.muted, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <div
      style={{
        position: 'absolute',
        left: left - BL,
        top: L.tools.cy - s / 2 - BT,
        width: s,
        height: s,
        borderRadius: s / 2,
        border: `1.5px solid ${T.line}`,
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
      }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {kind === 'plus' ? <path d={`M${c},${c - 7.5} V${c + 7.5} M${c - 7.5},${c} H${c + 7.5}`} {...g} /> : null}
        {kind === 'sliders' ? <path d={`M${c - 9},${c - 3.5} H${c + 9} M${c - 9},${c + 3.5} H${c + 9} M${c + 2},${c - 6.5} V${c - 0.5} M${c - 3},${c + 0.5} V${c + 6.5}`} {...g} strokeWidth={1.8} /> : null}
        {kind === 'globe' ? (
          <g {...g} strokeWidth={1.6}>
            <circle cx={c} cy={c} r={7.6} />
            <ellipse cx={c} cy={c} rx={3.2} ry={7.6} />
            <path d={`M${c - 6.6},${c - 3.8} H${c + 6.6} M${c - 6.6},${c + 3.8} H${c + 6.6} M${c - 7.6},${c} H${c + 7.6}`} />
          </g>
        ) : null}
        {kind === 'mic' ? (
          <g {...g} strokeWidth={1.8}>
            <rect x={c - 3.2} y={c - 8} width={6.4} height={11} rx={3.2} />
            <path d={`M${c - 6},${c - 1.5} a6,6 0 0 0 12,0 M${c},${c + 4.5} V${c + 8}`} />
          </g>
        ) : null}
        {kind === 'none' ? (
          <g fill={T.muted}>
            <circle cx={c - 6.5} cy={c} r={1.7} />
            <circle cx={c} cy={c} r={1.7} />
            <circle cx={c + 6.5} cy={c} r={1.7} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

/** 发送钮的图标。钮的颜色浅时箭头用深色，深时用白色。 */
const SendIcon: React.FC<{T: Theme}> = ({T}) => {
  const a = L.arrow;
  const ink = luminance(T.accent) > 0.62 ? '#1a1a1a' : '#ffffff';
  const g = {fill: 'none', stroke: ink, strokeWidth: a.stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={L.send.r * 2} height={L.send.r * 2} viewBox={`${-L.send.r} ${-L.send.r} ${L.send.r * 2} ${L.send.r * 2}`} style={{display: 'block'}}>
      {T.sendIcon === 'up' ? <path d={`M0,${a.stemTop} V${a.stemBottom} M${-a.w / 2},-0.5 L0,${a.stemTop} L${a.w / 2},-0.5`} {...g} /> : null}
      {T.sendIcon === 'plane' ? <path d="M-8.5,-1 L8.5,-8.5 L2.5,8.5 L-1,1.5 Z M-1,1.5 L8.5,-8.5" {...g} strokeWidth={1.8} /> : null}
    </svg>
  );
};

/**
 * 页面本身：背景、问句、输入框（打进去的字、光标、左下角的图标和模型标签、三个点、发送钮）。输入框全片不变，
 * 指针不在这里（它压在最上面，由 Template 画，开动态模糊时要叠好几层）。
 */
export const Page: React.FC<{data: TemplateProps; T: Theme; v: View}> = ({data, T, v}) => {
  // 字太长就缩一点：最多排到发送钮的上沿；左下角有图标或模型标签时，最多排到它们的上沿
  const hasTools = data.icons.length > 0 || data.model.length > 0;
  const maxH = (hasTools ? L.pill.top : L.send.cy - L.send.r - 10) - TEXT_TOP - 6;
  const maxLines = Math.max(1, Math.floor(maxH / (L.text.size * L.text.line)));
  const size = fitFontSize(data.prompt, L.text.w, maxLines, L.text.size);
  const k = size / L.text.size;
  const chars = Array.from(data.prompt);
  const pillLeft = data.icons.length ? L.tools.left + data.icons.length * L.tools.size + (data.icons.length - 1) * L.tools.gap + L.pill.gap : L.text.left - 10;

  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: L.w, height: L.h, background: T.bg, fontFamily: FONT}}>
      {/* 问句：整组居中（参考里星标 + 字一共占第 658–1267 列，中心在 962.5，所以往右让 5 像素） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: L.title.baseline - L.title.size * 0.83,
          width: L.w,
          paddingLeft: 5,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontSize: L.title.size,
          lineHeight: 1,
          fontWeight: 700,
          fontStretch: data.fontStretch,
          letterSpacing: '-0.012em',
          color: T.title,
        }}
      >
        {data.showMark ? <Star color={T.accent} /> : null}
        {data.question}
      </div>

      {/* 输入框。投影比背景亮：紧挨着框是一圈，往下拖得长 */}
      <div
        style={{
          position: 'absolute',
          left: BL,
          top: BT,
          width: L.box.w,
          height: L.box.h,
          borderRadius: L.box.r,
          background: T.box,
          border: T.boxBorder === 'none' ? undefined : `1px solid ${T.boxBorder}`,
          boxShadow: `0 10px 18px ${T.shadow}, 0 20px 52px ${T.shadow}`,
          overflow: 'hidden',
        }}
      >
        {/* 打进去的字：一个字一个 span，按“已经打了几个”各自淡入；能自动折行 */}
        <div
          style={{
            position: 'absolute',
            left: L.text.left - BL,
            top: L.text.baseline - size * (L.text.line / 2 + 0.3305) - BT,
            width: L.text.w,
            transform: `translateY(${-v.textLift}px)`,
            opacity: v.textOpacity,
            fontSize: size,
            lineHeight: L.text.line,
            fontWeight: 650,
            fontStretch: data.fontStretch,
            letterSpacing: '-0.008em',
            color: T.text,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {chars.map((ch, i) => (
            <span key={i} style={{opacity: Math.max(0, Math.min(1, v.typed - i))}}>
              {ch}
            </span>
          ))}
          {/* 光标紧跟在最后一个字后面，折行时也跟着走 */}
          {v.caret > 0 ? (
            <span
              style={{
                display: 'inline-block',
                width: L.caret.w * k,
                height: L.caret.h * k,
                marginLeft: 1.5 * k,
                transform: `translateY(${L.caret.drop * k}px)`,
                background: T.caret,
                opacity: v.caret,
              }}
            />
          ) : null}
        </div>

        {/* 左下角：圆圈图标和模型标签 */}
        {data.icons.map((kind, i) => (
          <Icon key={i} kind={kind} left={L.tools.left + i * (L.tools.size + L.tools.gap)} T={T} />
        ))}
        {data.model ? (
          <div
            style={{
              position: 'absolute',
              left: pillLeft - BL,
              top: L.pill.top - BT,
              height: L.pill.h,
              boxSizing: 'border-box',
              padding: `3px ${L.pill.padR}px 0 ${L.pill.padL}px`,
              borderRadius: L.pill.h / 2,
              border: `1px solid ${T.line}`,
              display: 'flex',
              alignItems: 'center',
              fontSize: L.pill.size,
              fontWeight: 600,
              fontStretch: data.fontStretch,
              color: T.muted,
              whiteSpace: 'nowrap',
              opacity: v.textOpacity,
              transform: `scale(${v.pill.scaleX}, ${v.pill.scaleY})`, // 发送后压扁、收窄
              transformOrigin: '50% 96%',
            }}
          >
            {data.model}
            <svg width={8} height={5} viewBox="0 0 8 5" style={{marginLeft: 8, flex: 'none'}}>
              <path d="M0.5,0.5 L7.5,0.5 L4,4.5 Z" fill={T.muted} />
            </svg>
          </div>
        ) : null}

        {/* 发送以后淡入的三个点 */}
        {v.dots.map((o, i) => (o > 0.002 ? <div key={i} style={{position: 'absolute', left: L.dots.xs[i] - L.dots.rs[i] - BL, top: L.dots.y - L.dots.rs[i] - BT, width: L.dots.rs[i] * 2, height: L.dots.rs[i] * 2, borderRadius: '50%', background: T.accent, opacity: o * [0.5, 0.24, 0.4][i], filter: 'blur(0.8px)'}} /> : null))}

        {/* 发送钮 */}
        <div
          style={{
            position: 'absolute',
            left: L.send.cx - L.send.r - BL,
            top: L.send.cy - L.send.r - BT,
            width: L.send.r * 2,
            height: L.send.r * 2,
            borderRadius: '50%',
            background: T.accent,
            boxShadow: `0 0 9px 1px ${hexToRgba(T.accent, 0.3)}`,
          }}
        >
          <SendIcon T={T} />
        </div>
      </div>
    </div>
  );
};
