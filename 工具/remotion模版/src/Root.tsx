import React, {useEffect, useState} from 'react';
import {Composition, cancelRender, continueRender, delayRender} from 'remotion';
import {FONT_FAMILIES} from './shared/fonts';
// ---- templates（由 scripts/new_template.py 维护，别删这两行标记） ----
import * as T01 from './templates/01-宋体标题-打字数据表';
import * as T02 from './templates/02-榜单排名攀升';
import * as T03 from './templates/03-卡片巡游-鱼眼';
import * as T04 from './templates/04-截图鱼眼-打字高亮';
import * as T05 from './templates/05-照片卡片-逐张换';
import * as T06 from './templates/06-AI输入框-打字发送';
// ---- /templates ----

type Size = {width: number; height: number};
type Template = {id: string; width: number; height: number; size?: (props: any) => Size; C: React.FC<any>; schema: any; defaults: any};

/** 模版在 index.ts 里导出了 sizeForProps 的，画幅就跟着参数变；没导出的（这里是 undefined）用登记时的固定尺寸。 */
const sizeOf = (t: unknown): ((props: any) => Size) | undefined =>
  (t as {sizeForProps?: (props: any) => Size}).sizeForProps;

/** 每个模版登记一行。合成 id 就是它在 src/templates/ 下的文件夹名，所以文件夹名只能用字母、数字、连字符和汉字。 */
const TEMPLATES: Template[] = [
  // ---- registry（由 scripts/new_template.py 维护，别删这两行标记） ----
  {id: '01-宋体标题-打字数据表', width: 1920, height: 1080, size: sizeOf(T01), C: T01.Template, schema: T01.schema, defaults: T01.defaultProps},
  {id: '02-榜单排名攀升', width: T02.width, height: T02.height, size: sizeOf(T02), C: T02.Template, schema: T02.schema, defaults: T02.defaultProps},
  {id: '03-卡片巡游-鱼眼', width: T03.width, height: T03.height, size: sizeOf(T03), C: T03.Template, schema: T03.schema, defaults: T03.defaultProps},
  {id: '04-截图鱼眼-打字高亮', width: T04.width, height: T04.height, size: sizeOf(T04), C: T04.Template, schema: T04.schema, defaults: T04.defaultProps},
  {id: '05-照片卡片-逐张换', width: T05.width, height: T05.height, size: sizeOf(T05), C: T05.Template, schema: T05.schema, defaults: T05.defaultProps},
  {id: '06-AI输入框-打字发送', width: T06.width, height: T06.height, size: sizeOf(T06), C: T06.Template, schema: T06.schema, defaults: T06.defaultProps},
  // ---- /registry ----
];

export const RemotionRoot: React.FC = () => {
  // 等所有用到的字体都加载完再出第一帧，免得开头几帧先用备用字体渲出来。
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

  // 时长每个模版都用 durationInFrames 这个参数控制，没填就 8 秒
  return (
    <>
      {TEMPLATES.map((t) => (
        <Composition
          key={t.id}
          id={t.id}
          component={t.C}
          schema={t.schema}
          defaultProps={t.defaults}
          durationInFrames={240}
          fps={30}
          width={t.width}
          height={t.height}
          calculateMetadata={({props}) => ({
            ...(t.size ? t.size(props) : {}),
            durationInFrames: (props as {durationInFrames?: number}).durationInFrames ?? 240,
          })}
        />
      ))}
    </>
  );
};
