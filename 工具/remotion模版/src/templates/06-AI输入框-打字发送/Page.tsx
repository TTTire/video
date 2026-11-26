import React from 'react';
import {HANS, SANS} from '../../shared/fonts';
import {fitFontSize} from './fitText';
import {L} from './layout';
import {CHAR_FADE, View} from './motion';
import {TemplateProps} from './schema';
import {hexToRgba, luminance, Theme} from './themes';

const FONT = `${SANS}, ${HANS}`; // 拉丁字母用 Archivo，汉字回落到 Noto Sans SC
const BL = L.box.left;
const BT = L.box.top; // 输入框里的东西按框内的坐标摆：框的左上角是 (0, 0)

// 字块的上沿。行高里基线在 (行高 / 2 + 0.3305) 个字高处（Archivo 的度量，见共用的 fontMetrics.ts）
const TEXT_TOP = L.text.baseline - L.text.size * (L.text.line / 2 + 0.3305);

/**
 * 问句前面的四角星标（22×22）。是一支细长的四角星：竖着的一支宽 4 像素、横着的一支高 5 像素，边是凹进去的。
 * 形状照参考第 110 帧逐行量的宽度画的。
 */
const Star: React.FC<{color: string}> = ({color}) => (
  <svg width={L.star.size} height={L.star.size} viewBox="0 0 22 22" style={{display: 'inline-block', verticalAlign: 'baseline', transform: `translateY(${L.star.drop}px)`, marginRight: L.star.gap}} // 减去 H 左边自带的 4 像素留白
    >
    <path d="M11,0 C12,8.2 15.6,8.5 22,11 C15.6,13.5 12,13.8 11,22 C10,13.8 6.4,13.5 0,11 C6.4,8.5 10,8.2 11,0 Z" fill={color} />
  </svg>
);

/** 左下角的圆圈小图标。 */
const Icon: React.FC<{kind: TemplateProps['icons'][number]; left: number; T: Theme}> = ({kind, left, T}) => {
  const s = L.tools.size;
  const c = s / 2;
  const g = {fill: 'none', stroke: hexToRgba(T.muted, 0.75), strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const}; // 图标笔画比模型标签的字浅一点、细一点
  return (
    <div
      style={{
        position: 'absolute',
        left: left - BL,
        top: L.tools.cy - s / 2 - BT,
        width: s,
        height: s,
        borderRadius: s / 2,
        border: `2px solid ${T.line}`,
        boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.025), 0 2px 5px rgba(0, 0, 0, 0.03)', // 圆圈外头还有一圈很淡的软边
      }}
    >
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        {kind === 'plus' ? <path d={`M${c},${c - 7.5} V${c + 7.5} M${c - 7.5},${c} H${c + 7.5}`} {...g} /> : null}
        {kind === 'sliders' ? <path d={`M${c - 9},${c - 3.5} H${c + 9} M${c - 9},${c + 3.5} H${c + 9} M${c + 2},${c - 6.5} V${c - 0.5} M${c - 3},${c + 0.5} V${c + 6.5}`} {...g} strokeWidth={1.8} /> : null}
        {kind === 'globe' ? (
          <g {...g} strokeWidth={1.3}>
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
  const ink = luminance(T.accent) > 0.62 ? '#1a1a1a' : '#fff9ee'; // 钮深时箭头用带一点暖的白色
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
          color: T.title,
        }}
      >
        {data.showMark ? <Star color={T.accent} /> : null}
        {data.question}
      </div>

      {/* 输入框。投影比背景亮，主要在框的底下 */}
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
          // 投影：往下偏 30、糊开 48、往里收 20，所以框底下最亮、两边只沾到一点、上边几乎没有（照参考量的剖面）
          boxShadow: `0 30px 48px -20px ${T.shadow}`,
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
            fontWeight: 610,
            fontStretch: data.fontStretch,
            color: T.text,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
          }}
        >
          {/* 还没敲的字不放进来（不透明度为 0 的字也占地方，光标会被顶到整句的末尾去） */}
          {chars.slice(0, v.shown).map((ch, i) => (
            // 每个字在自己“变深的那一帧”之前 CHAR_FADE 帧开始淡入。
            // 注意这一行里不能随手塞注释或空格：标签里多一个空格，每个字后面就多出一个空格的宽度
            <span key={i} style={{opacity: Math.max(0, Math.min(1, (v.t - v.keys[i] + CHAR_FADE) / CHAR_FADE))}}>
              {ch}
            </span>
          ))}
          {/* 光标紧跟在最后一个字后面，折行时也跟着走。外头这个小方块故意做得很矮（不超过行里字母能升到的高度），
              不然它会把这一行撑高、把基线往下挤 3 像素；真正的光标是里头绝对定位的那根条 */}
          {v.caret > 0 ? (
            <span style={{display: 'inline-block', position: 'relative', width: L.caret.w * k, height: L.text.size * 0.5 * k, marginLeft: 1 * k, opacity: v.caret}}>
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: -L.caret.drop * k, // 条的底边在基线下 drop 像素
                  width: L.caret.w * k,
                  height: L.caret.h * k,
                  background: T.caret,
                }}
              />
            </span>
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
              padding: `3px ${L.pill.padR + 2}px 0 ${L.pill.padL}px`,
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
              transformOrigin: '62% 96%', // 收的时候左沿跑得比右沿多，轴心偏右
            }}
          >
            {data.model}
            <svg width={8} height={5} viewBox="0 0 8 5" style={{marginLeft: 8, flex: 'none'}}>
              <path d="M0.5,0.5 L7.5,0.5 L4,4.5 Z" fill={T.muted} />
            </svg>
          </div>
        ) : null}

        {/* 发送以后淡入的三个点 */}
        {v.dots.map((o, i) => (o > 0.002 ? <div key={i} style={{position: 'absolute', left: L.dots.xs[i] - L.dots.rs[i] - BL, top: L.dots.y - L.dots.rs[i] - BT, width: L.dots.rs[i] * 2, height: L.dots.rs[i] * 2, borderRadius: '50%', background: T.accent, opacity: o * [0.4, 0.2, 0.34][i], filter: 'blur(0.8px)'}} /> : null))}

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
            boxShadow: `0 0 16px 2px ${hexToRgba(T.accent, 0.22)}`, // 钮周围一层很淡的暖色光
          }}
        >
          <SendIcon T={T} />
        </div>
      </div>
    </div>
  );
};
