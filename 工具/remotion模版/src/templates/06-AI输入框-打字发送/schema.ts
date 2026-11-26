import {z} from 'zod';
import {CUSTOM_DEFAULT} from './themes';

const color = (what: string) => z.string().describe(what);

export const themeSchema = z
  .object({
    bg: color('整幅背景的颜色').default(CUSTOM_DEFAULT.bg),
    title: color('问句的颜色').default(CUSTOM_DEFAULT.title),
    box: color('输入框的底色').default(CUSTOM_DEFAULT.box),
    boxBorder: color('输入框的边线；底色和背景分得开时用，不要就写 none').default(CUSTOM_DEFAULT.boxBorder),
    text: color('打进输入框的字的颜色').default(CUSTOM_DEFAULT.text),
    caret: color('闪烁光标的颜色').default(CUSTOM_DEFAULT.caret),
    accent: color('强调色：发送钮、问句前的星标、发送后的三个点').default(CUSTOM_DEFAULT.accent),
    muted: color('左下角小图标的笔画、模型标签的字的颜色').default(CUSTOM_DEFAULT.muted),
    line: color('小图标的圆圈、模型标签药丸的描线颜色').default(CUSTOM_DEFAULT.line),
    shadow: color('输入框的投影，写成 rgba(红,绿,蓝,不透明度)').default(CUSTOM_DEFAULT.shadow),
    sendIcon: z.enum(['up', 'plane']).describe('发送按钮里的图标：up 是向上的箭头，plane 是纸飞机').default(CUSTOM_DEFAULT.sendIcon),
  })
  .describe('自己配色时填这里（theme 设为 custom 才用）。可以只填要换的几项，其余照 claude 那一套');

export const iconSchema = z.enum(['plus', 'sliders', 'globe', 'mic', 'none']);

export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）。参考是 180 帧（6 秒）；最后一段画面定住，想多停一会儿就加长'),
  theme: z
    .enum(['claude', 'light', 'dark', 'custom'])
    .describe('外观预设：claude 是参考这一套（深棕底、白框、橙钮，默认）；light 是浅灰底、白框、黑钮；dark 是深灰蓝底、淡紫钮；custom 按 customTheme 里填的颜色'),
  customTheme: themeSchema,
  question: z.string().describe('左上方的问句，星标后面那一句，居中显示'),
  showMark: z.boolean().describe('问句前面那个四角星标要不要'),
  prompt: z.string().describe('打进输入框的提示词。太长会在输入框里自动折行；折了三行还放不下就自动把字缩小一点'),
  model: z.string().describe("输入框左下角的模型标签（参考里是 Claude Sonnet 4.5）。留空 '' 就不显示这个标签"),
  icons: z.array(iconSchema).describe("模型标签左边那几个圆圈小图标，从左到右：plus 加号、sliders 滑杆、globe 地球、mic 麦克风、none 里面是三个点。给空数组 [] 就一个都不放"),
  thinking: z.boolean().describe('发送以后，发送钮左边淡入三个小点（表示 AI 正在想）。参考里有'),
  showPointer: z.boolean().describe('鼠标指针要不要出现。不要的话打好的字照样在 sendAt 淡出，只是没有人来点发送'),
  typeAt: z.number().describe('开始打字的帧。参考是第 22 帧'),
  typeEnd: z.number().describe('最后一个字出来的帧。参考是第 85 帧。中间的快慢照参考量的节奏等比伸缩'),
  clickAt: z.number().describe('指针点下发送钮的那一帧。参考是第 105 帧。指针淡入（比它早 27.5 帧）、滑过去（比它早 17 帧起，滑 15 帧）、淡出（比它晚 5 帧走完）都从它起算'),
  sendAt: z.number().describe('发送后的变化从哪一帧开始：打好的字往上淡出、模型标签收起、三个点出现。参考是第 111 帧，比 clickAt 晚 6 帧'),
  caretPeriod: z.number().min(4).describe('光标闪烁一个来回多少帧（亮一半、灭一半）。参考量出来是 28 帧，从第 0 帧亮起'),
  fontStretch: z.string().describe('拉丁字母用多宽的字（Archivo 可变字体，62% 到 125%）。参考的字比 Archivo 默认的窄一成，默认 89%；中文不受影响'),
  motionBlur: z.boolean().describe('指针滑得快时带不带动态模糊。参考里指针再快也是清楚的，所以默认关；想要更顺可以打开'),
});

export type TemplateProps = z.infer<typeof schema>;

// 默认内容是参考视频的原样（一个 AI 输入页的录屏：问句、打进去的一句提示词、模型标签），只为逐帧对照，
// 里面的东西没有核实过。帧号、大小、位置都是照参考量的（帧号从 0 数，坐标是 1920×1080 画面上的像素）。
export const defaultProps: TemplateProps = {
  durationInFrames: 180,
  theme: 'claude',
  customTheme: {...CUSTOM_DEFAULT},
  question: 'How can I help you today?',
  showMark: true,
  prompt: "Let's design an interface for a new AI workbench",
  model: 'Claude Sonnet 4.5',
  icons: ['plus', 'sliders', 'globe'],
  thinking: true,
  showPointer: true,
  typeAt: 22,
  typeEnd: 85,
  clickAt: 105,
  sendAt: 111,
  caretPeriod: 28,
  fontStretch: '89%',
  motionBlur: false,
};
