// 第 11 期的特殊图表。photo.json 里用 {"type":"custom","name":"xxx"} 引用。
// 场景里的先后写成「第几条要点开始后第几帧」：at(p, i) + N，N 按定版粗剪（粗剪.words.json）的逐字时间对口播（注释里写了对的是哪个词）。
// 粗剪重剪过就按新的逐字时间重对一遍。
//   doc     06 pigou（1.1）、14 resale（2.4）：庇古《福利经济学》第 17 章原文页（D01 章首、D02 § 5），黑底文档页，见 src/photo/docpage.tsx
//   ticket  16 movie（2.6）：上上周《生化危机》——票价 ¥70，实付 30 多；里程表 70 → 30 再跟一个「多」字（他说的是"30 多"，不写成精确数）
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {FONTS, P, T, at, clamp} from '../photo/kit';
import {CardEnter, TTab} from '../photo/tactile';
import {Odometer} from '../photo/numfx';
import {CustomMap} from '../photo/engine';
import {DocPage} from '../photo/docpage';

const CW = 900;   // 和本期其他卡一样 900 宽、居中（x 510–1410）
const NUM: React.CSSProperties = {fontFamily: FONTS.num, fontVariantNumeric: 'tabular-nums', letterSpacing: 0, lineHeight: 1};
const ROLL = 28;   // Odometer 默认 dur

// 2.6 开始后：「像上上周」(+242) 卡出；「就以30多」(+309) 第 1 行 票价 ¥70；「70块钱」(+366) 第 2 行 实付：里程表 ¥70 → ¥30，滚完出「多」
const CARD_AT = 242, ROW1_AT = 309, ROW2_AT = 366;
const TicketPrice: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const a = at(p, 0) + CARD_AT;
  if (f < a) return null;
  const a1 = at(p, 0) + ROW1_AT, a2 = at(p, 0) + ROW2_AT;
  const k1 = interpolate(f, [a1, a1 + 10], [0, 1], clamp);
  const k2 = interpolate(f, [a2, a2 + 10], [0, 1], clamp);
  const duo = interpolate(f, [a2 + 4 + ROLL + 6, a2 + 4 + ROLL + 16], [0, 1], clamp);   // 两位数字滚完（右位先动、左位晚 3 帧）再出「多」
  return (
    <div style={{position: 'absolute', left: 510, top: 330, width: CW}}>
      <CardEnter at={a} dir="up" dist={120}>
        <TTab label="上上周 · 《生化危机》" w={CW} seed={5}>
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24, opacity: k1}}>
              <T size={36}>票价</T>
              <span style={{fontSize: 96, color: C.dim, ...NUM}}><span style={{fontSize: 69}}>¥</span>70</span>
            </div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24, opacity: k2}}>
              <T size={36}>实付</T>
              {f >= a2 && <Odometer from="¥70" to="¥30" at={a2 + 4} size={126} />}
              <span style={{fontFamily: FONTS.title, fontWeight: 800, fontSize: 72, color: C.gold, opacity: duo, transform: `translateY(${(1 - duo) * 16}px)`, display: 'inline-block'}}>多</span>
            </div>
          </div>
        </TTab>
      </CardEnter>
    </div>
  );
};

export const CUSTOMEP11: CustomMap = {doc: DocPage, ticket: TicketPrice};
