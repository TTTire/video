// AI经济学 02「AI越便宜你花得越多」的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几句，at(p, i) 是第 i 句开始的帧。
// 本期图表语言：阶梯（用量两年一跳）、公式卡（单价 × 用量）、表格（降到 1/4 后三种用量的结果）。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {FlyIn, Sfx} from '../fx';
import {Box, FONTS, H, P, T, at, clamp, ease, SHADOW, SAFE_RIGHT_X} from '../photo/kit';
import {CustomMap} from '../photo/engine';

const NUM = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums' as const, letterSpacing: 0};
const grow = (f: number, a: number, len = 22) => interpolate(f, [a, a + len], [0, 1], {...clamp, easing: ease});
const fadeOut = (f: number, a: number, len = 16) => 1 - grow(f, a, len);

// ---------- 阶梯图：几级台阶依次长出来，最后一级金色，右侧砸出倍数 ----------
type StepDef = {label: string; value: string; at: number};
type StepCfg = {
  title: string; titleAt?: number;           // 顶部小标题，哪一句出
  rows: StepDef[];                            // 每级台阶：下方年份 / 上方数值 / 哪一句出
  final?: {text: string; sub?: string; at: number};   // 倍数（×1000+）及其小字，哪一句出
  x: number; w: number;                       // 图表占的横向区域
  base?: number;                              // 台阶底边 y（默认 690，标签在它下面，不进字幕区）
  hideAt?: number;                            // 到哪一句整体淡出
  note?: string;                              // 右下角注释（示意 / 口径）
  extra?: {text: string; at: number};         // 台阶下面再补一行（Anthropic 收入 ×12）
  backdrop?: number;                          // 图表在时把整张照片压暗多少（人脸多的图用）
};
const StepChart: React.FC<P & StepCfg> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const t0 = at(p, p.titleAt ?? 0);
  if (p.step < (p.titleAt ?? 0)) return null;
  const hide = p.hideAt !== undefined && p.step >= p.hideAt ? fadeOut(f, at(p, p.hideAt)) : 1;
  if (hide <= 0) return null;
  const base = p.base ?? 690;
  const n = p.rows.length;
  const hasFinal = !!p.final;
  const stairsW = hasFinal ? p.w * 0.6 : p.w;
  const stepW = stairsW / n;
  const blockW = Math.min(300, stepW - 40);
  const hMin = 130, hMax = Math.min(430, base - 280);   // 最高一级的数值标签不碰到顶部标题
  const bd = p.backdrop ? grow(f, t0, 20) * hide : 0;
  return (
    <div style={{opacity: hide}}>
      {bd > 0 && <div style={{position: 'absolute', inset: 0, background: C.bg, opacity: (p.backdrop ?? 0) * bd}} />}
      <Box x={p.x} y={130} w={p.w}>
        <FlyIn at={t0} dir="up" dist={60}><T size={34} style={{letterSpacing: 4}}>{p.title}</T></FlyIn>
      </Box>
      {/* 底线 */}
      <div style={{position: 'absolute', left: p.x, width: stairsW, top: base, height: 3, background: `${C.white}55`, opacity: grow(f, t0, 20)}} />
      {p.rows.map((s, i) => {
        if (p.step < s.at) return null;
        const a = at(p, s.at);
        const g = grow(f, a, 26);
        const h = hMin + (hMax - hMin) * (n === 1 ? 1 : i / (n - 1));
        const last = i === n - 1;
        const color = last ? C.gold : `${C.white}CC`;
        const cx = p.x + stepW * i + stepW / 2;
        return (
          <React.Fragment key={i}>
            <Sfx at={a} name={last ? 'impact' : 'swipe'} vol={last ? 0.4 : 0.28} />
            {/* 台阶 */}
            <div style={{position: 'absolute', left: cx - blockW / 2, width: blockW, top: base - h * g, height: h * g, background: color, borderRadius: '12px 12px 0 0', boxShadow: last ? `0 0 36px ${C.gold}77` : 'none'}} />
            {/* 台阶踏面连到下一级的虚线（阶梯感） */}
            {!last && p.step >= p.rows[i + 1].at && (
              <div style={{position: 'absolute', left: cx + blockW / 2, width: stepW - blockW, top: base - h - 1, height: 0, borderTop: `3px dashed ${C.white}55`, opacity: grow(f, at(p, p.rows[i + 1].at), 20)}} />
            )}
            {/* 数值 */}
            <div style={{position: 'absolute', left: cx - stepW / 2, width: stepW, top: base - h - 86, textAlign: 'center', opacity: g, fontSize: last ? 64 : 52, fontWeight: 900, color: last ? C.gold : C.white, textShadow: SHADOW, ...NUM, whiteSpace: 'nowrap'}}>{s.value}</div>
            {/* 年份 */}
            <div style={{position: 'absolute', left: cx - stepW / 2, width: stepW, top: base + 14, textAlign: 'center', opacity: g, fontFamily: C.font, fontSize: 32, color: C.dim, fontWeight: 700, whiteSpace: 'nowrap'}}>{s.label}</div>
          </React.Fragment>
        );
      })}
      {p.final && p.step >= p.final.at && (
        <>
          <Sfx at={at(p, p.final.at)} name="ding" vol={0.35} />
          <div style={{position: 'absolute', left: p.x + stairsW + 20, width: p.w - stairsW - 20, top: base - 300, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
            <FlyIn at={at(p, p.final.at)} dir="up" dist={120}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: 150, fontWeight: 900, lineHeight: 1, color: C.gold, textShadow: SHADOW, ...NUM, whiteSpace: 'nowrap'}}>{p.final.text}</div>
                {p.final.sub && <div style={{fontFamily: C.title ?? C.font, fontSize: 44, color: C.white, textShadow: SHADOW, marginTop: 10}}>{p.final.sub}</div>}
              </div>
            </FlyIn>
          </div>
        </>
      )}
      {p.extra && p.step >= p.extra.at && (
        <Box x={p.x} y={base + 64} w={p.w}>
          <Sfx at={at(p, p.extra.at)} name="ding" vol={0.3} />
          <FlyIn at={at(p, p.extra.at)} dir="up" dist={60}>
            <H size={46} color={C.white}>{p.extra.text.split('**').map((s, i) => i % 2 ? <span key={i} style={{color: C.gold, ...NUM, fontSize: 64}}>{s}</span> : s)}</H>
          </FlyIn>
        </Box>
      )}
      {p.note && <div style={{position: 'absolute', left: p.x, width: p.w, top: base + 56, textAlign: 'right', fontFamily: C.font, fontSize: 24, color: `${C.dim}99`, opacity: grow(f, t0 + 20, 20)}}>{p.note}</div>}
    </div>
  );
};

