// 这个模版对外的四样东西：画幅、组件、参数定义、默认值。库根目录的 src/Root.tsx 按这里登记，别的模版照这个样子写 index.ts。
export const width = 1920;
export const height = 1080;
export {TypedTable as Template} from './TypedTable';
export {typedTableSchema as schema, defaultProps} from './schema';
