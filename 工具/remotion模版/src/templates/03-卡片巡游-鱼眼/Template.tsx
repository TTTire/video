import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Lens} from '../../shared/Lens';
import {LensSpec, lensPad, lensProject} from '../../shared/lensMath';
import {SANS, HANS} from '../../shared/fonts';
import {TemplateProps} from './schema';

const SPEC: LensSpec = {w: 1920, h: 1080, strength: 220};
const PAD = lensPad(SPEC);
const PROBE: [number, number] = [1700, 900];

const Grid: React.FC = () => (
  <div style={{position: 'absolute', left: -PAD, top: -PAD, width: 1920 + 2 * PAD, height: 1080 + 2 * PAD, background: '#0f3d22'}}>
    {Array.from({length: Math.ceil((1920 + 2 * PAD) / 96)}, (_, i) => (
      <div key={`v${i}`} style={{position: 'absolute', left: -PAD + i * 96, top: -PAD, width: 1, height: 1080 + 2 * PAD, background: 'rgba(255,255,255,0.45)'}} />
    ))}
    {Array.from({length: Math.ceil((1080 + 2 * PAD) / 96)}, (_, j) => (
      <div key={`h${j}`} style={{position: 'absolute', top: -PAD + j * 96, left: -PAD, height: 1, width: 1920 + 2 * PAD, background: 'rgba(255,255,255,0.45)'}} />
    ))}
  </div>
);

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const [px, py] = lensProject(SPEC)(PROBE[0], PROBE[1]);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Lens spec={SPEC}>
        <Grid />
        <div style={{position: 'absolute', left: 960 - 30, top: 540 - 30, width: 60, height: 60, borderRadius: 30, border: '3px solid #ff00ff'}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: 1200}}>
          <div
            style={{
              position: 'absolute',
              left: 420,
              top: 300,
              width: 700,
              height: 380,
              borderRadius: 28,
              background: '#ffffff',
              transform: `rotateY(${-28 + (frame / 180) * 56}deg) rotateZ(-8deg)`,
              fontFamily: `${SANS}, ${HANS}`,
              fontSize: 44,
              color: '#1b2a1f',
              padding: 34,
              boxSizing: 'border-box',
            }}
          >
            Top Income Sources 中文测试 卡片巡游
          </div>
        </div>
        <div style={{position: 'absolute', left: PROBE[0] - 14, top: PROBE[1] - 14, width: 28, height: 28, borderRadius: 14, background: '#00ff66'}} />
      </Lens>
      {/* 镜头外面：算出来的落点 */}
      <div style={{position: 'absolute', left: px - 50, top: py - 50, width: 100, height: 100, border: '3px solid #ffff00', transform: 'translate(-0.5px, -0.5px)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, border: '2px solid #00ccff'}} />
    </AbsoluteFill>
  );
};
