import React, {useEffect, useState} from 'react';
import {Composition, cancelRender, continueRender, delayRender} from 'remotion';
import {FONT_FAMILIES} from './fonts';

type Size = {width: number; height: number};

/** 模版文件夹的 index.ts 对外的东西（照 01、02 的写法）；sizeForProps 是可选的。和 src/Root.tsx 一样，参数这边统一用 any。 */
export type TemplateModule = {
  width: number;
  height: number;
  sizeForProps?: (props: any) => Size;
  Template: React.FC<any>;
  schema: any;
  defaultProps: any;
};

/**
 * 只装一个模版的根：给 scripts/render.py 的 --单独 用。平时出片走库根目录的 src/Root.tsx，那里装着所有模版，
 * 别的模版正改到一半（文件刚写了一半、缺一个引入）时整包打不起来；这时用这个，只打进要出的那一个。
 * 等字体那一段和 src/Root.tsx 一样，要一起改。合成 id、时长、按参数定画幅也都照那儿的规矩。
 */
export const standalone = (id: string, t: TemplateModule): React.FC =>
  function StandaloneRoot() {
    // 等所有用到的字体都加载完再出第一帧，免得开头几帧先用备用字体渲出来
    const [handle] = useState(() => delayRender('等待字体加载'));
    useEffect(() => {
      const loads: Promise<unknown>[] = [];
      document.fonts.forEach((face) => {
        const family = face.family.replace(/["']/g, '');
        if (FONT_FAMILIES.includes(family)) {
          loads.push(face.load());
        }
      });
      Promise.all(loads)
        .then(() => document.fonts.ready)
        .then(() => continueRender(handle))
        .catch((err) => cancelRender(err));
    }, [handle]);
    return (
      <Composition
        id={id}
        component={t.Template}
        schema={t.schema}
        defaultProps={t.defaultProps}
        durationInFrames={240}
        fps={30}
        width={t.width}
        height={t.height}
        calculateMetadata={({props}) => ({
          ...(t.sizeForProps ? t.sizeForProps(props) : {}),
          durationInFrames: (props as {durationInFrames?: number}).durationInFrames ?? 240,
        })}
      />
    );
  };
