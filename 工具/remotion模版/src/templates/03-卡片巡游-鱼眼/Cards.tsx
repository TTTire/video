import React from 'react';
import {HANS, SANS} from '../../shared/fonts';
import {TemplateProps} from './schema';

type Data = TemplateProps['cards'];
type ListData = Data['bars'];

const UI = `${SANS}, ${HANS}`;
const INK = '#1b1c1e';
const MUTED = '#8a8d86';
const FAINT = '#b0b2ac';
const LINE = '#ececea';
const GREEN = '#1d9e4a';
const RED = '#c6366f';

/** 卡片的底：近白、大圆角、下面一团软影。左上角在 (0, 0)，怎么摆到画面里由 space.ts 的矩阵管。 */
const CARD: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  boxSizing: 'border-box',
  background: '#fcfcfa',
  borderRadius: 26,
  fontFamily: UI,
  color: INK,
  boxShadow: '0 40px 80px rgba(0, 0, 0, 0.3)',
};

/** 横条卡：标题、右上角的 View All、下面几行“名字 + 数 + 一根条”。内容量自参考第 110 帧（那时卡片宽 665，这里按 860 从头排）。 */
export const BarsCard: React.FC<{d: ListData; color: string}> = ({d, color}) => (
  <div style={{...CARD, width: 860, height: 480, padding: '42px 48px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <span style={{fontSize: 27, fontWeight: 700}}>{d.heading}</span>
      <span style={{fontSize: 22, color: MUTED}}>{d.viewAll}</span>
    </div>
    {d.rows.map((r, i) => (
      <div key={i} style={{marginTop: 26}}>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 27}}>
          <span>{r.name}</span>
          <span style={{fontWeight: 500}}>{r.value}</span>
        </div>
        <div style={{fontSize: 15, color: FAINT, margin: '6px 0 3px'}}>{r.note ?? ''}</div>
        <div style={{height: 9, borderRadius: 5, background: '#e8e9e4'}}>
          <div style={{width: `${Math.max(0, Math.min(1, r.bar ?? 0)) * 100}%`, height: '100%', borderRadius: 5, background: color}} />
        </div>
      </div>
    ))}
  </div>
);

/** 清单卡：标题、View All、几行“行首小圆圈 + 名字和类别 + 右边的数”，行与行之间有一条细线。量自参考第 216 帧（卡片 660×570）。 */
export const ListCard: React.FC<{d: ListData}> = ({d}) => (
  <div style={{...CARD, width: 650, height: 560, padding: '38px 42px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
      <span style={{fontSize: 25, fontWeight: 700}}>{d.heading}</span>
      <span style={{fontSize: 20, color: MUTED}}>{d.viewAll}</span>
    </div>
    {d.rows.map((r, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 90,
          marginTop: i === 0 ? 10 : 0,
          borderTop: i === 0 ? 'none' : `1px solid ${LINE}`,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            background: r.tint ?? '#f1f2ee',
            color: r.iconColor ?? MUTED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          {r.icon ?? ''}
        </div>
        <div style={{marginLeft: 18, flex: 1}}>
          <div style={{fontSize: 25, lineHeight: '28px'}}>{r.name}</div>
          <div style={{fontSize: 17, color: MUTED, marginTop: 2}}>{r.note ?? ''}</div>
        </div>
        <div style={{fontSize: 24, fontWeight: 500, color: r.tone === 'neg' ? RED : r.tone === 'pos' ? GREEN : INK}}>{r.value}</div>
      </div>
    ))}
  </div>
);

/** 发票卡。量自参考第 165 帧（卡片差不多是方的）。 */
export const InvoiceCard: React.FC<{d: Data['invoice']}> = ({d}) => (
  <div style={{...CARD, width: 640, height: 650, padding: '38px 40px'}}>
    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
      <div style={{fontSize: 31, fontWeight: 700}}>{d.company}</div>
      <div style={{textAlign: 'right'}}>
        <div style={{fontSize: 25, fontWeight: 700}}>{d.docLabel}</div>
        <div style={{fontSize: 15, marginTop: 2}}>
          <span style={{color: MUTED}}>{d.meta} • </span>
          <span style={{color: '#c98a1c'}}>{d.status}</span>
        </div>
      </div>
    </div>
    <div style={{marginTop: 20, padding: '20px 26px', borderRadius: 12, background: '#f5f5f2', display: 'flex'}}>
      {[d.billTo, d.from].map((col, i) => (
        <div key={i} style={{width: '50%'}}>
          <div style={{fontSize: 16, color: MUTED}}>{i === 0 ? 'Bill to' : 'From'}</div>
          <div style={{fontSize: 21, fontWeight: 700, marginTop: 6}}>{col[0]}</div>
          <div style={{fontSize: 19, marginTop: 4}}>{col[1]}</div>
          <div style={{fontSize: 19, marginTop: 2}}>{col[2]}</div>
        </div>
      ))}
    </div>
    <div style={{display: 'flex', marginTop: 22}}>
      {[['Issue date', d.issueDate], ['Due date', d.dueDate]].map(([k, v], i) => (
        <div key={i} style={{width: '50%'}}>
          <div style={{fontSize: 16, color: MUTED}}>{k}</div>
          <div style={{fontSize: 19, marginTop: 4}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginTop: 24, fontSize: 16, color: MUTED, background: '#f8f8f5', padding: '10px 16px', display: 'flex'}}>
      {[46, 18, 18, 18].map((w, i) => (
        <div key={i} style={{width: `${w}%`, textAlign: i === 0 ? 'left' : 'right'}}>
          {d.cols[i]}
        </div>
      ))}
    </div>
    <div style={{padding: '16px 16px 14px', fontSize: 21, borderBottom: `1px solid ${LINE}`, display: 'flex'}}>
      {[46, 18, 18, 18].map((w, i) => (
        <div key={i} style={{width: `${w}%`, textAlign: i === 0 ? 'left' : 'right'}}>
          {[d.item.desc, d.item.qty, d.item.rate, d.item.amount][i]}
        </div>
      ))}
    </div>
    <div style={{marginTop: 14, marginLeft: 'auto', width: 260, fontSize: 18}}>
      <div style={{display: 'flex', justifyContent: 'space-between'}}>
        <span style={{color: MUTED}}>{d.subtotalLabel}</span>
        <span>{d.subtotal}</span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 4}}>
        <span style={{color: MUTED}}>{d.taxLabel}</span>
        <span>{d.tax}</span>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 24, fontWeight: 700}}>
        <span>{d.totalLabel}</span>
        <span>{d.total}</span>
      </div>
    </div>
  </div>
);

