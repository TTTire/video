// 字体度量（单位 em），把元素按基线摆放时要用：行框顶到基线的距离、大写字高、首字左侧留白。
// 数值是量出来的，换字体或改字号单位后要重量（scripts/measure/boxes.py）。
export const FONT_METRICS = {
  sans: {baseline: 0.83, cap: 0.7, left: 0.07}, // Archivo Variable
  serif: {baseline: 0.84, left: 0.02}, // Liberation Serif Bold Italic
};
