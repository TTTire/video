// 由 npm 包提供的字体在这里引入（文件放在 public/fonts/ 的在 src/shared/fonts.ts 里注册）。
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import {registerRoot} from 'remotion';
import {RemotionRoot} from './Root';

registerRoot(RemotionRoot);
