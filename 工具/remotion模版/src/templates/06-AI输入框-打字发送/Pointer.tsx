import React from 'react';

/**
 * 系统样式的鼠标指针：白色箭头、外头一圈黑边、再往外一点很淡的橙色光晕。
 * 用内联 SVG 画，不是图片。箭头的几个顶点量自参考第 95 帧（那一帧指针整只在深色底上、不透明）：
 * 白色本体的外框是 63×100 像素，尖在左上角。下面的坐标以尖为 (0, 0)：
 * 右尖 → 尾巴根的右侧 → 尾巴右下 → 尾巴左下 → 箭头下面的凹角 → 左下角，再回到尖。
 */
const TIP: [number, number] = [4.5, 4.5]; // 尖在 SVG 画布里的位置；四周留出 4 像素多给黑边
const POINTS: [number, number][] = [
  [0, 0],
  [63, 61.5],
  [35.1, 66.2],
  [47.5, 97],
  [39, 100],
  [23.7, 68.3],
  [0.6, 90.5],
];
const PATH = 'M' + POINTS.map(([x, y]) => `${(x + TIP[0]).toFixed(1)},${(y + TIP[1]).toFixed(1)}`).join(' L') + ' Z';

/** 指针图的大小（像素）。黑边最厚处往外 4 像素。 */
export const POINTER_W = 80;
export const POINTER_H = 114;
/** 黑边多厚（像素）。量自参考第 94 帧：左边白体外面紧挨着 4 像素的深色带。 */
export const POINTER_BORDER = 4;

/**
 * (x, y) 是指针的尖落在画面的哪里，scale 是以尖为轴缩放到几成（点下去那一下会缩），opacity 是整体不透明度。
 * 先画一层描了边的黑色箭头当黑边，再把白色箭头盖在上面，这样白体的大小就是量到的那个数，黑边全在外面。
 * 黑边用圆角接缝：尖上的角只有 45°，用尖角接缝会拖出一根长刺，参考里没有。
 */
export const Pointer: React.FC<{x: number; y: number; scale: number; opacity: number; glow?: string}> = ({x, y, scale, opacity, glow}) => {
  if (opacity <= 0.002) {
    return null;
  }
  return (
    <svg
      width={POINTER_W}
      height={POINTER_H}
      viewBox={`0 0 ${POINTER_W} ${POINTER_H}`}
      style={{
        position: 'absolute',
        left: x - TIP[0],
        top: y - TIP[1],
        width: POINTER_W,
        height: POINTER_H,
        transform: `scale(${scale})`,
        transformOrigin: `${TIP[0]}px ${TIP[1]}px`,
        opacity,
        overflow: 'visible',
        filter: glow ? `drop-shadow(0 0 6px ${glow})` : undefined,
      }}
    >
      <path d={PATH} fill="#0b0b0b" stroke="#0b0b0b" strokeWidth={POINTER_BORDER * 2} strokeLinejoin="round" />
      <path d={PATH} fill="#ffffff" />
    </svg>
  );
};
