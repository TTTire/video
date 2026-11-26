import React, {useMemo} from 'react';
import {Img} from 'remotion';
import {HANS, SANS} from '../../shared/fonts';
import {TemplateProps} from './schema';

/**
 * 横屏 1920×1080 的版面。坐标都是“不看镜头时”的画面坐标（左上角是 0, 0），可以超出画面。
 *
 * 怎么量的：参考第 0 帧（1080×1102）的镜头中心在画面 (538.5, 553)、strength 698（用四条边界拟合出来的）。
 * 把这一帧的边界和字用这个镜头还原成“不看镜头时它在哪”，相对镜头中心写下位置，再按画面高度 ×(1080 / 1102)：
 *   顶部带下沿 −352 → 顶带下沿 195；气泡上沿 −105、下沿 +386、圆角 90 → 437 / 918 / 88；
 *   正文汉字步进 86.3、行距 103、字心高 80 → 字号 84.6、行距 101；号码数字高 42 → 字号 59，字心离镜头中心 −431；
 *   两行小字字心 −254、−188 → 291、356；头像圆心 (+63, −621)、半径 128.5。
 * 横屏没有参考（下面这几条是定的，不是量的）：头像、号码、小字、气泡都改成对着画面中线居中（参考里它们偏右 60 像素上下）；
 * 气泡宽 1860（里面 1740），字号取整成 92、行距 109.8（比按高度换算的大一成），上下内边距 42；参考里断行的四处还能断开；
 * 顶部带一直铺到画面外。徽标照参考还原出来的位置放（离中线 −826、比头像中心低 37），所以第 0 帧它在画面左上；
 * 状态栏那三个图标在参考第 0 帧只露出右上角一点电量的数字，这里按“同样只露一个角”放到右上角外面。参考量到的其他数：
 *   气泡圆角 90 → 88；气泡上沿到第一行字顶 57.6、底沿到末行字底 47 → 上下内边距各 40。
 */
export const L = {
  w: 1920,
  h: 1080,
  bandBottom: 195,
  avatar: {x: 960, y: -69, r: 126},
  sender: {size: 59, centerY: 118},
  labels: {size: 53, pitch: 65, centers: [291, 356]},
  badge: {x: 150, y: -105},
  status: {x: 2560, y: -470, gap: 80},
  // 正文比按高度等比换算（字号 84.6）大一成（92）：参考接近方形，气泡是顶满画面的；1920 宽里按高度换算字只占 4% 的宽，看着小。
  // 再大就不行了：默认那四行里最宽的第二行有 12 个汉字加 8 位数字，在 Noto Sans SC + Archivo 下大约 18.3 个字号宽（量过：
  // 字号 104 时首行放不进 1680、96 时第二行放不进），气泡里宽 1740，字号 92 时这行约 1686，刚好放得下
  bubble: {left: 30, top: 430, width: 1860, height: 500, radius: 92}, // 高度是四行正文时量出来的；实际由正文撑开
  body: {size: 92, line: 109.8, inset: 42}, // 正文块离气泡四边：上下 42，左右 60
};
export const BODY_PAD_X = 60;
// 内容层往画面外铺多大：镜头要在画面外 lensPad 处采样，内容缩小以后还得盖住那一圈
export const BIG = 2400;

const FONT = `${SANS}, ${HANS}, sans-serif`;

