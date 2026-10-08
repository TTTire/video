import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Theme, ThemeCtx, useStep} from './ui';
import {Enter, FxBackground, SceneMotion} from './fx';
import {AutoSfxCtx, Sfx, SfxName} from './sfx';

export type Timeline = {fps: number; total: number; scenes: any[]; subs: {from: number; dur: number; text: string}[]};
export type EpisodeProps = {
  timeline: Timeline; scenes: Record<string, React.FC<any>>; theme: Theme;
  audio: string; badge: string; subtitles?: boolean;
  narration?: boolean; // false = 只留音效，不要合成配音（给剪辑用）
  // 动效增强：背景、每个场景的入场方式、镜头震动
  // manual：这些场景自己放了音效，不再自动加转场声和 pop
  fx?: {enter: Record<string, Enter>; shake?: (sc: any) => number[]; manual?: string[]};
};

const SceneWrap: React.FC<{sc: any; scenes: Record<string, React.FC<any>>; fx?: EpisodeProps['fx']}> = ({sc, scenes, fx}) => {
  const Comp = scenes[sc.scene];
  const step = useStep(sc.steps);
  const f = useCurrentFrame();
  if (fx) {
    const cycle: Enter[] = ['blur', 'slideL', 'zoom', 'slideUp'];
    const enter = fx.enter[sc.scene] ?? (sc.scene === 'chapter' ? 'flip' : cycle[Math.floor(sc.from / 7) % cycle.length]);
    const manual = (fx.manual ?? []).includes(sc.scene);
    const sound: SfxName = sc.scene === 'chapter' ? 'flip' : 'whoosh';
    return (
      <AutoSfxCtx.Provider value={!manual}>
        {!manual && <Sfx at={0} name={sound} vol={sc.scene === 'chapter' ? 0.4 : 0.2} />}
        <SceneMotion dur={sc.dur} enter={enter} shake={fx.shake ? fx.shake(sc) : []}><Comp {...sc} step={step} /></SceneMotion>
      </AutoSfxCtx.Provider>
    );
  }
  const o = interpolate(f, [0, 8, sc.dur - 8, sc.dur], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}><Comp {...sc} step={step} /></AbsoluteFill>;
};

export const Episode: React.FC<EpisodeProps> = ({timeline, scenes, theme: C, audio, badge, subtitles = false, fx, narration = true}) => (
  <ThemeCtx.Provider value={C}>
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 35%, ${C.bg2} 0%, ${C.bg} 70%)`}}>
      {fx && <FxBackground />}
      {narration && <Html5Audio src={staticFile(audio)} />}
      {timeline.scenes.map((sc, i) => (
        <Sequence key={i} from={sc.from} durationInFrames={sc.dur} premountFor={30}><SceneWrap sc={sc} scenes={scenes} fx={fx} /></Sequence>
      ))}
      {subtitles && timeline.subs.map((s, i) => (
        <Sequence key={'s' + i} from={s.from} durationInFrames={s.dur + 8} layout="none">
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70}}>
            <div style={{fontFamily: C.font, fontWeight: 700, fontSize: 46, color: C.white, background: '#000A', padding: '12px 36px', borderRadius: 14, maxWidth: 1700, textAlign: 'center', lineHeight: 1.35}}>{s.text}</div>
          </AbsoluteFill>
        </Sequence>
      ))}
      <div style={{position: 'absolute', left: 50, top: 36, fontFamily: C.font, fontSize: 28, color: C.dim, letterSpacing: 2}}>像素呼吸 · 100个经济学原理 <span style={{color: C.gold}}>{badge}</span></div>
    </AbsoluteFill>
  </ThemeCtx.Provider>
);
