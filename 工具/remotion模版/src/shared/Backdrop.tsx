import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

/** 素色底：中间亮、四角暗一点，中心亮度对齐参考视频的浅灰底。模版上的文字都是深色，压在这样的浅底上才看得清。 */
export const PAPER = 'radial-gradient(ellipse 100% 90% at 50% 42%, #c9c9c8 0%, #c0c0bf 45%, #adadab 100%)';

/**
 * 铺底：给了图片就铺图（裁满画面），再压一层浅色保证深色字看得清；没给图片就用素色底。
 * 推镜由调用方算好 scale 传进来。
 */
export const Backdrop: React.FC<{scale: number; image?: string; wash?: number}> = ({scale, image, wash = 0}) => (
  <>
    <AbsoluteFill style={{transform: `scale(${scale})`}}>
      {image ? (
        <Img src={staticFile(image)} style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover'}} />
      ) : (
        <AbsoluteFill style={{background: PAPER}} />
      )}
    </AbsoluteFill>
    {image ? <AbsoluteFill style={{backgroundColor: `rgba(244, 244, 242, ${wash})`}} /> : null}
  </>
);