// 国内一天用掉的 token：1000 亿 → 140 万亿，两年 ×1000+（S03 城市夜景，字在上方）
const ChinaSteps: React.FC<P> = (p) => (
  <StepChart {...p} title="全国一天用掉的 token" titleAt={1} x={260} w={1260} base={660}
    rows={[{label: '2024 年初', value: '1000 亿', at: 2}, {label: '2026 年 3 月', value: '140 万亿', at: 3}]}
    final={{text: '×1000+', sub: '两年', at: 4}} note="来源：国家数据局，台阶高度为示意" />
);

// 每人每月用掉的流量：205 MB → 18 GB，×90（S07 地铁，第 9 句淡出让位给信通院那句）
const TrafficSteps: React.FC<P> = (p) => (
  <StepChart {...p} title="每人每月用掉的手机流量" titleAt={6} x={260} w={1260} base={660} hideAt={9} backdrop={0.5}
    rows={[{label: '2014 年', value: '205 MB', at: 6}, {label: '2024 年', value: '18 GB', at: 7}]}
    final={{text: '×90', sub: '十年', at: 8}} note="来源：工信部通信业统计公报" />
);

// 英国一年挖的煤：520 万吨 → 6250 万吨，×12（S13 火车头在左，图表放右侧；第 6 句整体压暗出定义卡）
const CoalSteps: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const dimIn = p.step >= 6 ? grow(f, at(p, 6), 20) : 0;
  return (
    <>
      <StepChart {...p} title="英国一年挖出的煤" titleAt={0} x={90} w={780} base={600} hideAt={6}
        rows={[{label: '1750 年', value: '≈520 万吨', at: 1}, {label: '1850 年', value: '≈6250 万吨', at: 2}]}
        final={{text: '×12', sub: '一百年', at: 3}} note="来源：Lancaster University · 历史估算" />
      {p.step >= 4 && p.step < 6 && (
        <Box x={90} y={690} w={780}>
          <FlyIn at={at(p, 4)} dir="up" dist={60}><H size={46} color={C.white}><span style={{color: C.dim}}>每一台是省了</span>{p.step >= 5 && <>，可台数涨得<span style={{color: C.gold}}>更快</span></>}</H></FlyIn>
        </Box>
      )}
      {dimIn > 0 && <div style={{position: 'absolute', inset: 0, background: C.bg, opacity: 0.62 * dimIn}} />}
    </>
  );
};

