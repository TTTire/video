import React, {useEffect, useId, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {LENS_BANDS, LENS_SPREAD, LensSpec, lensPad, lensReach} from './lensMath';

/**
 * 鱼眼（桶形）镜头：把 children 这一层内容当成隔着广角镜头拍到的。中心不变形，越靠边越往外弯。
 *
 * 做法是整层做置换：画面上每个像素显示的不是它自己那儿的内容，而是往外挪了一段之后那儿的内容。挪多少、往哪边挪，
 * 看 public/lens/ 那几张位移贴图（scripts/make_lens_map.py 生成）。贴图只有 8 位，一次挪到位边上会有台阶，
 * 所以按半径分成几段、一层套一层地串着置换（见 lensMath.ts 的 LENS_BANDS）：每段的位移都小，加起来才是整份。
 *
 * children 要比画面大一圈，不然画面边上会被拉出透明：默认四边都留 lensPad 那么多；嫌置换面积太大、出片慢的话，
 * 可以按四边实际要采多远逐边给定（spec.pads，算法见 lensMath.ts 的 lensPadsFor），内容会挪动的话要自己把余量放宽。
 * 背景记得铺到留白的边上。
 *
 * 镜头不动。要“镜头扫过去”，是动 children 里的内容；内容里某个点最后落在画面哪儿，用 lensMath.ts 的 lensProject 算。
 * children 里的坐标还是画面坐标（左上角是 0, 0），可以超出画面。
 *
 * 放进来的东西最好已经是“拍完了”的：景深模糊之类的加在 child 上，颗粒、暗角放在 Lens 外面。
 * 用了这个部件的模版出片要按 2 倍渲（index.ts 里写 renderScale = 2）：Chrome 做置换时位移取整像素，1 倍渲边上有台阶。
 */
export const Lens: React.FC<{spec: LensSpec; style?: React.CSSProperties; children: React.ReactNode}> = ({spec, style, children}) => {
  // 一个 Studio 里会有多个模版、每个模版又有几层，滤镜 id 不能重名
  const id = `lens-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // 贴图不是 <img>，Remotion 不会自己等它加载完；不等的话头几帧会按“没有贴图”出画面
  const [handle] = useState(() => delayRender('等镜头贴图加载'));
  useEffect(() => {
    Promise.all(
      LENS_BANDS.map(
        (band) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              img
                .decode()
                .then(() => resolve())
                .catch(() => resolve());
            };
            img.onerror = () => reject(new Error(`镜头贴图 ${band.file} 没加载上。在库根目录跑一次 python3 scripts/make_lens_map.py`));
            img.src = staticFile(band.file);
          })
      )
    )
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle]);

  const {w, h, strength} = spec;
  // 四边各往画面外留多少：没给就四边都留 lensPad，给了按给的
  const all = lensPad(spec);
  const pad = spec.pads ?? {l: all, r: all, t: all, b: all};
  const W = w + pad.l + pad.r; // 置换层的大小：它左上角在画面的 (−pad.l, −pad.t)
  const H = h + pad.t + pad.b;
  const [cx, cy] = spec.center ?? [w / 2, h / 2];
  const reach = lensReach(spec) * LENS_SPREAD; // 贴图的圆比“碰到画面最远一角”大一圈，罩住伸到画面外的全部内容
  // 贴图只有 8 位，中灰只能记成 128，比一半高出 1 / 510；每一段都会让整层往右下挪一点，一共是 strength / 255，这里挪回去
  const bias = strength / 255;

  // 一段套一层：最里层是内容，往外每一层做一段置换。位移是逐层加起来的
  let nested = (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, filter: `url(#${id}-0)`}}>
      {/* 这一层左上角就是画面的 (0, 0)：children 照画面坐标摆，能超出画面，超出留白的那些会被裁掉 */}
      <div style={{position: 'absolute', left: pad.l - bias, top: pad.t - bias, width: w, height: h}}>{children}</div>
    </div>
  );
  for (let k = 1; k < LENS_BANDS.length; k++) {
    nested = (
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, filter: `url(#${id}-${k})`}}>
        {nested}
      </div>
    );
  }

  return (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        {LENS_BANDS.map((band, k) => (
          // 按 sRGB 读贴图，不然 128 不算一半。滤镜区域就是置换层本身，再往外的内容不要
          <filter key={k} id={`${id}-${k}`} filterUnits="userSpaceOnUse" x={0} y={0} width={W} height={H} colorInterpolationFilters="sRGB">
            {/* 每段的位移贴图铺在同一个圆上：以镜头中心为圆心，和画面坐标对齐以后再置换。圆比碰到画面最远一角的大一圈（LENS_SPREAD） */}
            <feImage href={staticFile(band.file)} x={cx + pad.l - reach} y={cy + pad.t - reach} width={2 * reach} height={2 * reach} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={2 * band.part * strength} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
      </svg>
      <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...style}}>
        <div style={{position: 'absolute', left: -pad.l, top: -pad.t, width: W, height: H}}>{nested}</div>
      </div>
    </>
  );
};
