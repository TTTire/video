/**
 * 一套外观。换一个 AI 的输入页，只要换这几样颜色和发送按钮的图标。
 * 版面（谁在哪、多大）不在这里，在 Page.tsx 的 L；这里只有颜色。
 */
export type Theme = {
  bg: string; // 整幅背景
  title: string; // 问句的颜色
  box: string; // 输入框的底色
  boxBorder: string; // 输入框的边线；底色和背景分得开就写 'none'
  text: string; // 打进输入框的字
  caret: string; // 闪烁的光标
  accent: string; // 强调色：发送钮、问句前面的星标、发送后的三个点
  muted: string; // 左下角小图标的笔画、模型标签的字
  line: string; // 小图标的圆圈、模型标签药丸的描线
  shadow: string; // 输入框的投影（写成 rgba）。参考里投影比背景还亮，是一圈暖灰的光
  sendIcon: 'up' | 'plane'; // 发送按钮里的图标：向上的箭头 / 纸飞机
};

export type ThemeName = 'claude' | 'light' | 'dark';

/** 三套预设。第一套是照参考量的；另外两套是常见的浅底、深底输入页的配色，不是照着某一家量的。 */
export const THEMES: Record<ThemeName, Theme> = {
  // 参考这一套：深棕底、白框、橙钮。颜色都是参考第 110 帧量的
  claude: {
    bg: '#292119',
    title: '#faf3ed',
    box: '#ffffff',
    boxBorder: 'none',
    text: '#161619',
    caret: '#3b3c3c',
    accent: '#d87756',
    muted: '#55504d',
    line: '#dedede',
    shadow: 'rgba(101, 93, 85, 0.5)',
    sendIcon: 'up',
  },
  // 浅底：接近常见的白底聊天页（底是浅灰，框是白的，发送钮是黑的）
  light: {
    bg: '#f4f4f2',
    title: '#1a1a1a',
    box: '#ffffff',
    boxBorder: '#e2e2df',
    text: '#1f2328',
    caret: '#2f3237',
    accent: '#1f2328',
    muted: '#6b7076',
    line: '#dedfdd',
    shadow: 'rgba(40, 36, 30, 0.10)',
    sendIcon: 'up',
  },
  // 深底：接近常见的深灰蓝输入页（框比底亮一点，发送钮是淡紫的）
  dark: {
    bg: '#0f1319',
    title: '#eef1f6',
    box: '#1b212b',
    boxBorder: '#2b3442',
    text: '#e6edf3',
    caret: '#cfd6df',
    accent: '#7c8cf8',
    muted: '#98a2b3',
    line: '#39424f',
    shadow: 'rgba(0, 0, 0, 0.35)',
    sendIcon: 'plane',
  },
};

/** theme 选 custom 时各色的起点，也是 schema 里的默认值。 */
export const CUSTOM_DEFAULT: Theme = THEMES.claude;

/** 自定义外观可以只填要换的几项，其余照默认。 */
export const themeFor = (name: string, custom: Partial<Theme> | undefined): Theme =>
  name === 'custom' ? {...CUSTOM_DEFAULT, ...custom} : (THEMES as Record<string, Theme>)[name] ?? THEMES.claude;

/** '#rrggbb' 转成带不透明度的 rgba()；不是这个写法就原样返回。 */
export const hexToRgba = (hex: string, a: number): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return hex;
  }
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** '#rrggbb' 的亮度（0 到 1）。给钮配图标颜色时用：钮浅就用深色，钮深就用白色。 */
export const luminance = (hex: string): number => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return 0;
  }
  const n = parseInt(m[1], 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
