// 字体都在 src/shared/fonts.ts 里引入（这个入口和 scripts/render.py 的 --单独 小入口都经过它）。
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
