import React, {useId} from 'react';

/** 颗粒：每帧换一个噪声种子，叠在整个画面最上面。 */
export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = 0.32}) => {
  // 一个 Studio 里会有多个模版，滤镜 id 不能重名
  const id = `grain-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={(frame * 7) % 1000} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope={0} intercept={1} />
          </feComponentTransfer>
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#${id})`, opacity, mixBlendMode: 'overlay'}} />
    </>
  );
};
