// 文档页（文件高亮风格）：网格黑底 + 原文页滑入 + 荧光黄高亮 + 聚焦放大 + 硬翻页。
// 设计和字段见 工具/video-broll-maker/references/document-highlight.md「DocPage」。
// 新期在自己的 custom.tsx 里注册成 doc，场景里写 "doc": {...} + {"type": "custom", "name": "doc"}。
// 不改 engine.tsx，已发布各期渲染不变。
//
// 版式：文档页在右侧窗口 DOC_WIN（x 1020–1620、y 60–820：不进字幕区和抖音图标区），
// 左列 x 90–990 放中文摘句 / 译文（场景里的 h / t，写进 box "left"）；这一场写 "arollSide": "right"，出镜小圆在右上（x ≥ 1640）。
import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Sfx} from '../fx';
import {P, at, clamp} from './kit';
import type {SceneSpec} from './engine';
// 背景网格：工具/论文背景.png（用户 2026-11-15 给的）从 (29, 29) 切 600×600，正好 10×10 格，平铺无缝：每 60 px 一条 2 px 灰线
import gridBg from '../../assets/docpage/grid.png';

type Box = [number, number, number, number];   // 页面截图上的归一化框 [x, y, w, h]
// at / delay：场景内第几条要点开始后第几帧；page：pages 下标（和上一拍不同 = 硬翻）；
// hl：高亮框（同一页累积，最新一拍的亮、之前的变淡；clear 清掉之前的）；focus：聚焦框，null 回整页，不写沿用上一拍
export type DocBeat = {at?: number; delay?: number; page: number; hl?: Box[]; clear?: boolean; focus?: Box | null};
export type DocSpec = {pages: {src: string; w: number; h: number}[]; beats: DocBeat[]; enter?: 'slide' | 'none'; maxZoom?: number};

export const DOC_WIN = {x: 1020, y: 60, w: 600, h: 760};
const MOVE = 22;   // 聚焦平移 / 缩放（帧）
const FLIP = 14;   // 硬翻：前一半旧页压扁，后一半新页展开
const SLIDE = 18;  // 第一拍从下往上滑入
const WIPE = 12;   // 高亮从左往右擦出
const HL = '#F2F10A';   // 高亮色固定荧光黄（用户 2026-11-15 定，不跟本期 gold）；multiply 叠在白纸上，黑字照样黑
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type View = {scale: number; cx: number; cy: number};   // 页面像素 → 画布的缩放；窗口中心对准页面上哪一点（归一化）
// 整页放进窗口，四周留 2% 边
const fitView = (pw: number, ph: number): View => ({scale: Math.min(DOC_WIN.w / pw, DOC_WIN.h / ph) * 0.96, cx: 0.5, cy: 0.5});

