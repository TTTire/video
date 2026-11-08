// 把一期 photo.json 注册成三个合成：EpNPhoto（剪辑用，只有音效）/ EpNPhotoCheck（烧字幕核对）/ EpNSheet（关键帧拼图）
import React from 'react';
import {Episode, Timeline} from '../Episode';
import {CustomMap, EpisodeSpec, buildPhotoEpisode} from './engine';
import {useTitleFont} from './kit';
import {Sheet, pickThumbs, sheetHeight} from './sheet';
import {ArollLayer, buildArollSegs} from './aroll';
import {FACE_TRACKS} from './faces';

// A-roll cue 的 at → 帧。讲稿卡期写要点 id（"1.3"，"end" = 片尾），查 make_timeline.py 写的 timeline.points；
// ep8 及以前写口播稿行号：每个场景的 steps 和稿子的行一一对应（章节标题也占一行），展平后第 i 个就是第 i 行
export const cueFrame = (tl: Timeline) => {
  const lines: number[] = [];
  tl.scenes.forEach((sc) => (sc.steps as number[]).forEach((st) => lines.push(sc.from + st)));
  return (at: number | string): number => {
    // 第一句 / 第一条要点从第 0 帧算（开口前有几帧静音，别让 idle 闪一下）
    if (typeof at === 'number') return at <= 0 ? 0 : at >= lines.length ? tl.total : lines[at];
    if (at === '0.1') return 0;
    if (at === 'end') return tl.total;
    const fr = tl.points?.[at];
    if (fr === undefined) throw new Error(`aroll cue 里的要点 id「${at}」timeline.points 里没有：讲稿卡改过要点就改 cue，再重跑 make_timeline.py`);
    return fr;
  };
};

export type Comp = {id: string; total: number; C: React.FC; width?: number; height?: number};

export const photoComps = (id: string, timeline: Timeline, spec: EpisodeSpec, custom: CustomMap = {}, names: Record<string, string> = {}): Comp[] => {
  const built = buildPhotoEpisode(spec, custom);
  // 出镜层跟本期的版式和音效密度走（aroll 里单独写了就以它为准）；脸轨按合成 id 从 faces.ts 取，photo.json 写 faceTrack: false 的期不跟
  const ar = spec.aroll && {...spec.aroll, layout: spec.aroll.layout ?? spec.style?.layout, sfx: spec.aroll.sfx ?? spec.style?.sfx, faceKeys: spec.aroll.faceTrack === false ? undefined : FACE_TRACKS[id]};
  const segs = ar ? buildArollSegs(ar, cueFrame(timeline), timeline.total, timeline.scenes.map((sc: {scene: string; from: number; dur: number}) => {
    const s = spec.scenes.find((x) => x.id === sc.scene);
    // sound：这个场景开头自己响（章节卡 / 栏目卡 flip，普通场景 enterSfx 默认 pop）
    return {...sc, side: s?.arollSide, pos: s?.arollPos, size: s?.arollSize, sound: sc.scene === 'chapter' || s?.type === 'chapter' || s?.type === 'series' || s?.enterSfx !== null};
  })) : [];
  const Ep: React.FC<{subtitles?: boolean; grid?: boolean; aroll?: boolean}> = ({subtitles, grid, aroll}) => {
    useTitleFont();
    const overlay = aroll && ar ? <ArollLayer spec={ar} segs={segs} /> : undefined;
    return <Episode timeline={timeline} scenes={built.scenes} theme={built.theme} audio="" badge={spec.badge} series={spec.series} cornerBadge={spec.style?.badge !== false} fx={built.fx} narration={false} plain subtitles={subtitles} grid={grid} overlay={overlay} />;
  };
  const thumbs = pickThumbs(timeline, names);
  const comps: Comp[] = [
    {id: `${id}Photo`, total: timeline.total, C: () => <Ep />},
    {id: `${id}PhotoCheck`, total: timeline.total, C: () => <Ep subtitles />},
    // 拼图叠审查网格（区域名 + 字幕禁区线），审查时按区域名提修改意见
    {id: `${id}Sheet`, total: 1, width: 1920, height: sheetHeight(thumbs.length), C: () => <Sheet thumbs={thumbs} total={timeline.total}><Ep subtitles grid /></Sheet>},
  ];
  // 有 A-roll 时多出两个合成：EpNFull（B-roll + 出镜层，交付用）/ EpNFullCheck（带字幕核对）
  if (spec.aroll) {
    comps.push({id: `${id}Full`, total: timeline.total, C: () => <Ep aroll />});
    comps.push({id: `${id}FullCheck`, total: timeline.total, C: () => <Ep aroll subtitles />});
    comps.push({id: `${id}FullSheet`, total: 1, width: 1920, height: sheetHeight(thumbs.length), C: () => <Sheet thumbs={thumbs} total={timeline.total}><Ep aroll subtitles grid /></Sheet>});
  }
  return comps;
};
