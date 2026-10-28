import {Config} from '@remotion/cli/config';
import {existsSync} from 'fs';

// 光效（light leak）需要 WebGL
Config.setChromiumOpenGlRenderer('angle');

// 默认用 Remotion 自带的 chrome-headless-shell（首次使用先跑 `npx remotion browser ensure` 下载）。
// 2026-10-28 实测：本机 Chrome 156 会随机渲出花屏帧（整帧缩成 3×3 平铺、叠字丢失），
// 一期 7 分钟的片子有 60–70 帧坏帧，而且慢一倍；自带 shell 零坏帧、快一倍、内存更低。
// 详见 docs/渲染方式测试-2026-10-28.md。
// 实在下载不了 shell 时，临时设环境变量 USE_SYSTEM_CHROME=1 退回本机 Chrome（会有花屏，交付前要查）。
if (process.env.USE_SYSTEM_CHROME === '1') {
  const chromes = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const chrome = chromes.find((p) => existsSync(p));
  if (chrome) Config.setBrowserExecutable(chrome);
}