/** 环形图卡。参考里它只有很小的一块能看清（第 216、256 帧），字号是按比例放大的。 */
export const DonutCard: React.FC<{d: Data['donut']}> = ({d}) => {
  const R = 82;
  const C = 2 * Math.PI * R;
  let at = 0.25; // 从正上方起笔
  return (
    <div style={{...CARD, width: 340, height: 430, padding: '30px 34px'}}>
      <div style={{fontSize: 20, fontWeight: 600, color: MUTED}}>{d.heading}</div>
      <div style={{position: 'relative', width: 220, height: 220, margin: '22px auto 0'}}>
        <svg width={220} height={220} viewBox="0 0 220 220">
          <circle cx={110} cy={110} r={R} fill="none" stroke="#ededea" strokeWidth={26} />
          {d.legend.map((l, i) => {
            const len = C * l.share;
            const el = <circle key={i} cx={110} cy={110} r={R} fill="none" stroke={l.color} strokeWidth={26} strokeDasharray={`${Math.max(0, len - 3)} ${C - Math.max(0, len - 3)}`} strokeDashoffset={-C * at + 1.5} />;
            at += l.share;
            return el;
          })}
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontSize: 32, fontWeight: 700}}>{d.center}</div>
          <div style={{fontSize: 14, color: MUTED}}>{d.centerLabel}</div>
        </div>
      </div>
      <div style={{marginTop: 20}}>
        {d.legend.map((l, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', height: 38}}>
            <span style={{width: 26, height: 9, borderRadius: 5, background: l.color, marginRight: 12}} />
            <span style={{fontSize: 19}}>{l.name}</span>
            <span style={{marginLeft: 'auto', fontSize: 19}}>{l.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** 带一个蓝色按钮的小卡。参考里只有右边一角能看见（第 340 帧），标题的后半截是猜的。 */
export const ExpenseCard: React.FC<{d: Data['expense']}> = ({d}) => (
  <div style={{...CARD, width: 400, height: 260, padding: '30px 34px'}}>
    <div style={{fontSize: 21, fontWeight: 700, letterSpacing: 1.5, color: MUTED}}>{d.heading}</div>
    <div style={{marginTop: 18, height: 96, borderRadius: 16, background: d.buttonColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 600}}>
      {d.button}
    </div>
    <div style={{marginTop: 18, display: 'flex', alignItems: 'center', fontSize: 18, color: MUTED}}>
      <span style={{width: 14, height: 14, borderRadius: 7, background: d.buttonColor, marginRight: 10}} />
      {d.label}
    </div>
  </div>
);
