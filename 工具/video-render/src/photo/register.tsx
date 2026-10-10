// 把一期 photo.json 注册成三个合成：EpNPhoto（剪辑用，只有音效）/ EpNPhotoCheck（烧字幕核对）/ EpNSheet（关键帧拼图）
import React from 'react';
import {Episode, Timeline} from '../Episode';
import {CustomMap, EpisodeSpec, buildPhotoEpisode} from './engine';
import {useTitleFont} from './kit';
import {Sheet, pickThumbs, sheetHeight} from './sheet';

export type Comp = {id: string; total: number; C: React.FC; width?: number; height?: number};

export const photoComps = (id: string, timeline: Timeline, spec: EpisodeSpec, custom: CustomMap = {}, names: Record<string, string> = {}): Comp[] => {
  const built = buildPhotoEpisode(spec, custom);
  const Ep: React.FC<{subtitles?: boolean}> = ({subtitles}) => {
    useTitleFont();
    return <Episode timeline={timeline} scenes={built.scenes} theme={built.theme} audio="" badge={spec.badge} fx={built.fx} narration={false} plain subtitles={subtitles} />;
  };
  const thumbs = pickThumbs(timeline, names);
  return [
    {id: `${id}Photo`, total: timeline.total, C: () => <Ep />},
    {id: `${id}PhotoCheck`, total: timeline.total, C: () => <Ep subtitles />},
    {id: `${id}Sheet`, total: 1, width: 1920, height: sheetHeight(thumbs.length), C: () => <Sheet thumbs={thumbs} total={timeline.total}><Ep subtitles /></Sheet>},
  ];
};
