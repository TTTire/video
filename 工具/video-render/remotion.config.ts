import {Config} from '@remotion/cli/config';
import {existsSync} from 'fs';

// 光效（light leak）需要 WebGL
Config.setChromiumOpenGlRenderer('angle');

// 这台机器下载不了 Remotion 自带的 headless shell，直接用本机 Chrome（Windows / Mac 两边都能跑）
const chromes = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const chrome = chromes.find((p) => existsSync(p));
if (chrome) Config.setBrowserExecutable(chrome);
