// 这个模版对外的东西：画幅、组件、参数定义、默认值（库根目录的 src/Root.tsx 按这里登记），还有出片时要按几倍渲染。
export const width = 1920;
export const height = 1080;

// 这个模版用了 Lens（鱼眼镜头）。Chrome 做置换时位移是取整像素的，1 倍渲出来卡片边上有一像素的台阶，
// 所以 scripts/render.py 看到这一行会按 2 倍渲、再用 ffmpeg 缩回 1920×1080。手敲 remotion 命令时自己加 --scale 2
export const renderScale = 2;
export {Template} from './Template';
export {schema, defaultProps} from './schema';
