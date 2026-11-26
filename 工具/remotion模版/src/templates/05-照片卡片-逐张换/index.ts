// 这个模版对外的五样东西：默认画幅、按参数定画幅、组件、参数定义、默认值。库根目录的 src/Root.tsx 按这里登记。
// 它有两个画幅，由 orientation 参数选：默认横屏，竖屏是参考视频原来的 9:16。
import {TemplateProps} from './schema';

export const width = 1920;
export const height = 1080;

/** 某一组参数对应的画幅。Root.tsx 把它交给合成，所以换 orientation 时画面大小跟着变。 */
export const sizeForProps = (props: TemplateProps): {width: number; height: number} =>
  props.orientation === '竖屏' ? {width: 1080, height: 1920} : {width: 1920, height: 1080};

export {Template} from './Template';
export {schema, defaultProps} from './schema';
