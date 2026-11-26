import {z} from 'zod';

const beatSchema = z.object({
  photo: z.string().describe('这一拍的照片：staticFile 路径，文件放在 public/t05/ 下就写 t05/xxx.jpg。留空就画占位色块（颜色取 color）'),
  color: z.string().describe('这一拍的主色：没给照片时占位色块的颜色（给出照片时不用，可以留着当备注）'),
  style: z.enum(['圆环', '小卡', '大卡']).describe('版式。圆环：抠图产品图外面套一圈虚线圆，短句在图上、下各一行；小卡：照片卡片小一点、偏下，短句离卡片近；大卡：照片卡片占满中间，短句在卡片上方'),
  transition: z.enum(['切入', '升入', '闪白']).describe('这一拍怎么进来。切入：上一拍直接换成它，卡片后面的丝带接着往下扫、不重来；升入：它从画面下沿升上来落定，上一拍同时往上飞走；闪白：卡片那一块冲到很亮但不到全白，新照片在白底下透出来、两帧回到全实，位置不变'),
  at: z.number().describe('这一拍出现的帧（从 0 数）。切入：就是换画面的那一帧；升入：卡片在第 at 帧从画面下沿露头、第 at+20 帧落定（上一拍从第 at−16.5 帧开始往上飞）；闪白：第 at−2 帧起在白底下透出这一张，第 at−1 帧最亮，第 at+1 帧回到全实'),
  caption: z.string().describe('这一拍的短句（照片上方那一行，写一行）'),
  captionBelow: z.string().describe('照片下方那行粗斜体短句。只有“圆环”版式用到；不用就留空'),
});

const lineSchema = z.object({
  text: z.string().describe('这一行的字'),
  bold: z.boolean().describe('true 是粗斜体大字，false 是细体小字'),
  at: z.number().describe('这一行出现的帧（从 0 数）'),
});

// 默认内容是参考视频的原样（一条星巴克品牌短片），只为逐帧对照：里面的文字没有核实过。
// 照片是原作者的素材，不进模版，全部用占位色块；颜色是从参考第 84、140、200、230、260 帧的卡片里取的主色。
// 标志图形（压纹、杯子上的圆标、背景里那几大块黑色形状）都换成了中性的图案。帧号是照参考量的。
export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）'),
  orientation: z.enum(['横屏', '竖屏']).describe('画幅。横屏是 1920×1080，默认；竖屏是 1080×1920，照参考视频排的'),
  motionBlur: z.boolean().describe('动得快的地方带不带动态模糊。带上更顺，出片要慢两三倍。先调内容时可以关掉'),
  colors: z.object({
    paper: z.string().describe('底：压纹纸正中间的颜色'),
    paperMid: z.string().describe('底：压纹纸从中间到角上一半处的颜色'),
    paperEdge: z.string().describe('底：压纹纸四个角的颜色'),
    ribbon: z.string().describe('丝带的颜色'),
    ink: z.string().describe('粗斜体大字、大卡小卡那一拍的短句的颜色'),
    inkSoft: z.string().describe('细体小字（开场、收尾、圆环那一拍的上方短句）的颜色'),
    inkGrey: z.string().describe('圆环那一拍下方粗斜体短句的颜色（参考里它是灰的）'),
    shape: z.string().describe('背景里那几个深色装饰形状的颜色'),
  }).describe('配色'),
  opening: z.object({
    image: z.string().describe('开场的产品图：透明底的 PNG（staticFile 路径），以杯盖中心那个位置为锚点摆。留空就画一只占位纸杯，上面写着“产品图”'),
    cupAt: z.number().describe('产品图从左下升上来的帧'),
    titleSmall: z.string().describe('开场右上方那行细体小字（右对齐）'),
    titleBig: z.string().describe('小字下面那行粗斜体大字，主角的名字（右对齐）'),
    titleAt: z.number().describe('这一组从右边滑进来的帧（大字晚 8 帧）'),
    ribbonAt: z.number().describe('丝带从左边扫进来的帧'),
    tagSmall: z.string().describe('产品图左下那行细体小字'),
    tagBig: z.string().describe('它下面那行粗斜体大字'),
    tagAt: z.number().describe('这一组从左边滑进来的帧（大字晚 6 帧）'),
  }).describe('开场：压纹纸上产品图升上来，一组字从右边滑进来，丝带扫过，再一组字从左边滑进来'),
  beats: z.array(beatSchema).min(1).describe('中间的几拍：一拍一张照片配一句短句，照顺序出现'),
  ending: z.object({
    at: z.number().describe('收尾开始的帧：最后一拍的短句在这之前 9 到 4 帧淡掉，卡片只在之前 4 帧整张发虚，这一帧直接换成压纹纸和产品图；产品图在之后 6 帧里从九成大小、半透明长到原大小、长实'),
    image: z.string().describe('收尾用的产品图（同开场的写法）。留空就用开场那张；开场也没给，就画占位纸杯'),
    near: z.array(lineSchema).max(3).describe('推近之前产品图下面逐行出现的字，最多三行：第一行在产品图上方，后两行在下面'),
    zoomAt: z.number().describe('镜头推近的帧'),
    close: z.array(lineSchema).max(4).describe('推近以后右边逐行出现的字，最多四行'),
  }).describe('收尾：回到产品图，逐行出字，镜头推近成大特写，再逐行出最后的字'),
});

