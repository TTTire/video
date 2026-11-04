// 第 9 期的特殊图表（柱状图、表格、对比图等）。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 组件拿到 P（steps/step/dur）：p.step 是当前到了场景内第几条要点，at(p, i) 是第 i 条要点开始的帧（同一条要点里的先后自己加帧数）。参考 src/ep6/custom.tsx。
import React from 'react';
import {P} from '../photo/kit';
import {CustomMap} from '../photo/engine';

export const CUSTOMEP9: CustomMap = {};
