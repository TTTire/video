import {z} from 'zod';

const highlightSchema = z.object({
  text: z.string().describe('要高亮的词：写成正文里的一段子串（出现几次取第一处，换行不算在内）。高亮块正好盖住这几个字，从左往右刷出来'),
  at: z.number().describe('高亮开始刷的帧。参考里是 30.5'),
  wipe: z.number().min(0.01).describe('从左往右刷完用几帧，匀速。参考里是 21 帧'),
  end: z.number().nullable().describe('从哪一帧起开始消失（从左往右刷走，用 8 帧）。写成 null 就一直留着'),
  color: z.string().nullable().describe('这一块高亮的颜色。写成 null 就用 highlightColor'),
});

export const schema = z.object({
  durationInFrames: z.number().int().min(1).describe('成片总帧数（30fps）。参考是 60 帧（2 秒）'),
  sender: z.string().describe('号码那一行：头像下面居中的那串字'),
  titleLine: z.string().describe('中间偏上第一行灰色小字。参考是“信息 · 短信”'),
  timeLine: z.string().describe('中间偏上第二行灰色小字。参考是“前天 21:07”'),
  badge: z.string().describe('左上角蓝色圆徽标里的数。留成空字符串就不画它'),
  badgeColor: z.string().describe('徽标的颜色'),
  battery: z.string().describe('右上角电池图标里的电量数字。留成空字符串就不画状态栏的三个图标'),
  body: z.string().describe('气泡里的正文。写了换行（\\n）就在那儿断行，没有换行的地方排到气泡右边自动换行。默认内容照参考，在参考换行的四处写了换行'),
  typeAt: z.number().describe('第一个字在哪一帧出现，可以带小数。参考里第 0 帧正文就全在了，所以默认给的是负数：还没开拍就打完了'),
  charsPerFrame: z.number().min(0).describe('每帧打出几个字，可以带小数；0 就一个字都不出'),
  link: z.string().describe('正文里做成链接样式的哪一段（白字加灰色下划线），写成子串，中间隔着换行也认。留成空字符串就没有下划线'),
  highlights: z.array(highlightSchema).describe('高亮，可以有好几块，每一块有自己的帧号和颜色'),
  highlightColor: z.string().describe('高亮块默认的颜色。参考是荧光黄'),
  strength: z.number().min(0).max(1100).describe('鱼眼多强：画面离镜头中心最远的那一角，内容往外挪多少像素。越大弯得越厉害，0 是没有镜头，最大 1100。参考的弯曲很强（strength 是 reach 的 0.90），横屏默认 1000'),
  lensX: z.number().describe('镜头中心在画面的横坐标。镜头自己不动，画面的漂移是内容在动'),
  lensY: z.number().describe('镜头中心在画面的纵坐标'),
  drift: z.number().min(0).describe('镜头漂移的量：1 是照参考量的（内容往右上挪、略缩小、带一点三维的转角），0 是一点也不动。高亮照常出现'),
  driftFrom: z.number().describe('漂移从第几帧起明显看得出来。参考是第 4 帧'),
  driftEnd: z.number().describe('漂移到第几帧停住。参考是第 29 帧，停住以后只剩高亮在刷'),
  glow: z.number().min(0).max(2).describe('字边缘发亮发糊的程度：0 是锐利的字，1 是比较明显的辉光'),
  scanlines: z.number().min(0).max(1).describe('横向扫描纹（拍屏幕的摩尔纹）有多深'),
  vignette: z.number().min(0).max(2).describe('四角压黑的强度，0 是不压'),
  grain: z.number().min(0).max(1).describe('颗粒的不透明度'),
  bandColor: z.string().describe('顶部深灰带的颜色'),
  bubbleColor: z.string().describe('气泡的颜色'),
  textColor: z.string().describe('正文的颜色'),
  labelColor: z.string().describe('两行灰色小字的颜色'),
  senderColor: z.string().describe('号码那一行的颜色'),
  underLineColor: z.string().describe('链接下划线的颜色'),
  image: z.string().nullable().describe('给了 public/ 里的图片路径（比如 t04/文档.png）就贴在气泡的位置上、按气泡的圆角裁，正文不打字。文档页截图这么用。写成 null 就只打出字'),
  motionBlur: z.boolean().describe('内容动得快时带不带动态模糊。带上更顺，出片要慢两三倍。先调内容时可以关掉'),
});

export type TemplateProps = z.infer<typeof schema>;

// ---- 默认内容是参考视频的原样（一条校园访客短信的手机截图），只为对照，里面的日期、号码、校名都没有核实过 ----
// 正文里“浙大”是参考高亮的词；链接那一段是参考带下划线的日期。
// 时间点是照参考量的：画面第 4 帧起漂、第 29 帧停；高亮第 30.5 帧起刷、第 51.5 帧刷完。
// 参考里正文第 0 帧就已经全在了，没有打字的过程，所以 typeAt 给负数。
export const defaultProps: TemplateProps = {
  durationInFrames: 60,
  sender: '106880379770779',
  titleLine: '信息 · 短信',
  timeLine: '前天 21:07',
  badge: '52',
  badgeColor: '#0a84ff',
  battery: '34',
  body: '【浙江大学】欢迎您在2026年09月04\n日～2026年09月04日访问紫金港校区。\n支付宝“浙大通”小程序通行码或本人\n身份证进入校园。',
  typeAt: -40,
  charsPerFrame: 2,
  link: '2026年09月04日～2026年09月04日',
  highlights: [{text: '浙大', at: 30.5, wipe: 21, end: null, color: null}],
  highlightColor: '#e8cf2e',
  strength: 1000,
  lensX: 960,
  lensY: 540,
  drift: 1,
  driftFrom: 4,
  driftEnd: 29,
  glow: 0.55,
  scanlines: 0.14,
  vignette: 0.85,
  grain: 0.1,
  bandColor: '#101012',
  bubbleColor: '#242427',
  textColor: '#efeff2',
  labelColor: '#8a8a8e',
  senderColor: '#e4e6e8',
  underLineColor: '#7c7c7e',
  image: null,
  motionBlur: true,
};
