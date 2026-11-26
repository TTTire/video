import React from 'react';
import { DISPLAY_SERIF, MONO, SANS } from '../../shared/fonts';
import { TemplateProps } from './schema';

type RowData = TemplateProps['rows'][number];

/**
 * 一整套版面：网页上每样东西放在哪、多大。
 * 横坐标都是画面坐标；写“页面里的”那些，纵坐标从白色页面的上沿起算；写“行里的”那些，横坐标从表格左边起算、纵坐标从行的上沿起算。
 */
export type Layout = {
  w: number;
  h: number;
  cardTop: number; // 白色页面的上沿
  cardBottom: number; // 白色页面的下沿
  cardLeft: number; // 白色页面的左沿、右沿往画面外延伸多少。页面和画面一样宽时，近景斜着看会露出它的侧边
  cardRight: number;
  tableLeft: number;
  tableRight: number;
  tableTop: number; // 第一行的上沿（页面里的）
  rowH: number;
  hiInset: number; // 高亮卡片比普通行左右各宽出多少
  navH: number; // 顶部导航的高
  title: { left: number; top: number; size: number; line: string };
  badge: { left: number; top: number; size: number };
  description: { left: number; top: number; size: number };
  meta: { left: number; top: number; size: number };
  toolbar: { top: number; height: number; size: number };
  headH: number; // 表头那一块的高
  head: {
    size: number;
    top: number;
    rank: number;
    lab: number;
    score: number;
    modelRank: number;
    spread: number;
  }; // 表头五列
  rank: { width: number; top: number; size: number }; // 名次居中在 0 到 width 之间，width 处是那条竖线
  logo: { left: number; top: number; box: number; size: number };
  lab: { left: number; top: number; size: number; line: string };
  model: { left: number; top: number; size: number; line: string };
  score: { left: number; width: number; top: number; size: number }; // 右边对齐到 left + width
  err: { left: number; top: number; size: number };
  info: { left: number; top: number; box: number; size: number }; // 分数右边那个小圆圈 i
  bar: { left: number; top: number; height: number; max: number };
  rank2: { left: number; width: number; top: number; size: number };
  spread: { left: number; width: number; top: number; size: number };
};

/** 竖屏：量自参考第 239 帧。 */
const PORTRAIT: Layout = {
  w: 1080,
  h: 1920,
  cardTop: 238,
  cardBottom: 1454,
  cardLeft: 0,
  cardRight: 0,
  tableLeft: 8,
  tableRight: 1072,
  tableTop: 612,
  rowH: 74,
  hiInset: 3,
  navH: 44,
  title: { left: 8, top: 78, size: 34, line: '36px' },
  badge: { left: 156, top: 80, size: 15.5 },
  description: { left: 8, top: 124, size: 13.6 },
  meta: { left: 8, top: 157, size: 11.5 },
  toolbar: { top: 230, height: 50, size: 13.6 },
  headH: 65,
  head: {
    size: 12.8,
    top: 24,
    rank: 34,
    lab: 184,
    score: 552,
    modelRank: 816,
    spread: 957,
  },
  rank: { width: 155, top: 29, size: 15 },
  logo: { left: 188, top: 25, box: 24, size: 16 },
  lab: { left: 211, top: 17, size: 17, line: '23px' },
  model: { left: 212, top: 44, size: 11, line: '14px' },
  score: { left: 470, width: 156, top: 30, size: 15.5 },
  err: { left: 633, top: 32, size: 13 },
  info: { left: 678, top: 30, box: 15, size: 10.5 },
  bar: { left: 588, top: 49, height: 5, max: 162 },
  rank2: { left: 752, width: 128, top: 29, size: 15 },
  spread: { left: 892, width: 157, top: 29, size: 15 },
};

/**
 * 横屏：没有参考，是照竖屏那一套的疏密重新排的。十一行要在 1080 高里放得下，所以行高收到 68。
 * 名次、名字、分数这三栏排得紧凑，近景放大时正好一屏放得下；右边两栏留给拉远以后看。
 */