/** 高亮块在这一帧盖到哪：[a, b] 是这个字身上还看得见的部分（0 到 1，从左往右量）。 */
export type Block = {a: number; b: number; color: string};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 把正文拆成：看得见的字、还没打出来的字、链接、盖着高亮块的字。 */
export const bodyNodes = (P: TemplateProps, typed: number, blocks: Record<number, Block>): React.ReactNode => {
  const chars = Array.from(P.body);
  let flat = 0;
  const flatPos = chars.map((c) => (c === '\n' ? -1 : flat++));
  const flatText = chars.filter((_, i) => flatPos[i] >= 0).join('');
  const linkLen = P.link ? Array.from(P.link).length : 0;
  const linkAt = P.link ? flatText.indexOf(P.link) : -1;
  const nodes: React.ReactNode[] = [];
  let buf = '';
  let state = '';
  const flush = (key: React.Key) => {
    if (!buf) {
      return;
    }
    if (state === 'link') {
      nodes.push(
        <span key={key} style={{textDecorationLine: 'underline', textDecorationColor: P.underLineColor, textDecorationThickness: '5.5px', textUnderlineOffset: '11px'}}>
          {buf}
        </span>,
      );
    } else {
      nodes.push(
        <span key={key} style={{visibility: state === 'hidden' ? 'hidden' : undefined}}>
          {buf}
        </span>,
      );
    }
    buf = '';
  };
  chars.forEach((ch, i) => {
    if (ch === '\n') {
      flush(i);
      state = '';
      nodes.push('\n');
      return;
    }
    const p = flatPos[i];
    const block = blocks[p];
    if (block) {
      flush(i);
      state = '';
      // 高亮块是个小方块，正好盖住这一个字；用渐变控制从左往右露出来多少。负的外边距抵消内边距，不撑高行
      const {a, b, color} = block;
      nodes.push(
        <span
          key={i}
          style={{
            display: 'inline-block',
            padding: '0.08em 0',
            margin: '-0.08em 0',
            background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${a * 100}%, ${color} ${a * 100}%, ${color} ${b * 100}%, rgba(0,0,0,0) ${b * 100}%)`,
            ...(linkAt >= 0 && p >= linkAt && p < linkAt + linkLen
              ? {textDecorationLine: 'underline', textDecorationColor: P.underLineColor, textDecorationThickness: '5.5px', textUnderlineOffset: '11px'}
              : {}),
          }}
        >
          {ch}
        </span>,
      );
      return;
    }
    const next = linkAt >= 0 && p >= linkAt && p < linkAt + linkLen ? 'link' : p < typed ? 'shown' : 'hidden';
    if (next !== state) {
      flush(i);
      state = next;
    }
    buf += ch;
  });
  flush('end');
  return nodes;
};

/** 辉光：内容画一遍，再模糊、提亮着叠一遍，字边就发亮发糊。模糊是内容里的像素数，过镜头以前算的。 */
const Glow: React.FC<{amount: number; style: React.CSSProperties; children: React.ReactNode}> = ({amount, style, children}) => (
  <div style={{position: 'absolute', ...style}}>
    {children}
    {amount > 0.01 ? (
      <div style={{position: 'absolute', inset: 0, filter: 'blur(7px)', opacity: Math.min(1, amount), mixBlendMode: 'screen'}}>{children}</div>
    ) : null}
  </div>
);

/**
 * 整个“截图”：顶部深灰带（头像、号码）、两行小字、一条气泡，外加徽标和状态栏。
 * band 为假时不画那条带子的底色：Template 另外用一条算出来的路径填它（见 bandPath），这里只画带子里的东西，置换区域能小很多。
 */
export const Page: React.FC<{P: TemplateProps; typed: number; blocks: Record<number, Block>; band?: boolean; scan?: boolean}> = ({P, typed, blocks, band = false, scan = true}) => {
  const body = useMemo(() => bodyNodes(P, typed, blocks), [P, typed, blocks]);
  const B = L.bubble;
  const T = {left: B.left + BODY_PAD_X, top: B.top + L.body.inset, width: B.width - 2 * BODY_PAD_X};
  const labels = [P.titleLine, P.timeLine].filter((s) => s !== '');
  const avatar = L.avatar.r;
  return (
    <>
      {/* 顶部深灰带：一直铺到内容层的边。下沿用渐变糊掉 4 像素，像拍下来的边。默认不画，由 Template 的 bandPath 填 */}
      {band ? (
      <div
        style={{
          position: 'absolute',
          left: -BIG,
          top: -BIG,
          width: L.w + 2 * BIG,
          height: BIG + L.bandBottom,
          background: `linear-gradient(to bottom, ${P.bandColor} 0%, ${P.bandColor} calc(100% - 4px), rgba(0,0,0,0) 100%)`,
        }}
      />
      ) : null}
      {/* 头像占位：灰圆 + 白的人形 */}
      <svg style={{position: 'absolute', left: L.avatar.x - avatar, top: L.avatar.y - avatar}} width={2 * avatar} height={2 * avatar}>
        <defs>
          <clipPath id="shot-avatar-clip">
            <circle cx={avatar} cy={avatar} r={avatar} />
          </clipPath>
        </defs>
        <circle cx={avatar} cy={avatar} r={avatar} fill="#767c84" />
        <g clipPath="url(#shot-avatar-clip)" fill="#e6e7eb">
          <circle cx={avatar} cy={avatar * 0.82} r={avatar * 0.3} />
          <ellipse cx={avatar} cy={avatar * 2.02} rx={avatar * 0.56} ry={avatar * 0.62} />
        </g>
      </svg>
      {/* 号码 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: L.w,
          top: L.sender.centerY - L.sender.size,
          height: L.sender.size * 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          fontFamily: FONT,
          fontSize: L.sender.size,
          fontWeight: 500,
          color: P.senderColor,
          whiteSpace: 'nowrap',
          lineHeight: 1,
          letterSpacing: '0.4px',
        }}
      >
        <span>{P.sender}</span>
        <span style={{color: P.labelColor, fontSize: L.sender.size * 1.1, lineHeight: 0.8, marginTop: '-0.06em'}}>›</span>
      </div>
      {/* 两行灰色小字 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: L.w,
          top: L.labels.centers[0] - L.labels.pitch / 2,
          fontFamily: FONT,
          fontSize: L.labels.size,
          lineHeight: `${L.labels.pitch}px`,
          color: P.labelColor,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontWeight: 400,
        }}
      >
        {labels.map((s, i) => (
          <div key={i}>{s}</div>
        ))}
      </div>
      {/* 左上角的蓝色徽标 */}
      {P.badge !== '' ? (
        <div style={{position: 'absolute', left: L.badge.x, top: L.badge.y, transform: 'translate(-50%, -50%)'}}>
          <div
            style={{
              minWidth: 104,
              height: 64,
              boxSizing: 'border-box',
              padding: '0 26px',
              borderRadius: 32,
              background: P.badgeColor,
              fontFamily: FONT,
              fontSize: 46,
              fontWeight: 700,
              lineHeight: '64px',
              color: '#ffffff',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {P.badge}
          </div>
        </div>
      ) : null}
      {/* 右上角的状态栏：信号、Wi-Fi、电量 */}
      {P.battery !== '' ? (
        <svg style={{position: 'absolute', left: L.status.x - 300, top: L.status.y - 30}} width={330} height={60} viewBox="0 0 330 60" fill={P.senderColor}>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={0 + i * 13} y={40 - i * 9 - 8} width={9} height={8 + i * 9} rx={2} />
          ))}
          <path d="M80 28 a34 34 0 0 1 46 0 l-7 8 a24 24 0 0 0 -32 0 z M92 41 a17 17 0 0 1 22 0 l-11 13 z" />
          <rect x={222} y={6} width={92} height={40} rx={11} fill="none" stroke={P.senderColor} strokeWidth={4} opacity={0.9} />
          <rect x={316} y={19} width={7} height={14} rx={2} opacity={0.7} />
          <text x={268} y={37} textAnchor="middle" fontFamily={FONT} fontSize={28} fontWeight={600}>
            {P.battery}
          </text>
        </svg>
      ) : null}
      {/* 气泡：贴着正文排，正文多了往下长 */}
      {P.image ? (
        <Img src={P.image} style={{position: 'absolute', left: B.left, top: B.top, width: B.width, borderRadius: L.bubble.radius, display: 'block'}} />
      ) : (
        <div
          style={{
            position: 'absolute',
            left: B.left,
            top: B.top,
            width: B.width,
            boxSizing: 'border-box',
            padding: `${L.body.inset}px ${BODY_PAD_X}px`,
            borderRadius: L.bubble.radius,
            background: P.bubbleColor,
            fontFamily: FONT,
            fontSize: L.body.size,
            lineHeight: `${L.body.line}px`,
            fontWeight: 400,
            color: P.textColor,
          }}
        >
          <Glow amount={P.glow} style={{position: 'relative', whiteSpace: 'break-spaces'}}>
            <div>{body}</div>
          </Glow>
        </div>
      )}
      {scan ? <Scanlines P={P} /> : null}
    </>
  );
};

/** 横向的扫描纹（拍屏幕的摩尔纹）：贴着内容走，所以写在内容层里、跟着内容一起动。动态模糊要叠好几个样时只画一遍（见 Template）。 */
export const Scanlines: React.FC<{P: TemplateProps}> = ({P}) =>
  P.scanlines > 0 ? (
    <div
      style={{
        position: 'absolute',
        left: -BIG,
        top: -BIG,
        width: L.w + 2 * BIG,
        height: 2 * BIG,
        backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,${0.9 * P.scanlines}) 0px, rgba(0,0,0,${0.9 * P.scanlines}) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 9px)`,
      }}
    />
  ) : null;
