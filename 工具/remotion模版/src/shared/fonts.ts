// npm 上 fontsource 包的字体在这里引入（文件放在 public/fonts/ 的在下面注册）。写在这个文件里，是因为 src/index.ts 和 --单独 的小入口都会走到这里：
// 写在 index.ts 里的话，单独出片的入口不经过它，拉丁字母会回落成别的字体。
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// 所有模版共用的字体。新模版要加字体有两种办法，都要把字族名加进 FONT_FAMILIES（Root.tsx 靠这份名单等字体加载完才出第一帧）：
//   - 文件放进 public/fonts/（名字别和已有的撞），在下面加一行 loadFont；
//   - npm 上有 fontsource 包的，npm install 后在上面加一行 import（别写到 src/index.ts 里，原因见最上面）。

// 粗宋体：寒蝉锦书宋 Heavy。只有一个字重，注册成 400，用的时候不要再加粗。
export const SONG = 'Jinshu Song';
// 衬线粗斜体（Times New Roman 的开源等宽替代）。
export const SERIF = 'Liberation Serif';
// 无衬线可变字体，粗细 100–900、宽度 62%–125%。由最上面引入的 @fontsource-variable/archivo 提供，
// 字族名固定是 'Archivo Variable'。
export const SANS = 'Archivo Variable';
// 黑体：Archivo 里没有汉字，中文字符回落到这里（粗体行用 Bold、细体行用 Regular）。用法：`${SANS}, ${HANS}`。
export const HANS = 'Noto Sans SC';
// 等宽字体（jetbrains-mono，npm 包 @fontsource-variable/jetbrains-mono，在最上面引入）：分数、型号这类对齐的数字用。
export const MONO = 'JetBrains Mono Variable';
// 细的展示衬线体（npm 包 @fontsource/instrument-serif）：网页标题那种大号衬线用。
export const DISPLAY_SERIF = 'Instrument Serif';

export const FONT_FAMILIES = [SONG, SERIF, SANS, HANS, MONO, DISPLAY_SERIF];

loadFont({family: SONG, url: staticFile('fonts/JinshuSong-Heavy.woff2'), weight: '400'});
loadFont({family: SERIF, url: staticFile('fonts/LiberationSerif-BoldItalic.ttf'), weight: '700', style: 'italic'});
loadFont({family: HANS, url: staticFile('fonts/NotoSansSC-Bold.woff2'), weight: '700'});
loadFont({family: HANS, url: staticFile('fonts/NotoSansSC-Regular.woff2'), weight: '400'});
