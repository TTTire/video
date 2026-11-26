import {z} from 'zod';

const titlePartSchema = z.object({
  text: z.string().describe('这一段的文字，逐字排开'),
  size: z.number().describe('字号（px）'),
  scaleX: z.number().min(0.3).max(3).optional().describe('横向拉伸，不填为 1'),
  scaleY: z.number().min(0.3).max(3).optional().describe('纵向拉伸，不填为 1'),
  gap: z.number().describe('这一段前面留多少像素（可以是负数）'),
  dy: z.number().describe('底边相对公共底线上下错位，正值向下'),
});

const rowSchema = z.object({
  name: z.string().describe('名字一栏'),
  value: z.string().describe('数值一栏'),
  strong: z.boolean().describe('是否用粗体（参考里前两行粗、第三行细）'),
  nameAt: z.number().min(0).describe('表格进场后第几帧开始打名字'),
  valueAt: z.number().min(0).describe('表格进场后第几帧开始打数值'),
  nameSpeed: z.number().min(0.1).max(8).optional().describe('这一行名字每帧打几个字符，不填用全局的'),
  valueSpeed: z.number().min(0.1).max(8).optional().describe('这一行数值每帧打几个字符，不填用全局的'),
});

const highlightSchema = z.object({
  at: z.number().min(0).describe('表格进场后第几帧开始点亮'),
  from: z.number().int().min(1).describe('点亮从第几行开始（从 1 数）'),
  to: z.number().int().min(1).describe('点亮到第几行为止（从 1 数）'),
});

export const typedTableSchema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）。动效在第 130 帧前做完，往后是定住并缓慢漂移'),
  title: z.array(titlePartSchema).describe('标题，第一个元素是大字，其余是小字'),
  subtitle: z.string().describe('红色斜体英文副标题，逐字打出；留空则不出现'),
  subtitleAt: z.number().min(0).describe('副标题从第几帧开始打'),
  subtitleCharsPerFrame: z.number().min(0.1).max(8).describe('副标题每帧打几个字符'),
  header: z.string().describe('表格上方的斜体表头'),
  tableAt: z.number().int().min(0).describe('表格从第几帧开始滑入；标题会在它之前 23 帧开始退场'),
  titleExitAt: z.number().int().min(1).optional().describe('标题完全出画的帧。有表格时默认等于 tableAt；没有表格时默认不出画'),
  titleCenter: z.boolean().describe('标题整块水平居中，过宽时自动缩小。关着时位置照参考排，适合四五个字的短标题'),
  rows: z.array(rowSchema).describe('表格的行'),
  nameCharsPerFrame: z.number().min(0.1).max(8).describe('名字每帧打几个字符（没单独设的行用这个）'),
  valueCharsPerFrame: z.number().min(0.1).max(8).describe('数值每帧打几个字符（没单独设的行用这个）'),
  highlights: z.array(highlightSchema).describe('黄色高亮，可以有多块'),
  backgroundImage: z.string().optional().describe('铺底图片，填 public/ 下的相对路径，如 bg.jpg；不填是素色底'),
  wash: z.number().min(0).max(1).describe('铺底图片上压一层浅色的不透明度，保证黑字看得清'),
});

export type TypedTableProps = z.infer<typeof typedTableSchema>;
export type TitlePart = z.infer<typeof titlePartSchema>;

// 默认内容就是参考视频里的画面，时间点也照着参考的帧号填，方便逐帧对照。
export const defaultProps: TypedTableProps = {
  durationInFrames: 240,
  title: [
    {text: '长', size: 229, scaleY: 1.63, gap: 0, dy: 0},
    {text: '链路', size: 235, scaleX: 1.09, gap: 9, dy: 35},
    {text: '测试', size: 216, scaleX: 0.78, gap: 10, dy: -8},
  ],
  subtitle: 'Long link testing',
  subtitleAt: 0,
  subtitleCharsPerFrame: 0.85,
  header: 'SWE Marathon长链路测试',
  tableAt: 53,
  titleCenter: false,
  rows: [
    {name: 'Kimi K3', value: '42.0', strong: true, nameAt: 0.9, nameSpeed: 2.4, valueAt: 12},
    {name: 'Fable 5', value: '35.0', strong: true, nameAt: 15, nameSpeed: 1, valueAt: 29, valueSpeed: 1},
    {name: 'GPT-5.6Sol', value: '39.0', strong: false, nameAt: 35, nameSpeed: 1.4, valueAt: 49},
  ],
  nameCharsPerFrame: 1.5,
  valueCharsPerFrame: 0.8,
  highlights: [{at: 51, from: 1, to: 2}],
  wash: 0.2,
};
