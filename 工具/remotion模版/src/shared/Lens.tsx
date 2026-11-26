import React, {useEffect, useId, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {LENS_MAP, LensSpec, lensPad, lensReach} from './lensMath';

/**
 * 鱼眼（桶形）镜头：把 children 这一层内容当成隔着广角镜头拍到的。中心不变形，越靠边越往外弯。
 *
 * 做法是整层做一个置换：画面上每个像素显示的不是它自己那儿的内容，而是往外挪了一段之后那儿的内容。挪多少、往哪边挪，
 * 看 public/lens/barrel.png 那张位移贴图（scripts/make_lens_map.py 生成）。所以 children 要比画面大一圈， lensPad 给出至少大多少；
 * 不够的话画面边上会被拉出透明。背景记得铺到 −lensPad 那么远。
 *
 * 镜头不动。要“镜头扫过去”，是动 children 里的内容；内容里某个点最后落在画面哪儿，用 lensMath.ts 的 lensProject 算。
 * children 里的坐标还是画面坐标（左上角是 0, 0），可以超出画面。
 *
 * 放进来的东西最好已经是“拍完了”的：景深模糊之类的加在 child 上，颗粒、暗角放在 Lens 外面。
 */
export const Lens: React.FC<{spec: LensSpec; style?: React.CSSProperties; children: React.ReactNode}> = ({spec, style, children}) => {
  // 一个 Studio 里会有多个模版，滤镜 id 不能重名
  const id = `lens-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // 贴图不是 <img>，Remotion 不会自己等它加载完；不等的话头几帧会按“没有贴图”出画面
  const [handle] = useState(() => delayRender(`等镜头贴图 ${LENS_MAP} 加载`));
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      img
        .decode()
        .then(() => continueRender(handle))
        .catch(() => continueRender(handle));
    };
    img.onerror = () => cancelRender(new Error(`镜头贴图 ${LENS_MAP} 没加载上。在库根目录跑一次 python3 scripts/make_lens_map.py`));
    img.src = staticFile(LENS_MAP);
  }, [handle]);

  const {w, h, strength} = spec;
  const pad = lensPad(spec);
  const W = w + 2 * pad; // 置换层的大小：它左上角在画面的 (−pad, −pad)
  const H = h + 2 * pad;
  const [cx, cy] = spec.center ?? [w / 2, h / 2];
  const reach = lensReach(spec);
  // 贴图只有 8 位，中灰只能记成 128，比一半高出 1 / 510；这会让整层往右下挪 strength / 255 像素，这里挪回去
  const bias = strength / 255;

  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        {/* 按 sRGB 读贴图，不然 128 不算一半。滤镜区域就是置换层本身，再往外的内容不要 */}
        <filter id={id} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H} colorInterpolationFilters="sRGB">
          {/* 位移贴图的圆盘铺在以镜头中心为圆心、半径是 reach 的圆上，和画面坐标对齐以后再置换 */}
          <feImage href={staticFile(LENS_MAP)} x={cx + pad - reach} y={cy + pad - reach} width={2 * reach} height={2 * reach} preserveAspectRatio="none" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={2 * strength} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
        <div style={{position: 'absolute', left: -pad, top: -pad, width: W, height: H, filter: `url(#${id})`}}>
          {/* 这一层左上角就是画面的 (0, 0)：children 照画面坐标摆，能超出画面，超出 lensPad 的部分会被裁掉 */}
          <div style={{position: 'absolute', left: pad - bias, top: pad - bias, width: w, height: h}}>{children}</div>
        </div>
      </div>
    </>
  );
};