export const DocPage: React.FC<P & {spec: SceneSpec}> = (p) => {
  const f = useCurrentFrame();
  const doc = (p.spec as SceneSpec & {doc?: DocSpec}).doc;
  if (!doc || !doc.beats.length) return null;
  const maxZoom = doc.maxZoom ?? 4;
  const beats = doc.beats.map((b) => ({...b, t: at(p, b.at ?? 0) + (b.delay ?? 0)}));
  const t0 = beats[0].t;
  if (f < t0) return null;

  let cur = 0;
  beats.forEach((b, i) => { if (f >= b.t) cur = i; });
  // 每一拍实际用的聚焦框：focus 不写就沿用同一页上一拍的
  const focusOf: (Box | null)[] = [];
  beats.forEach((b, i) => {
    const prevSame = i > 0 && beats[i - 1].page === b.page;
    focusOf.push(b.focus !== undefined ? b.focus : prevSame ? focusOf[i - 1] : null);
  });
  const viewOf = (i: number): View => {
    const pg = doc.pages[beats[i].page];
    const fit = fitView(pg.w, pg.h);
    const b = focusOf[i];
    if (!b) return fit;
    const s = Math.min(fit.scale * maxZoom, (DOC_WIN.w * 0.92) / (b[2] * pg.w), (DOC_WIN.h * 0.55) / (b[3] * pg.h));
    return {scale: Math.max(s, fit.scale), cx: b[0] + b[2] / 2, cy: b[1] + b[3] / 2};
  };

  const b = beats[cur];
  const flipping = cur > 0 && beats[cur - 1].page !== b.page && f < b.t + FLIP;
  const firstHalf = flipping && f < b.t + FLIP / 2;
  const shown = firstHalf ? cur - 1 : cur;   // 画哪一拍的页（翻页前一半还是旧页）
  let view = viewOf(shown);
  let flipX = 1;
  if (flipping) {
    const k = (f - b.t) / (FLIP / 2);
    flipX = firstHalf ? 1 - k : k - 1;
  } else if (cur > 0 && beats[cur - 1].page === b.page) {
    const v0 = viewOf(cur - 1);
    const k = easeInOut(interpolate(f, [b.t, b.t + MOVE], [0, 1], clamp));
    view = {scale: v0.scale + (view.scale - v0.scale) * k, cx: v0.cx + (view.cx - v0.cx) * k, cy: v0.cy + (view.cy - v0.cy) * k};
  }
  const page = doc.pages[beats[shown].page];
  const W = page.w * view.scale, H = page.h * view.scale;
  const left = DOC_WIN.w / 2 - view.cx * W, top = DOC_WIN.h / 2 - view.cy * H;
  const slide = doc.enter === 'none' ? 1 : interpolate(f, [t0, t0 + SLIDE], [0, 1], {...clamp, easing: easeInOut});

  // 每一拍这一页真正开始的帧：翻页那一拍要等翻完；enter none 的第一拍是接着上一场，当作早已开始
  const startOf = (i: number) => (i === 0 && doc.enter === 'none' ? beats[0].t - MOVE : beats[i].t + (i > 0 && beats[i - 1].page !== beats[i].page ? FLIP : 0));
  // 这一页上已经出过的高亮：换页或 clear 从头算
  let hls: {box: Box; t: number; fresh: boolean}[] = [];
  for (let i = 0; i <= shown; i++) {
    const bb = beats[i];
    if (i > 0 && beats[i - 1].page !== bb.page) hls = [];
    if (bb.clear) hls = [];
    (bb.hl ?? []).forEach((box) => hls.push({box, t: startOf(i), fresh: i === shown}));
  }
  // 聚焦时窗口里只留最新高亮（没有就留聚焦框）亮着，其余压暗
  const foc = flipping ? null : focusOf[shown];
  const fresh = hls.filter((h) => h.fresh).map((h) => h.box);
  const hole: Box | null = !foc ? null : !fresh.length ? foc : fresh.reduce((u, x) => {
    const x0 = Math.min(u[0], x[0]), y0 = Math.min(u[1], x[1]);
    return [x0, y0, Math.max(u[0] + u[2], x[0] + x[2]) - x0, Math.max(u[1] + u[3], x[1] + x[3]) - y0];
  });
  const wasFocused = shown > 0 && beats[shown - 1].page === beats[shown].page && focusOf[shown - 1] !== null;
  const dimK = wasFocused ? 1 : interpolate(f, [startOf(shown), startOf(shown) + MOVE], [0, 1], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: '#000', backgroundImage: `url(${gridBg})`, backgroundRepeat: 'repeat', backgroundSize: '600px 600px'}}>
      {doc.enter !== 'none' && <Sfx at={t0} name="whoosh" vol={0.3} />}
      {beats.map((bb, i) => (i > 0 && beats[i - 1].page !== bb.page && f >= bb.t ? <Sfx key={i} at={bb.t} name="flip" vol={0.4} /> : null))}
      <div style={{position: 'absolute', left: DOC_WIN.x, top: DOC_WIN.y, width: DOC_WIN.w, height: DOC_WIN.h, overflow: 'hidden',
        opacity: slide, transform: `translateY(${(1 - slide) * 260}px)`}}>
        <div style={{position: 'absolute', left, top, width: W, height: H, background: '#FFFFFF', boxShadow: '0 30px 80px #000C, 0 0 0 1px #FFFFFF22',
          transform: `scaleX(${Math.max(0.001, flipX)})`, transformOrigin: `${DOC_WIN.w / 2 - left}px 50%`}}>
          <Img src={staticFile(page.src)} style={{width: '100%', height: '100%', display: 'block'}} />
          {hls.map((h, i) => (
            <div key={i} style={{position: 'absolute', left: h.box[0] * W, top: h.box[1] * H, height: h.box[3] * H, borderRadius: 3,
              width: h.box[2] * W * interpolate(f, [h.t, h.t + WIPE], [0, 1], clamp),
              background: HL, opacity: h.fresh ? 1 : 0.45, mixBlendMode: 'multiply'}} />
          ))}
          {hole && <div style={{position: 'absolute', left: hole[0] * W - 8, top: hole[1] * H - 8, width: hole[2] * W + 16, height: hole[3] * H + 16, borderRadius: 8,
            boxShadow: `0 0 0 ${Math.round(4 * Math.max(W, H))}px rgba(0,0,0,${(0.62 * dimK).toFixed(3)})`}} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};
