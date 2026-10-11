// 第 7 期的特殊图表。photo.json 里用 {"type":"custom","name":"priceLadder"} 引用。
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {useC} from '../ui';
import {FlyIn, Sfx} from '../fx';
import {Box, H, P, T, at, clamp, ease, SHADOW} from '../photo/kit';
import {CustomMap} from '../photo/engine';

// CF 手袋 2019 → 2024 价格阶梯：6 根柱子从 1 涨到 ≈2，第 2 句开始逐根长出，第 3 句标出"一年两次 · 每次 10%"
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024'];
const LEVEL = [1.0, 1.21, 1.46, 1.66, 1.85, 2.0];
const PriceLadder: React.FC<P> = (p) => {
  const C = useC();
  const f = useCurrentFrame();
  const s2 = at(p, 2), s3 = at(p, 3);
  if (p.step < 2) return null;
  const base = 820, unit = 230;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #0B090700 35%, #0B0907B3 60%, #0B0907E6 100%)'}} />
      <div style={{position: 'absolute', left: 1000, width: 840, top: base - 2.2 * unit, height: 2.2 * unit, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: `3px solid ${C.white}55`}}>
        {YEARS.map((y, i) => {
          const a = s2 + i * 10;
          const g = interpolate(f, [a, a + 18], [0, 1], {...clamp, easing: ease});
          const last = i === YEARS.length - 1;
          return (
            <div key={y} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: 110, position: 'relative'}}>
              <Sfx at={a} name="tick" dur={0.3} vol={0.25} />
              {(i === 0 || last) && <div style={{opacity: g, fontFamily: C.font, fontWeight: 900, fontSize: last ? 56 : 40, color: last ? C.gold : C.white, textShadow: SHADOW, marginBottom: 8}}>{last ? '×2' : '×1'}</div>}
              <div style={{width: 86, height: LEVEL[i] * unit * g, borderRadius: '12px 12px 0 0', background: last ? C.gold : `${C.white}CC`, boxShadow: last ? `0 0 30px ${C.gold}66` : 'none'}} />
              <div style={{position: 'absolute', bottom: -48, fontFamily: C.font, fontSize: 28, color: C.dim, fontWeight: 700}}>{y}</div>
            </div>
          );
        })}
      </div>
      {p.step >= 3 && (
        <Box x={1000} y={120} w={840}>
          <Sfx at={s3} name="pop" vol={0.3} />
          <FlyIn at={s3} dir="right" dist={120}><T size={36} color={C.white} style={{letterSpacing: 3}}>一年调两次 · 每次 10% 左右</T></FlyIn>
          <FlyIn at={s3 + 6} dir="right" dist={120}><H size={54} color={C.dim}>2019 → 2024，差不多<span style={{color: C.gold}}>翻了一倍</span></H></FlyIn>
        </Box>
      )}
    </>
  );
};

export const CUSTOM7: CustomMap = {priceLadder: PriceLadder};
