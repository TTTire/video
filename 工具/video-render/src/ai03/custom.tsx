// 第 03 期的特殊图表（柱状图、表格、对比图等）。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几句，at(p, i) 是第 i 句开始的帧。参考 src/ep6/custom.tsx。
import React from 'react';
import {P} from '../photo/kit';
import {CustomMap} from '../photo/engine';

export const CUSTOMAI03: CustomMap = {};