const LANDSCAPE: Layout = {
  w: 1920,
  h: 1080,
  cardTop: 20,
  cardBottom: 1058,
  cardLeft: -400,
  cardRight: -400,
  tableLeft: 8,
  tableRight: 1912,
  tableTop: 288,
  rowH: 68,
  hiInset: 4,
  navH: 44,
  title: { left: 12, top: 54, size: 40, line: '42px' },
  badge: { left: 214, top: 57, size: 17 },
  description: { left: 12, top: 102, size: 15 },
  meta: { left: 12, top: 127, size: 12.5 },
  toolbar: { top: 162, height: 50, size: 14 },
  headH: 56,
  head: {
    size: 14.5,
    top: 19,
    rank: 60,
    lab: 278,
    score: 540,
    modelRank: 1300,
    spread: 1620,
  },
  rank: { width: 200, top: 24, size: 17 },
  logo: { left: 236, top: 20, box: 28, size: 18 },
  lab: { left: 278, top: 12, size: 21, line: '27px' },
  model: { left: 280, top: 41, size: 14, line: '17px' },
  score: { left: 500, width: 300, top: 22, size: 19.5 },
  err: { left: 812, top: 25, size: 14.5 },
  info: { left: 888, top: 23, box: 18, size: 12.5 },
  bar: { left: 700, top: 54, height: 6, max: 320 },
  rank2: { left: 1300, width: 180, top: 24, size: 18 },
  spread: { left: 1620, width: 240, top: 24, size: 18 },
};

export const layoutFor = (orientation: TemplateProps['orientation']): Layout => (orientation === '竖屏' ? PORTRAIT : LANDSCAPE);

const INK = '#141516';
const MUTED = '#5b5f66';
const LINE = '#e3e4e6';
const PILL = '#f0f0f2';
const GREEN = '#1fc16b';

const FONT_UI = `${SANS}, sans-serif`;

/** 一行榜单。高亮行：整体放大（pop），近景时卡片往上多出 cardTop 个行高、往下多出 cardBottom 个（压住挨着它的两行，字不动），
 *  分数往上数（score），底下长出进度条（bar，0 到 1）。rank 是名次那一栏的数。 */
const Row: React.FC<{
  L: Layout;
  row: RowData;
  rank: number;
  hi: boolean;
  score: number;
  bar: number;
  unfold: number;
  pop: number;
  cardTop: number;
  cardBottom: number;
}> = ({ L, row, rank, hi, score, bar, unfold, pop, cardTop, cardBottom }) => {
  const tableW = L.tableRight - L.tableLeft;
  const pad = hi ? L.hiInset : 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: -pad,
        top: 0,
        width: tableW - 2 * pad,
        height: L.rowH,
        borderBottom: hi ? 'none' : `1px solid ${LINE}`,
        transform: hi ? `scaleX(${unfold}) scale(${pop})` : undefined,
        transformOrigin: '40% 50%', // 放大的轴心。量过：轴心在这附近时，名字往左偏出去的距离和字变大的倍数都对得上
        zIndex: hi ? 2 : 1,
        fontFamily: FONT_UI,
        color: INK,
      }}
    >
      {hi ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: -cardTop * L.rowH,
            bottom: -cardBottom * L.rowH,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #fbfffd 0%, #e9f9f0 52%, #d2f2e0 100%)',
            border: `1px solid ${cardTop > 0.01 ? 'rgba(143, 227, 192, 0.3)' : '#8fe3c0'}`, // 近景时卡片是软的，看不出边线
            borderRadius: 8,
            // 下面那层影子把紧挨着的下一行的字压暗，看起来就像那一行刚从卡片底下露出来
            boxShadow: '0 -6px 18px rgba(255, 255, 255, 0.9), 0 20px 34px rgba(16, 185, 129, 0.3), 0 34px 30px rgba(40, 60, 52, 0.16)',
          }}
        />
      ) : null}
      {/* 名次 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          width: L.rank.width,
          top: L.rank.top,
          textAlign: 'center',
          fontFamily: MONO,
          fontSize: L.rank.size,
          fontWeight: 600,
        }}
      >
        {rank}
      </div>
      <div
        style={{
          position: 'absolute',
          left: L.rank.width,
          top: hi ? -cardTop * L.rowH : 0,
          bottom: hi ? -cardBottom * L.rowH : 0,
          width: 1,
          background: LINE,
        }}
      />
      {/* 小方块、机构名、型号 */}
      <div
        style={{
          position: 'absolute',
          left: L.logo.left,
          top: L.logo.top,
          width: L.logo.box,
          height: L.logo.box,
          borderRadius: 5,
          color: row.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: L.logo.size,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {row.logo}
      </div>
      <div
        style={{
          position: 'absolute',
          left: L.lab.left,
          top: L.lab.top,
          fontSize: L.lab.size,
          fontWeight: 550,
          lineHeight: L.lab.line,
          whiteSpace: 'nowrap',
        }}
      >
        {row.lab}
      </div>
      <div
        style={{
          position: 'absolute',
          left: L.model.left,
          top: L.model.top,
          fontFamily: MONO,
          fontSize: L.model.size,
          lineHeight: L.model.line,
          color: MUTED,
          whiteSpace: 'nowrap',
        }}
      >
        {row.model}
      </div>
      {/* 分数 */}
      <div
        style={{
          position: 'absolute',
          left: L.score.left,
          width: L.score.width,
          top: L.score.top,
          textAlign: 'right',
          fontFamily: MONO,
          fontSize: L.score.size,
          fontWeight: 600,
          letterSpacing: '-0.3px',
        }}
      >
        {score}
      </div>
      <div
        style={{
          position: 'absolute',
          left: L.err.left,
          top: L.err.top,
          fontFamily: MONO,
          fontSize: L.err.size,
          color: MUTED,
        }}
      >
        {row.err}
      </div>
      {hi ? (
        <div
          style={{
            position: 'absolute',
            left: L.info.left,
            top: L.info.top,
            width: L.info.box,
            height: L.info.box,
            borderRadius: L.info.box / 2,
            border: `1px solid ${MUTED}`,
            color: MUTED,
            fontFamily: MONO,
            fontSize: L.info.size,
            textAlign: 'center',
            lineHeight: `${L.info.box - 1}px`,
          }}
        >
          i
        </div>
      ) : null}
      {hi ? (
        <div
          style={{
            position: 'absolute',
            left: L.bar.left,
            top: L.bar.top,
            width: L.bar.max * bar,
            height: L.bar.height,
            borderRadius: L.bar.height / 2,
            background: GREEN,
          }}
        />
      ) : null}
      {/* 另外两栏 */}
      <div
        style={{
          position: 'absolute',
          left: L.rank2.left,
          width: L.rank2.width,
          top: L.rank2.top,
          textAlign: 'right',
          fontFamily: MONO,
          fontSize: L.rank2.size,
          fontWeight: 500,
        }}
      >
        {row.rank}
      </div>
      <div
        style={{
          position: 'absolute',
          left: L.spread.left,
          width: L.spread.width,
          top: L.spread.top,
          textAlign: 'right',
          fontFamily: MONO,
          fontSize: L.spread.size,
          fontWeight: 500,
        }}
      >
        {row.spread}
      </div>
    </div>
  );
};

