import {isWide} from '../../shared/textParts';

/**
 * 提示词太长时输入框里会折行。这里用估算的办法先数一数能折几行，放不下就把字号缩一点。
 * 估的是每个字大概多宽（单位：一个字高），不量真实的字，所以只是大概；目的只是别让字压到下面的图标上。
 */

/** 一个字大概占几个“字高”宽。 */
const widthEm = (ch: string): number => {
  if (ch === ' ') {
    return 0.27;
  }
  if (isWide(ch)) {
    return 1; // 汉字、全角标点
  }
  if (/[A-Z]/.test(ch)) {
    return 0.6;
  }
  if (/[iljtfr.,'’]/.test(ch)) {
    return 0.3;
  }
  if (/[mwMW]/.test(ch)) {
    return 0.8;
  }
  if (/[a-z]/.test(ch)) {
    return 0.5;
  }
  if (/[0-9]/.test(ch)) {
    return 0.55;
  }
  return 0.4;
};

/** 粗略模拟浏览器的折行：汉字哪里都能断，英文单词在空格处断。返回行数。 */
export const countLines = (text: string, maxWidth: number, fontSize: number): number => {
  const unit = fontSize * 0.84; // fontStretch 默认 82% 左右，拉丁字母按这个宽度算
  const chars = Array.from(text);
  let lines = 1;
  let x = 0;
  let wordStart = -1; // 当前英文单词从哪开始
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const w = widthEm(ch) * unit;
    if (x + w > maxWidth + 0.5) {
      // 放不下了
      if (ch === ' ') {
        // 行尾正好碰到空格：就在这里断，空格留在行尾
        x = 0;
        wordStart = -1;
        lines++;
        continue;
      }
      if (wordStart > 0) {
        // 正接着一个英文单词：把整个单词挪到下一行去；单词自己就一行放不下，那就硬断
        let back = 0;
        for (let k = wordStart; k < i; k++) {
          back += widthEm(chars[k]) * unit;
        }
        x = back + w <= maxWidth ? back : 0;
      } else {
        x = 0; // 汉字哪里都能断
      }
      lines++;
    }
    if (ch === ' ') {
      wordStart = -1;
    } else if (wordStart < 0 && !isWide(ch)) {
      wordStart = i;
    }
    x += w;
  }
  return lines;
};

/** 在 maxSize 以内找一个折出来的行不至于超过 maxLines 的字号。 */
export const fitFontSize = (text: string, maxWidth: number, maxLines: number, maxSize: number): number => {
  let size = maxSize;
  for (let i = 0; i < 40 && countLines(text, maxWidth, size) > maxLines && size > maxSize * 0.45; i++) {
    size *= 0.93;
  }
  return size;
};
