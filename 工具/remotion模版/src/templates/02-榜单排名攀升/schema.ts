import {z} from 'zod';

const rowSchema = z.object({
  lab: z.string().describe('机构名'),
  model: z.string().describe('型号，名字下面那行等宽小字'),
  score: z.number().describe('分数。高亮那一行会从 countFrom 一路数到这里'),
  err: z.string().describe('分数后面的浮动区间，如 ±10、+6'),
  rank: z.number().int().describe('Model Rank 一栏的数'),
  spread: z.string().describe('Rank Spread 一栏，如 1 ↔ 17'),
  logo: z.string().max(2).describe('行首小方块里的字母'),
  color: z.string().describe('小方块的颜色'),
});

export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）'),
  orientation: z.enum(['横屏', '竖屏']).describe('画幅。横屏是 1920×1080，默认；竖屏是 9:16，参考视频原来的样子'),
  title: z.string().describe('网页的大标题'),
  badge: z.string().describe('大标题旁边的灰色小标签'),
  description: z.string().describe('大标题下面的一行说明'),
  meta: z.array(z.string()).describe('再下面一行的小字，带图标的那几项，依次排开'),
  headers: z.object({
    rank: z.string(),
    lab: z.string(),
    score: z.string(),
    modelRank: z.string(),
    spread: z.string(),
  }).describe('表头五列的文字'),
  rows: z.array(rowSchema).describe('榜单，从上到下。高亮那一行写在它最后停下的位置上'),
  highlight: z.number().int().min(0).describe('高亮的是第几行（从 0 数），也就是它最后停下的那一格。这一行会展开、放大，分数往上数，下面长出进度条'),
  climbFrom: z
    .number()
    .int()
    .min(0)
    .describe('高亮行从第几格开始往上爬（从 0 数，不算它自己；它一上来压在这一行上面）。默认 8，就是一上来压在倒数第二行上，爬到第 1 格'),
  countFrom: z.number().describe('分数从多少开始数'),
  rowAt: z.number().describe('高亮行开始出现的帧'),
  countAt: z.number().describe('分数开始数的帧'),
  countEnd: z.number().describe('分数数完的帧'),
  barAt: z.number().describe('进度条开始长的帧'),
  flashAt: z.number().describe('画面开始发白失焦的帧，是拉远前的过渡'),
  zoomAt: z.number().describe('镜头开始拉远的帧。闪白最亮的时候过去之后'),
  zoomEnd: z.number().describe('镜头拉到位的帧，之后画面不再变'),
  motionBlur: z.boolean().describe('页面快速移动时带不带动态模糊。带上更顺，出片要慢两三倍。先调内容时可以关掉'),
});

export type TemplateProps = z.infer<typeof schema>;

// 默认内容是参考视频的原样（一个 AI 模型榜单的网页），只为对照，这些分数没有核实过。
// 各个帧号是照参考量出来的。
export const defaultProps: TemplateProps = {
  durationInFrames: 240,
  orientation: '横屏',
  title: 'Text Arena',
  badge: '🏆 Overall',
  description: 'View overall rankings across various AI models in text-to-text tasks across math, coding, creative writing, and other open-ended domains.',
  meta: ['Aug 1, 2026', '7,571,037 votes', '27 labs', '1 AutoEval'],
  headers: {rank: 'Lab Rank', lab: 'Lab', score: 'Model Score', modelRank: 'Model Rank', spread: 'Rank Spread'},
  rows: [
    {lab: 'Anthropic', model: 'claude-fable-5', score: 1509, err: '±6', rank: 1, spread: '1 ↔ 4', logo: 'A', color: '#191919'},
    {lab: 'Alibaba', model: 'qwen3.8-max', score: 1496, err: '±10', rank: 5, spread: '1 ↔ 17', logo: '✛', color: '#2563eb'},
    {lab: 'Meta', model: 'muse-spark-1.1', score: 1490, err: '±6', rank: 9, spread: '4 ↔ 18', logo: '∞', color: '#0866ff'},
    {lab: 'Google', model: 'gemini-3-pro', score: 1486, err: '±4', rank: 11, spread: '5 ↔ 19', logo: 'G', color: '#4285f4'},
    {lab: 'Moonshot', model: 'kimi-k3-max', score: 1485, err: '±10', rank: 13, spread: '4 ↔ 31', logo: 'K', color: '#111111'},
    {lab: 'OpenAI', model: 'gpt-5.6-sol-xhigh', score: 1483, err: '±6', rank: 15, spread: '5 ↔ 29', logo: '◎', color: '#111111'},
    {lab: 'SpaceXAI', model: 'grok-4.20-beta1', score: 1474, err: '±5', rank: 25, spread: '13 ↔ 40', logo: '✈', color: '#111111'},
    {lab: 'Z.ai', model: 'glm-5.2-max', score: 1469, err: '±5', rank: 33, spread: '18 ↔ 47', logo: 'Z', color: '#111111'},
    {lab: 'Baidu', model: 'ernie-5.1', score: 1468, err: '±5', rank: 38, spread: '19 ↔ 48', logo: '◇', color: '#2932e1'},
    {lab: 'Xiaomi', model: 'mimo-v2.6-pro', score: 1466, err: '±4', rank: 40, spread: '21 ↔ 51', logo: 'mi', color: '#aac0dc'},
    {lab: 'DeepSeek', model: 'deepseek-v4-pro', score: 1458, err: '±4', rank: 49, spread: '39 ↔ 60', logo: '🐬', color: '#4d6bfe'},
  ],
  highlight: 1,
  climbFrom: 8,
  countFrom: 1400,
  rowAt: 4,
  countAt: 17,
  countEnd: 40,
  barAt: 40,
  flashAt: 155,
  zoomAt: 172,
  zoomEnd: 228,
  motionBlur: true,
};
