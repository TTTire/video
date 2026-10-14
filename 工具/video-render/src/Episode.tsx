import React from 'react';
import {AbsoluteFill, Html5Audio, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Theme, ThemeCtx, useStep} from './ui';
import {Enter, FxBackground, SceneMotion} from './fx';
import {AutoSfxCtx, Sfx, SfxName} from './sfx';
import {FONTS, GridOverlay} from './photo/kit';

export type Timeline = {fps: number; total: number; scenes: any[]; subs: {from: number; dur: number; text: string}[]};
export type EpisodeProps = {
  timeline: Timeline; scenes: Record<string, React.FC<any>>; theme: Theme;
  audio: string; badge: string; subtitles?: boolean;
  series?: string; // 角标里的栏目名，默认「100 个经济学原理」
  grid?: boolean;  // 叠审查网格（拼图用）
  narration?: boolean; // false = 只留音效，不要合成配音（给剪辑用）
  plain?: boolean; // true = 纯色底、不画光斑背景（照片铺底的版本用）
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

export const Episode: React.FC<EpisodeProps> = ({timeline, scenes, theme: C, audio, badge, subtitles = false, fx, narration = true, plain = false, series = '100 个经济学原理', grid = false}) => (
  <ThemeCtx.Provider value={C}>
    <AbsoluteFill style={{background: plain ? C.bg : `radial-gradient(ellipse at 50% 35%, ${C.bg2} 0%, ${C.bg} 70%)`}}>
      {fx && !plain && <FxBackground />}
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
      {/* 角标（跨期不变）：期号 数黑体金 / 像素呼吸 文楷白 32 / 栏目名 得意黑灰 24 */}
      <div style={{position: 'absolute', left: 60, top: 34, display: 'flex', alignItems: 'baseline', gap: 12, opacity: 0.8, textShadow: plain ? '0 2px 12px #000C' : undefined, whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: FONTS.num, fontSize: 30, color: C.gold, letterSpacing: 4}}>{badge}</span>
        <span style={{fontFamily: FONTS.kai, fontSize: 32, color: C.white, letterSpacing: 2}}>像素呼吸</span>
        <span style={{fontFamily: FONTS.title, fontSize: 24, color: C.dim, letterSpacing: 2, opacity: 0.85}}>· {series}</span>
      </div>
      {grid && <GridOverlay />}
    </AbsoluteFill>
  </ThemeCtx.Provider>
);
