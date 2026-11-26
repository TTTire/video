import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../shared/Backdrop';
import {HANS, SONG} from '../../shared/fonts';
import {Grain} from '../../shared/Grain';
import {Typed} from '../../shared/textParts';
import {TemplateProps} from './schema';

// 共用部件都在 src/shared/：SplitGroup（有蓝红色散的叠字）、Typed（逐字打出）、Backdrop（铺底和推镜）、Grain（颗粒）；
// 关键帧多的曲线用 curve.ts 的 track，段与段之间速度连续，不会一顿一顿的。
// 版面数值写清是参考第几帧的屏幕坐标，量的办法见库根目录 README 的“保存一个新模版”。
export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#e6e6e4'}}>
      <Backdrop scale={1} />
      <Typed
        text={props.title}
        frame={frame}
        at={0}
        cps={1}
        channel={0}
        color="rgb(41, 39, 49)"
        rise={0}
        fracture={0}
        style={{position: 'absolute', left: 172, top: 475, fontFamily: `${SONG}, ${HANS}`, fontSize: 160, lineHeight: 1}}
      />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
