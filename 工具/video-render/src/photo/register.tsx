// 把一期 photo.json 注册成三个合成：EpNPhoto（剪辑用，只有音效）/ EpNPhotoCheck（烧字幕核对）/ EpNSheet（关键帧拼图）
import React from 'react';
import {Episode, Timeline} from '../Episode';
import {CustomMap, EpisodeSpec, buildPhotoEpisode} from './engine';
import {useTitleFont} from './kit';
import {Sheet, pickThumbs, sheetHeight} from './sheet';
import {ArollLayer, buildArollSegs} from './aroll';

// 口播稿行号 → 帧：每个场景的 steps 和稿子的行一一对应（章节标题也占一行）
export const lineFrames = (tl: Timeline): number[] => {
  const out: number[] = [];
  tl.scenes.forEach((sc) => (sc.steps as number[]).forEach((st) => out.push(sc.from + st)));
  return out;
};

export type Comp = {id: string; total: number; C: React.FC; width?: number; height?: number};

export const photoComps = (id: string, timeline: Timeline, spec: EpisodeSpec, custom: CustomMap = {}, names: Record<string, string> = {}): Comp[] => {
  const built = buildPhotoEpisode(spec, custom);
  const segs = spec.aroll ? buildArollSegs(spec.aroll, lineFrames(timeline), timeline.total, timeline.scenes.map((sc: any) => ({...sc, side: spec.scenes.find((x) => x.id === sc.scene)?.arollSide, pos: spec.scenes.find((x) => x.id === sc.scene)?.arollPos}))) : [];
  const Ep: React.FC<{subtitles?: boolean; grid?: boolean; aroll?: boolean}> = ({subtitles, grid, aroll}) => {
    useTitleFont();
    const overlay = aroll && spec.aroll ? <ArollLayer spec={{...spec.aroll, layout: spec.aroll.layout ?? spec.style?.layout}} segs={segs} /> : undefined;
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
