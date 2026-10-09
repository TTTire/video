import {Config} from '@remotion/cli/config';

// 光效（light leak）需要 WebGL
Config.setChromiumOpenGlRenderer('angle');

// 这台机器下载不了 Remotion 自带的 headless shell，直接用本机 Chrome
Config.setBrowserExecutable('C:/Program Files/Google/Chrome/Application/chrome.exe');