export type TemplateProps = z.infer<typeof schema>;
export type Beat = TemplateProps['beats'][number];

export const defaultProps: TemplateProps = {
  durationInFrames: 361,
  orientation: '横屏',
  motionBlur: true,
  // 颜色是量参考取的：纸面第 0 帧的中心 (360,640)、中点和角 (40,40)；丝带第 60 帧；装饰形状第 80 帧
  colors: {
    paper: '#eef6f1',
    paperMid: '#cdd8d3',
    paperEdge: '#a1a4a1',
    ribbon: '#00673c',
    ink: '#0c1411',
    inkSoft: '#3a4540',
    inkGrey: '#505a56',
    shape: '#1a1a1a',
  },
  opening: {
    image: '',
    cupAt: 10,
    titleSmall: 'This is how',
    titleBig: 'Starbucks',
    titleAt: 10,
    ribbonAt: 27,
    tagSmall: 'built a',
    tagBig: 'lifestyle',
    tagAt: 31,
  },
  beats: [
    {photo: '', color: '#3e2520', style: '圆环', transition: '切入', at: 68, caption: 'More than', captionBelow: 'just coffee'},
    {photo: '', color: '#3c2b21', style: '小卡', transition: '升入', at: 105, caption: 'They focused on experience', captionBelow: ''},
    {photo: '', color: '#14333b', style: '大卡', transition: '升入', at: 174, caption: 'Morning routines', captionBelow: ''},
    {photo: '', color: '#8a5630', style: '大卡', transition: '闪白', at: 207, caption: 'cozy cafés', captionBelow: ''},
    {photo: '', color: '#b38c56', style: '大卡', transition: '切入', at: 242, caption: 'work sessions', captionBelow: ''}, // 占位色取参考第 262 帧卡片的中位色，比咖啡馆那张浅一截，硬切过去才看得出换了照片
  ],
  ending: {
    at: 273, // 参考第 273 帧（时间轴帧号）卡片换成纸和杯子
    image: '',
    near: [
      {text: "It wasn't", bold: false, at: 276},
      {text: 'about', bold: false, at: 288},
      {text: 'coffee', bold: true, at: 292},
    ],
    zoomAt: 297,
    close: [
      {text: 'It was', bold: false, at: 306},
      {text: 'about', bold: false, at: 311},
      {text: 'the', bold: false, at: 320},
      {text: 'feeling', bold: true, at: 324},
    ],
  },
};
