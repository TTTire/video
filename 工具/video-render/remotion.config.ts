import {Config} from '@remotion/cli/config';

// 光效（light leak）需要 WebGL
Config.setChromiumOpenGlRenderer('angle');