// 谷歌每月处理的 token：9.7 万亿 → 3200 万亿+，×330；下面补一行 Anthropic 收入 ×12（S14 机房长廊，居中）
const GoogleSteps: React.FC<P> = (p) => (
  <StepChart {...p} title="谷歌每个月处理的 token" titleAt={1} x={260} w={1260} base={620}
    rows={[{label: '2024 年 5 月', value: '9.7 万亿', at: 2}, {label: '2026 年 5 月', value: '3200 万亿+', at: 3}]}
    final={{text: '×330', sub: '两年', at: 4}} extra={{text: 'Anthropic 2025 年收入 **×12**', at: 7}} note="来源：Google I/O 2026 · 路透社" />
);

// ---------- 公式卡：账单 = 单价 × 用量 ----------
const FormulaCard: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s1 = at(p, 1), s2 = at(p, 2), s3 = at(p, 3), s4 = at(p, 4);
  const half = p.step >= 4;
  const cell = (txt: string, a: number, hot: boolean, fade: boolean) => (
    <div style={{display: 'flex', justifyContent: 'center', opacity: fade ? 0.35 : 1}}>
      <FlyIn at={a} dir="up" dist={80}>
        <div style={{fontFamily: C.title ?? C.font, fontWeight: 800, fontSize: 120, lineHeight: 1, color: hot ? C.gold : C.white, textShadow: SHADOW, padding: '14px 10px', borderBottom: hot ? `6px solid ${C.gold}` : '6px solid transparent'}}>{txt}</div>
      </FlyIn>
    </div>
  );
  const op = (txt: string, a: number) => <div style={{display: 'flex', justifyContent: 'center'}}><FlyIn at={a} dir="up" dist={80}><div style={{fontSize: 100, color: C.dim, fontWeight: 900, lineHeight: 1, ...NUM}}>{txt}</div></FlyIn></div>;
  const sub = (txt: string, a: number, color: string) => (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      <Sfx at={a} name="pop" vol={0.3} />
      <FlyIn at={a} dir="down" dist={50}>
        <div style={{fontFamily: C.font, fontWeight: 800, fontSize: 36, color: C.bg, background: color, borderRadius: 12, padding: '8px 22px', boxShadow: '0 10px 30px #0008', whiteSpace: 'nowrap'}}>{txt}</div>
      </FlyIn>
    </div>
  );
  // 五列网格：账单 | = | 单价 | × | 用量，标签挂在第 3、5 列下面，天然对齐
  const cols = '320px 150px 320px 150px 320px';
  return (
    <>
      <Box x={90} y={150} w={1740} style={{alignItems: 'center'}}>
        <FlyIn at={0} dir="up" dist={60}><T size={40} style={{letterSpacing: 4}}>账单其实是一道乘法</T></FlyIn>
      </Box>
      {p.step >= 1 && (
        <>
          <Sfx at={s1} name="impact" vol={0.4} />
          <div style={{position: 'absolute', left: (1920 - 1260) / 2, top: 300, width: 1260, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', rowGap: 28}}>
            {cell('账单', s1, false, false)}
            {op('=', s1 + 6)}
            {cell('单价', s1 + 12, half, false)}
            {op('×', s1 + 18)}
            {cell('用量', s1 + 24, false, half)}
            <div />
            <div />
            {p.step >= 2 ? sub('厂商定', s2, C.dim) : <div />}
            <div />
            {p.step >= 3 ? sub('你自己定', s3, C.teal) : <div />}
          </div>
        </>
      )}
      {half && (
        <>
          <Sfx at={s4} name="swipe" vol={0.4} />
          <Box x={90} y={600} w={1740} style={{alignItems: 'center'}}>
            <FlyIn at={s4} dir="up" dist={80}><H size={64} align="center">降价新闻，只告诉了你<span style={{color: C.gold}}>前一半</span></H></FlyIn>
          </Box>
        </>
      )}
    </>
  );
};

// ---------- 表格：价格降到 ¼ 之后，用量涨多少 → 总花费 ----------
const ROWS: {use: string; cost: string; verdict: string; tone: 'good' | 'flat' | 'bad'; at: number; verdictAt: number}[] = [
  {use: '×2', cost: '×0.5', verdict: '真省钱', tone: 'good', at: 4, verdictAt: 5},
  {use: '×4', cost: '×1', verdict: '正好打平', tone: 'flat', at: 6, verdictAt: 6},
  {use: '×10', cost: '×2.5', verdict: '多花了', tone: 'bad', at: 7, verdictAt: 8},
];
const ElasticTable: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  if (p.step < 2) return null;
  const s2 = at(p, 2), s3 = at(p, 3);
  const tone = {good: C.teal, flat: C.white, bad: C.coral};
  const colW = [420, 460, 360];
  const X = (1920 - (colW[0] + colW[1] + colW[2])) / 2;
  return (
    <>
      <Box x={90} y={140} w={1740} style={{alignItems: 'center'}}>
        <FlyIn at={s2} dir="up" dist={60}><T size={38} style={{letterSpacing: 4}}>打个比方</T></FlyIn>
        {p.step >= 3 && (
          <FlyIn at={s3} dir="up" dist={80}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
              <H size={64}>价格降到原来的</H>
              <H size={110} color={C.gold} style={{lineHeight: 1, ...NUM}}>¼</H>
            </div>
          </FlyIn>
        )}
      </Box>
      {p.step >= 4 && (
        <div style={{position: 'absolute', left: X, top: 390, width: colW[0] + colW[1] + colW[2]}}>
          <Sfx at={at(p, 4)} name="flip" vol={0.35} />
          {/* 表头 */}
          <div style={{display: 'grid', gridTemplateColumns: colW.map((w) => `${w}px`).join(' '), opacity: grow(f, at(p, 4), 16), borderBottom: `2px solid ${C.white}44`, paddingBottom: 8}}>
            {['用量', '总花费', ''].map((h, i) => <T key={i} size={30} style={{textAlign: 'center', letterSpacing: 4}}>{h}</T>)}
          </div>
          {ROWS.map((r, i) => {
            if (p.step < r.at) return null;
            const a = at(p, r.at);
            const g = grow(f, a, 18);
            const costOn = p.step >= r.verdictAt;
            const av = at(p, r.verdictAt);
            const gv = costOn ? grow(f, av, 18) : 0;
            const col = tone[r.tone];
            const hot = r.tone === 'bad' && costOn;
            return (
              <div key={i} style={{display: 'grid', gridTemplateColumns: colW.map((w) => `${w}px`).join(' '), alignItems: 'center', height: 104, opacity: g, transform: `translateY(${(1 - g) * 30}px)`, borderBottom: `1px solid ${C.white}22`, background: hot ? `${C.coral}1A` : 'transparent'}}>
                <Sfx at={a} name="tick" vol={0.25} />
                {costOn && <Sfx at={av} name={r.tone === 'bad' ? 'error' : r.tone === 'good' ? 'cash' : 'ding'} vol={r.tone === 'bad' ? 0.45 : 0.3} />}
                <div style={{textAlign: 'center', fontSize: 68, fontWeight: 900, color: C.white, textShadow: SHADOW, ...NUM}}>{r.use}</div>
                <div style={{textAlign: 'center', fontSize: hot ? 84 : 68, fontWeight: 900, color: col, textShadow: SHADOW, opacity: gv, transform: `scale(${hot ? 1 + 0.04 * Math.sin((f - av) / 4) : 1})`, ...NUM}}>{r.cost}</div>
                <div style={{textAlign: 'center', fontFamily: C.title ?? C.font, fontWeight: 800, fontSize: 44, color: col, textShadow: SHADOW, opacity: gv}}>{r.verdict}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export const CUSTOMAI02: CustomMap = {chinaSteps: ChinaSteps, trafficSteps: TrafficSteps, coalSteps: CoalSteps, googleSteps: GoogleSteps, formulaCard: FormulaCard, elasticTable: ElasticTable};