/**
 * 整个页面。榜单里除高亮行以外的行都固定在自己的格子上（第 0 格起，高亮行不算在内）；
 * 高亮行是“外来”的一行，停在第 slot 格上（可以是小数），它压在哪一格，那一行就被它盖住。
 * shift 是高亮行下面的行一起往下挪了多少像素：它停到最后一格之后，下面的人给它让出一格。
 */
export const Page: React.FC<{
  L: Layout;
  data: TemplateProps;
  score: number;
  bar: number;
  unfold: number;
  pop: number;
  slot: number;
  shift: number;
  cardTop: number; // 近景时高亮卡片往上多出几个行高
  cardBottom: number; // 往下多出几个行高
}> = ({ L, data, score, bar, unfold, pop, slot, shift, cardTop, cardBottom }) => {
  const hi = Math.min(data.highlight, data.rows.length - 1);
  const tableW = L.tableRight - L.tableLeft;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: L.w,
        height: L.h,
        fontFamily: FONT_UI,
        color: INK,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: L.cardLeft,
          top: L.cardTop,
          width: L.w - L.cardLeft - L.cardRight,
          height: L.cardBottom - L.cardTop,
          background: '#ffffff',
        }}
      >
        {/* 页面上的东西还是按画面坐标摆：白色那一层往两边延长了多少，这一层就往回挪多少 */}
        <div style={{ position: 'absolute', left: -L.cardLeft, top: 0, width: L.w, height: L.h }}>
          {/* 顶部导航 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: L.navH,
              borderBottom: `1px solid ${LINE}`,
              fontSize: 14,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: 0,
                height: L.navH,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 600,
              }}
            >
              ⌘ Overview
            </div>
            <div
              style={{
                position: 'absolute',
                left: 336,
                top: 5,
                display: 'flex',
                gap: 2,
              }}
            >
              {['Agent', 'Chat ▾', 'Code ▾', 'Image ▾', 'Video ▾'].map((t) => (
                <div
                  key={t}
                  style={{
                    padding: '6px 13px',
                    borderRadius: 8,
                    background: t.startsWith('Chat') ? PILL : 'transparent',
                    fontWeight: t.startsWith('Chat') ? 600 : 500,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div
              style={{
                position: 'absolute',
                right: 5,
                top: 4,
                padding: '7px 14px',
                borderRadius: 6,
                background: '#0b0b0c',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              Start Voting
            </div>
          </div>
          {/* 标题、标签、说明、小字 */}
          <div
            style={{
              position: 'absolute',
              left: L.title.left,
              top: L.title.top,
              fontFamily: DISPLAY_SERIF,
              fontSize: L.title.size,
              lineHeight: L.title.line,
            }}
          >
            {data.title}
          </div>
          <div
            style={{
              position: 'absolute',
              left: L.badge.left,
              top: L.badge.top,
              padding: '5px 11px',
              borderRadius: 6,
              background: PILL,
              fontSize: L.badge.size,
              fontWeight: 500,
            }}
          >
            {data.badge}
          </div>
          <div
            style={{
              position: 'absolute',
              left: L.description.left,
              top: L.description.top,
              fontSize: L.description.size,
              color: '#1d1f23',
              whiteSpace: 'nowrap',
            }}
          >
            {data.description}
          </div>
          <div
            style={{
              position: 'absolute',
              left: L.meta.left,
              top: L.meta.top,
              fontFamily: MONO,
              fontSize: L.meta.size,
              color: MUTED,
              display: 'flex',
              gap: 16,
              whiteSpace: 'nowrap',
            }}
          >
            {data.meta.map((m, i) => (
              <span key={i}>
                {['◷', '⊞', '☰', '⚑'][i % 4]} {m}
              </span>
            ))}
          </div>
          {/* 筛选工具条 */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: L.toolbar.top,
              width: '100%',
              height: L.toolbar.height,
              borderTop: `1px solid ${LINE}`,
              borderBottom: `1px solid ${LINE}`,
              fontSize: L.toolbar.size,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: 0,
                height: L.toolbar.height,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 550,
              }}
            >
              ⌘ Show Filters
            </div>
            <div
              style={{
                position: 'absolute',
                right: 14,
                top: 0,
                height: L.toolbar.height,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontWeight: 500 }}>Models</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 6,
                  background: PILL,
                  fontWeight: 600,
                }}
              >
                Labs
              </span>
              <span style={{ color: LINE }}>|</span>
              <span>A- ≡</span>
            </div>
          </div>
          {/* 表头 */}
          <div
            style={{
              position: 'absolute',
              left: L.tableLeft,
              width: tableW,
              top: L.tableTop - L.cardTop - L.headH,
              height: L.headH,
              fontSize: L.head.size,
              fontWeight: 600,
            }}
          >
            <div style={{ position: 'absolute', left: L.head.rank, top: L.head.top }}>
              {data.headers.rank} <span style={{ color: MUTED }}>⇕</span>
            </div>
            <div style={{ position: 'absolute', left: L.head.lab, top: L.head.top }}>
              {data.headers.lab} <span style={{ color: MUTED }}>⇕</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: L.head.score,
                top: L.head.top,
              }}
            >
              {data.headers.score} <span style={{ color: MUTED }}>ⓘ ↓</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: L.head.modelRank,
                top: L.head.top,
              }}
            >
              {data.headers.modelRank} <span style={{ color: MUTED }}>⇕</span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: L.head.spread,
                top: L.head.top,
              }}
            >
              {data.headers.spread} <span style={{ color: MUTED }}>ⓘ</span>
            </div>
          </div>
          {/* 榜单 */}
          <div
            style={{
              position: 'absolute',
              left: L.tableLeft,
              top: L.tableTop - L.cardTop,
              width: tableW,
              height: L.rowH * data.rows.length,
              overflow: 'visible',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                border: `1px solid ${LINE}`,
                borderTop: 'none',
              }}
            />
            {data.rows.map((row, i) => {
              const isHi = i === hi;
              const fixed = i - (i > hi ? 1 : 0); // 不算高亮行，它固定在第几格
              const below = !isHi && fixed >= slot - 0.49; // 在高亮行下面（紧挨着它下面那一格也算）
              const top = isHi ? slot * L.rowH : fixed * L.rowH + (below ? shift : 0);
              const rank = isHi ? Math.round(slot) + 1 : fixed + 1 + (below && shift > L.rowH / 2 ? 1 : 0);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top,
                    width: '100%',
                    height: L.rowH,
                  }}
                >
                  <Row L={L} row={row} rank={rank} hi={isHi} score={isHi ? score : row.score} bar={bar} unfold={unfold} pop={pop} cardTop={cardTop} cardBottom={cardBottom} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
