import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {makeView} from './motion';
import {Page} from './Page';
import {Pointer} from './Pointer';
import {TemplateProps} from './schema';
import {hexToRgba, themeFor} from './themes';

// 某一刻画面该是什么样（曲线、指针的位置、probes）都在 motion.ts 的 makeView 里；这里只是把它画出来，
// 再按需给指针叠几层动态模糊。共用部件在 src/shared/：curve.ts 的 curve（关键帧之间速度连续的平滑曲线）、fonts.ts（字体）。
export {makeView} from './motion';

const SHUTTER = 0.5; // 快门开半帧：动态模糊拖多长按它算
const BLUR_STEP = 4; // 动态模糊里相邻两个样之间指针挪多少像素
const MAX_SAMPLES = 16;

export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  const view = useMemo(() => makeView(props), [props]);
  const T = useMemo(() => themeFor(props.theme, props.customTheme), [props.theme, props.customTheme]);
  const now = view(frame);

  // 动态模糊（motionBlur 设为真才有；参考里的指针再快也是清楚的，所以默认关）：
  // 指针在快门开着的半帧里挪得超过 3 像素时，在这半帧里多采几个样，各画一层指针一个压一个地叠起来，叠完正好是这几个样的平均
  const head = view(frame - SHUTTER / 2).pointer;
  const tail = view(frame + SHUTTER / 2).pointer;
  const motion = Math.hypot(tail.x - head.x, tail.y - head.y);
  const samples = props.motionBlur && now.pointer.opacity > 0.002 && motion >= 3 ? Math.min(MAX_SAMPLES, Math.ceil(motion / BLUR_STEP) + 1) : 1;
  const glow = hexToRgba(T.accent, 0.28); // 指针外头很淡的一圈光晕

  return (
    <AbsoluteFill style={{background: T.bg}}>
      <Page data={props} T={T} v={now} />
      {Array.from({length: samples}, (_, i) => {
        const p = samples === 1 ? now.pointer : view(frame + (i / (samples - 1) - 0.5) * SHUTTER).pointer;
        return <Pointer key={i} x={p.x} y={p.y} scale={p.scale} opacity={p.opacity / (i + 1)} glow={glow} />;
      })}
    </AbsoluteFill>
  );
};
