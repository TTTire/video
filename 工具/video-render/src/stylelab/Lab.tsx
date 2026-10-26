// 样式实验室：只用来出预览图，不接进任何一期，不参与正式渲染。
// 每一帧 = 一个方案。渲染：python scripts/lab.py all
// 文案和数字全部取自 ai02 发布清单「事实核对」，照片用 ai02 的真图。
import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {ThemeCtx} from '../ui';
import {FONTS, Photo, TITLE_FONT, useFonts} from '../photo/kit';

// ai02 的配色
const C = {
  bg: '#0A0806', bg2: '#1A1208', gold: '#E8833A', white: '#F4EFE6', dim: '#CFC6BA',
  coral: '#D9534F', teal: '#7FB89A', font: FONTS.sans, title: TITLE_FONT,
};
const INK = '#1A0E06';
const SHADOW = '0 4px 28px #000D, 0 1px 4px #000A';

// ---------- 基础 ----------
const Label: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{position: 'absolute', left: 90, top: 34, fontFamily: FONTS.sans, fontWeight: 700, fontSize: 28, color: '#FFFFFF80', letterSpacing: 3, textShadow: SHADOW}}>{children}</div>
);
const Bg: React.FC<{src: string; dim?: number; blur?: number; grad?: 'left' | 'top' | 'none' | 'all'}> = ({src, dim = 0.25, blur = 0, grad = 'left'}) => (
  <Photo src={staticFile(`ai02/photos/${src}.jpg`)} dur={300} zoom={[1.02, 1.08]} grad={grad} dim={dim} blur={blur} tint="#24170E" tintOpacity={0.25} />
);
const Hero: React.FC<{children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties}> = ({children, size, color, style}) => (
  <div style={{fontFamily: TITLE_FONT, fontWeight: 800, fontSize: size, color: color ?? C.white, lineHeight: 1.14, letterSpacing: 1, textShadow: SHADOW, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
const Sub: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 44, color, style}) => (
  <div style={{fontFamily: FONTS.sans, fontWeight: 700, fontSize: size, color: color ?? C.dim, lineHeight: 1.4, letterSpacing: 2, textShadow: SHADOW, ...style}}>{children}</div>
);
const Num: React.FC<{children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties}> = ({children, size, color, style}) => (
  <span style={{fontFamily: FONTS.num, fontWeight: 900, fontSize: size, color: color ?? C.gold, lineHeight: 1, letterSpacing: 0, fontVariantNumeric: 'tabular-nums', ...style}}>{children}</span>
);
const Em: React.FC<{children: React.ReactNode; color?: string}> = ({children, color}) => <span style={{color: color ?? C.gold}}>{children}</span>;

// ---------- 五种卡片（位置统一由外层 absolute 决定，卡片本身只管长相） ----------
const At: React.FC<{x?: number; y?: number; children: React.ReactNode}> = ({x = 90, y = 140, children}) => (
  <div style={{position: 'absolute', left: x, top: y}}>{children}</div>
);
const Solid: React.FC<{label?: string; children: React.ReactNode}> = ({label, children}) => (
  <div style={{background: C.gold, color: INK, borderRadius: 26, padding: '40px 60px 46px', boxShadow: `0 18px 0 #00000066, 0 40px 90px #000000AA`}}>
    {label && <div style={{fontFamily: FONTS.sans, fontWeight: 900, fontSize: 30, letterSpacing: 6, opacity: 0.6, marginBottom: 10}}>{label}</div>}
    {children}
  </div>
);
const Paper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{background: '#F2E8D8', color: '#1F1710', borderRadius: 6, padding: '46px 64px 50px', transform: 'rotate(-1.6deg)', boxShadow: '0 34px 80px #000000B0', backgroundImage: 'linear-gradient(180deg, #00000000 0%, #0000000A 100%)'}}>
    {children}
  </div>
);
const Notch: React.FC<{label?: string; children: React.ReactNode}> = ({label, children}) => (
  <div style={{position: 'relative', background: '#140E08E6', borderRadius: 20, padding: '36px 56px 40px 78px', boxShadow: '0 30px 80px #000000AA', backdropFilter: 'blur(14px)', border: '1px solid #FFFFFF14'}}>
    <div style={{position: 'absolute', left: 28, top: 36, bottom: 40, width: 10, borderRadius: 5, background: C.gold, boxShadow: `0 0 24px ${C.gold}AA`}} />
    {label && <div style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: 32, color: C.gold, letterSpacing: 5, marginBottom: 12}}>{label}</div>}
    {children}
  </div>
);
const TabCard: React.FC<{label: string; color?: string; children: React.ReactNode}> = ({label, color, children}) => (
  <div>
    <div style={{display: 'inline-block', background: color ?? C.coral, color: '#fff', fontFamily: FONTS.sans, fontWeight: 900, fontSize: 32, letterSpacing: 4, padding: '10px 30px 14px', borderRadius: '16px 16px 0 0', position: 'relative', top: 4}}>{label}</div>
    <div style={{background: '#120C07F0', borderRadius: '0 20px 20px 20px', padding: '36px 56px 40px', boxShadow: '0 30px 80px #000000AA', backdropFilter: 'blur(14px)', border: '1px solid #FFFFFF14'}}>{children}</div>
  </div>
);
// 叠卡（因果链）：主卡宽 820，+44 错位后总宽 952，不碰右侧图标区。
// 每张卡 overflow hidden + 副标题 nowrap/ellipsis：宁可省略，也不许换行撑出卡外盖住下一张。
const Stack: React.FC<{items: {big: string; small: string; color?: string}[]; w?: number}> = ({items, w = 820}) => (
  <div style={{position: 'relative', width: w + (items.length - 1) * 44, height: items.length * 122}}>
    {items.map((it, i) => {
      const last = i === items.length - 1;
      return (
        <div key={i} style={{
          position: 'absolute', left: i * 44, top: i * 122, width: w, boxSizing: 'border-box', borderRadius: 18, padding: '22px 40px',
          background: last ? C.gold : '#140E08EE', color: last ? INK : C.white, overflow: 'hidden',
          boxShadow: '0 22px 56px #000000AA', border: last ? 'none' : '1px solid #FFFFFF18', display: 'flex', alignItems: 'baseline', gap: 26,
        }}>
          <Num size={64} color={last ? INK : it.color ?? C.teal}>{it.big}</Num>
          <span style={{fontFamily: FONTS.sans, fontWeight: 800, fontSize: 36, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{it.small}</span>
        </div>
      );
    })}
  </div>
);

// 逐字入场：progress 0..1 是整句的进度，每个字错开 stagger 帧
const Stagger: React.FC<{text: string; size: number; t: number; stagger?: number; dur?: number; em?: [number, number]}> = ({text, size, t, stagger = 3, dur = 10, em}) => (
  <div style={{fontFamily: TITLE_FONT, fontWeight: 800, fontSize: size, lineHeight: 1.16, letterSpacing: 2, whiteSpace: 'nowrap'}}>
    {text.split('').map((ch, i) => {
      const p = Math.min(1, Math.max(0, (t - i * stagger) / dur));
      const k = 1 - Math.pow(1 - p, 3);
      const hot = em && i >= em[0] && i < em[1];
      return <span key={i} style={{display: 'inline-block', opacity: k, transform: `translateY(${(1 - k) * 0.5 * size}px)`, color: hot ? C.gold : C.white, textShadow: SHADOW}}>{ch}</span>;
    })}
  </div>
);

// ---------- 每一帧一个方案 ----------
const Frames: React.FC = () => {
  const f = useCurrentFrame();

  // 0 字号刻度：照片虚化，只看字
  if (f === 0) return (
    <AbsoluteFill>
      <Bg src="S12" dim={0.62} blur={10} grad="none" />
      <Label>字号刻度 · 1920×1080 原尺寸（现在 h 默认 66，实际多在 46–64）</Label>
      <div style={{position: 'absolute', left: 90, top: 110, width: 1740}}>
        {[
          {n: 'h 140 金句', s: 140, t: <>效率越高，<Em>总消耗越多</Em></>},
          {n: 'h 112 大字', s: 112, t: '瓦特蒸汽机省煤三分之二'},
          {n: 'h 88 中（新默认）', s: 88, t: '可英国一年挖的煤更多了'},
          {n: 'h 64 小（≈ 现在）', s: 64, t: '1865 年，杰文斯写了《煤炭问题》'},
        ].map((r) => (
          <div key={r.s} style={{display: 'flex', alignItems: 'center', gap: 28, marginBottom: 14}}>
            <div style={{width: 220, flexShrink: 0, fontFamily: FONTS.sans, fontWeight: 700, fontSize: 26, color: C.gold, letterSpacing: 1}}>{r.n}</div>
            <Hero size={r.s}>{r.t}</Hero>
          </div>
        ))}
        <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 4}}>
          <div style={{width: 220, flexShrink: 0, fontFamily: FONTS.sans, fontWeight: 700, fontSize: 26, color: C.gold}}>big 180（原 150）</div>
          <Num size={180}>520</Num><Num size={90} color={C.dim}>→</Num><Num size={180}>6250</Num><Sub size={44} style={{alignSelf: 'flex-end', paddingBottom: 20}}>万吨</Sub>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 28, marginTop: 14}}>
          <div style={{width: 220, flexShrink: 0, fontFamily: FONTS.sans, fontWeight: 700, fontSize: 26, color: C.gold}}>t 44（原 38）</div>
          <Sub size={44}>小字说明：手机竖屏看也不用眯眼</Sub>
        </div>
      </div>
    </AbsoluteFill>
  );

  // 1 solid：一句结论砸下来
  if (f === 1) return (
    <AbsoluteFill>
      <Bg src="S13" />
      <Label>① solid 实色块 · 金底黑字 + 硬投影 → 用在：结论、揭晓</Label>
      <At y={150}>
        <Solid label="1750 → 1850 · 英国">
          <Hero size={104} color={INK} style={{textShadow: 'none'}}>一百年，挖煤涨了<span style={{color: '#7A2C0C'}}>十多倍</span></Hero>
        </Solid>
      </At>
    </AbsoluteFill>
  );

  // 2 paper：原文引用
  if (f === 2) return (
    <AbsoluteFill>
      <Bg src="S10" grad="top" />
      <Label>② paper 纸片 · 米白、微斜、软阴影 → 用在：原文、书、新闻、账单</Label>
      <At y={130}>
        <Paper>
          <div style={{fontFamily: FONTS.sans, fontWeight: 700, fontSize: 28, color: '#8A7458', letterSpacing: 5}}>杰文斯《煤炭问题》· 1865 · 第 7 章</div>
          <div style={{fontFamily: FONTS.song, fontWeight: 900, fontSize: 100, color: '#1F1710', marginTop: 10, letterSpacing: 4}}>事实恰恰相反</div>
          <div style={{fontFamily: FONTS.kai, fontSize: 44, color: '#3E3226', marginTop: 16, paddingLeft: 20, borderLeft: '6px solid #C7A06A', lineHeight: 1.45}}>
            以为节省燃料就等于少烧燃料，<br />是彻底搞混了。
          </div>
          <div style={{fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 24, color: '#8A7458', marginTop: 18, maxWidth: 860, lineHeight: 1.4}}>
            “It is wholly a confusion of ideas to suppose that the economical use of fuel is equivalent to a diminished consumption.”
          </div>
        </Paper>
      </At>
    </AbsoluteFill>
  );

  // 3 notch：前提 / 定义
  if (f === 3) return (
    <AbsoluteFill>
      <Bg src="S01" />
      <Label>③ notch 竖条卡 · 左边一道强调色 → 用在：前提、定义、边界（替掉现在的 panel）</Label>
      <At y={250}>
        <Notch label="前提">
          <Hero size={88}>只在<Em>一种东西</Em>上成立</Hero>
          <Sub size={44} style={{marginTop: 14}}>便宜一点，就能冒出新用法</Sub>
        </Notch>
      </At>
    </AbsoluteFill>
  );

  // 4 tab：带分类标签的信息卡
  if (f === 4) return (
    <AbsoluteFill>
      <Bg src="S11" grad="top" />
      <Label>④ tab 标签卡 · 上面挂一个分类签（数据 / 反例 / 前提）→ 用在：一条数据、一个例子</Label>
      <At y={130}>
        <TabCard label="数据" color={C.teal}>
          <Sub size={40} color={C.dim}>瓦特改良的蒸汽机，干同样的活</Sub>
          <Hero size={96} style={{marginTop: 6}}>省煤 <Em>三分之二</Em> 以上</Hero>
        </TabCard>
      </At>
    </AbsoluteFill>
  );

  // 5 stack：三张卡错位叠放，最后一张是结论
  if (f === 5) return (
    <AbsoluteFill>
      <Bg src="S13" />
      <Label>⑤ stack 叠卡 · 三张依次推入，最后一张高亮 → 用在：因果链、清单</Label>
      <At y={140}>
        <Stack w={820} items={[
          {big: '↓ 2/3', small: '每台机器用的煤', color: C.teal},
          {big: '↑ 台数', small: '矿井 → 纺织厂 → 火车', color: C.coral},
          {big: '× 12', small: '一年挖的煤'},
        ]} />
      </At>
    </AbsoluteFill>
  );

  // 6 stagger：逐字入场，取动画进行到 2/3 的一帧
  if (f === 6) return (
    <AbsoluteFill>
      <Bg src="S12" grad="none" dim={0.35} />
      <Label>⑥ stagger 逐字入场 · 这是动画进行中的一帧：前面的字已站定，后面的还在往上浮</Label>
      <div style={{position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Stagger text="每一台省了，台数涨得更快" size={120} t={24} stagger={3} dur={10} em={[6, 12]} />
        <div style={{marginTop: 34, display: 'flex', gap: 24}}>
          <Sub size={34} color={C.gold}>stagger: 3</Sub>
          <Sub size={34}>12 个字 · 每字晚 3 帧 · 整句约 1.5 秒站稳</Sub>
        </div>
      </div>
    </AbsoluteFill>
  );

  // 7 三个字效
  if (f === 7) return (
    <AbsoluteFill>
      <Bg src="S12" grad="none" dim={0.45} />
      <Label>⑦ 三个字效 · 压在亮照片上也不发虚</Label>
      <div style={{position: 'absolute', left: 90, top: 140, display: 'flex', flexDirection: 'column', gap: 44}}>
        <div>
          <Sub size={30} color={C.gold}>outline 描边 → 金句的"空心版"，搭一行实心字</Sub>
          <div style={{fontFamily: TITLE_FONT, fontWeight: 800, fontSize: 150, lineHeight: 1.1, color: 'transparent', WebkitTextStroke: `4px ${C.gold}`, letterSpacing: 2}}>效率越高</div>
        </div>
        <div>
          <Sub size={30} color={C.gold}>gradient 渐变 → 一期只给一处，留给定义词</Sub>
          <div style={{fontFamily: TITLE_FONT, fontWeight: 800, fontSize: 150, lineHeight: 1.1, letterSpacing: 2, backgroundImage: `linear-gradient(96deg, ${C.gold} 0%, #FFD9A0 45%, ${C.coral} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>杰文斯悖论</div>
        </div>
        <div>
          <Sub size={30} color={C.gold}>reveal 擦出 → 这一帧擦到 65%，从左往右扫出来</Sub>
          <div style={{fontFamily: TITLE_FONT, fontWeight: 800, fontSize: 150, lineHeight: 1.1, color: C.white, letterSpacing: 2, textShadow: SHADOW, clipPath: 'inset(-20px 35% -20px -20px)'}}>总消耗越多</div>
        </div>
      </div>
    </AbsoluteFill>
  );

  // 8 组合：推荐的默认长相
  if (f === 8) return (
    <AbsoluteFill>
      <Bg src="S13" />
      <Label>⑧ 组合 · tab 卡 + 大数字 + 一句小字（推荐作为数据场景的默认长相）</Label>
      <At y={130}>
        <TabCard label="1750 → 1850 · 英国">
          <Sub size={44} color={C.white}>一年挖的煤</Sub>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 4}}>
            <Num size={110} color={C.dim}>520</Num>
            <Num size={80} color={C.dim}>→</Num>
            <Num size={180}>6250</Num>
            <Sub size={48} color={C.white}>万吨</Sub>
          </div>
          <Sub size={40} style={{marginTop: 12}}>每一台省了，<Em>台数涨得更快</Em></Sub>
        </TabCard>
      </At>
    </AbsoluteFill>
  );

  return <AbsoluteFill style={{background: '#000'}} />;
};

export const Lab: React.FC = () => {
  useFonts();
  return <ThemeCtx.Provider value={C}><Frames /></ThemeCtx.Provider>;
};
export default Lab;
