// 一次打包、连渲多张单帧（比逐帧跑 npx remotion still 快十倍）。拼图每个场景只抽开头几帧，晚出的字要靠这个看。
// 用法：node scripts/stills.mjs <合成 id> <输出目录> <名字=帧号 …>
//   node scripts/stills.mjs Ep11FullCheck out/ep11-keys define=303 card=462 series=1156
// 每帧一张 <输出目录>/<名字>-<帧号>.jpg
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [compId, outDir, ...specs] = process.argv.slice(2);
const frames = specs.map((s) => {
  const [label, frame] = s.includes('=') ? s.split('=') : [s, s];
  return {label, frame: parseInt(frame, 10)};
});
if (!compId || !outDir || !frames.length || frames.some((f) => Number.isNaN(f.frame))) {
  console.error('用法：node scripts/stills.mjs <合成 id> <输出目录> <名字=帧号 …>');
  process.exit(1);
}

const dir = path.resolve(ROOT, outDir);
fs.mkdirSync(dir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: compId});
for (const {label, frame} of frames) {
  const output = path.join(dir, `${label}-${frame}.jpg`);
  await renderStill({composition, serveUrl, output, frame, imageFormat: 'jpeg', jpegQuality: 88});
  console.log(`  ${label} @${frame} → ${path.relative(ROOT, output)}`);
}
