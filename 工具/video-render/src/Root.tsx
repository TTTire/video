import React from 'react';
import {Composition} from 'remotion';
import {Episode, EpisodeProps} from './Episode';
import {C} from './ui';
import ep7tts from './ep7/timeline-tts.json'; // 旧流程（合成配音）的时间轴
import ep7 from './ep7/timeline.json';
import {SCENES as SCENES7} from './ep7/scenes';
import ep6 from './ep6/timeline.json';
import {SCENES6, THEME6} from './ep6/scenes';
import {ENTER7, MANUAL7, OPENING7, SHAKE7} from './ep7/opening';
import {ENTER6, FX6, MANUAL6, SHAKE6} from './ep6/fx6';
import {ENTER6P, MANUAL6P, SCENES6P, THEME6P, useSmiley} from './ep6/photo';
import {photoComps} from './photo/register';
import {EpisodeSpec} from './photo/engine';
// ---- 通用照片引擎的期数（由 scripts/new_episode.py 追加，别删这几行标记） ----
import ep6photo from './ep6/photo.json';
import ep6names from './ep6/scene-names.json';
import {CUSTOM6} from './ep6/custom';
import ep7photo from './ep7/photo.json';
import ep7names from './ep7/scene-names.json';
import {CUSTOM7} from './ep7/custom';
// ---- /imports ----

// subtitles 默认关闭：字幕在剪映里自己加
const eps: {id: string; props: EpisodeProps}[] = [
  // 第 6 期时间轴已改为按真人口播字幕（srt）生成，旧的合成配音对不上，不再播放
  {id: 'Ep6', props: {timeline: ep6 as any, scenes: SCENES6, theme: THEME6, audio: 'ep6-narration.wav', badge: '06', narration: false}},
  {id: 'Ep7', props: {timeline: ep7tts as any, scenes: SCENES7, theme: C, audio: 'ep7-narration.wav', badge: '07'}},
];

const comps: {id: string; total: number; C: React.FC; width?: number; height?: number}[] = eps.map((e) => ({id: e.id, total: e.props.timeline.total, C: () => <Episode {...e.props} />}));

// 动效升级版：第 7 期开头（到第 1 章标题之前）
const ep7OpeningEnd = (ep7tts as any).scenes.find((s: any) => s.scene === 'chapter').from;
comps.push({
  id: 'Ep7Opening', total: ep7OpeningEnd,
  C: () => <Episode timeline={ep7tts as any} scenes={{...SCENES7, ...OPENING7}} theme={C} audio="ep7-narration.wav" badge="07" fx={{enter: ENTER7, shake: SHAKE7, manual: MANUAL7}} />,
});
// 第 7 期全片动效版：带配音预览 / 只带音效（剪辑用）
const ep7Fx = (narration: boolean) => () => <Episode timeline={ep7tts as any} scenes={{...SCENES7, ...OPENING7}} theme={C} audio="ep7-narration.wav" badge="07" fx={{enter: ENTER7, shake: SHAKE7, manual: MANUAL7}} narration={narration} />;
comps.push({id: 'Ep7Fx', total: (ep7tts as any).total, C: ep7Fx(true)});
comps.push({id: 'Ep7FxSfx', total: (ep7tts as any).total, C: ep7Fx(false)});
comps.push({
  id: 'Ep7OpeningSfx', total: ep7OpeningEnd,
  C: () => <Episode timeline={ep7tts as any} scenes={{...SCENES7, ...OPENING7}} theme={C} audio="ep7-narration.wav" badge="07" fx={{enter: ENTER7, shake: SHAKE7, manual: MANUAL7}} narration={false} />,
});

// 第 6 期动效版：时间轴对齐真人口播，只有音效（剪辑用：和 A-roll 起点对齐叠放）
comps.push({
  id: 'Ep6FxSfx', total: (ep6 as any).total,
  C: () => <Episode timeline={ep6 as any} scenes={{...SCENES6, ...FX6}} theme={THEME6} audio="ep6-narration.wav" badge="06" fx={{enter: ENTER6, shake: SHAKE6, manual: MANUAL6}} narration={false} />,
});
// 对时检查版：同上 + 烧录口播字幕，只用来核对画面和口播是否同步
comps.push({
  id: 'Ep6FxCheck', total: (ep6 as any).total,
  C: () => <Episode timeline={ep6 as any} scenes={{...SCENES6, ...FX6}} theme={THEME6} audio="ep6-narration.wav" badge="06" fx={{enter: ENTER6, shake: SHAKE6, manual: MANUAL6}} narration={false} subtitles />,
});

// 第 6 期写实版（AI 照片铺底 + 得意黑）：Ep6Photo 只有音效（剪辑用）；Ep6PhotoCheck 烧录字幕核对同步
const Ep6Photo: React.FC<{subtitles?: boolean}> = ({subtitles}) => {
  useSmiley();
  return <Episode timeline={ep6 as any} scenes={SCENES6P} theme={THEME6P} audio="ep6-narration.wav" badge="06" fx={{enter: ENTER6P, manual: MANUAL6P}} narration={false} plain subtitles={subtitles} />;
};
comps.push({id: 'Ep6Photo', total: (ep6 as any).total, C: () => <Ep6Photo />});
comps.push({id: 'Ep6PhotoCheck', total: (ep6 as any).total, C: () => <Ep6Photo subtitles />});

// 通用照片引擎：每期 src/epN/photo.json → EpNPhoto / EpNPhotoCheck / EpNSheet
// 第 6 期的 JSON 版（Ep6J*）和手写版（Ep6Photo*）并存，JSON 版是之后每期的模板
const photoEps: {id: string; tl: any; spec: EpisodeSpec; custom?: any; names?: any}[] = [
  // ---- episodes ----
  {id: 'Ep6J', tl: ep6, spec: ep6photo as EpisodeSpec, custom: CUSTOM6, names: ep6names},
  {id: 'Ep7', tl: ep7, spec: ep7photo as EpisodeSpec, custom: CUSTOM7, names: ep7names},
  // ---- /episodes ----
];
photoEps.forEach((e) => comps.push(...photoComps(e.id, e.tl as any, e.spec, e.custom, e.names)));

export const Root: React.FC = () => (
  <>
    {comps.map((e) => (
      <Composition key={e.id} id={e.id} component={e.C} durationInFrames={e.total} fps={30} width={e.width ?? 1920} height={e.height ?? 1080} />
    ))}
  </>
);
