import {z} from 'zod';

export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）'),
  title: z.string().describe('标题文字。粗做阶段先用这一项，版面定下来再往下加参数'),
});

export type TemplateProps = z.infer<typeof schema>;

// 默认内容写参考视频的原样，并注明只为对照、没有核实过；真实的内容另存成 示例-xxx.json。
export const defaultProps: TemplateProps = {durationInFrames: 240, title: '待替换'};
