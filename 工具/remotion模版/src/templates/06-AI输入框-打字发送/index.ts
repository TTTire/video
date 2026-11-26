// 这个模版对外的四样东西：画幅、组件、参数定义、默认值。库根目录的 src/Root.tsx 按这里登记。
// 只做横屏 1920×1080（参考就是这个画幅），所以不用 sizeForProps。30fps，时长由 durationInFrames 参数控制。
export const width = 1920;
export const height = 1080;
export {Template} from './Template';
export {schema, defaultProps} from './schema';
