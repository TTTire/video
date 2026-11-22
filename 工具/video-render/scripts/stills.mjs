// 一次打包、渲多张单帧，拼成一张核对图（比逐帧跑 npx remotion still 快 10 倍）。
// 用法：node scripts/stills.mjs <合成 id> <输出 jpg> <帧号或 名字=帧号，空格分隔…> [--cols 3]
//   node scripts/stills.mjs Ep11FullCheck out/ep11-keys.jpg define=303 card=462 series=1156
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const cols = args.includes('--cols') ? parseInt(args[args.indexOf('--cols') + 1], 10) : 3;
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--cols');
const [compId, outPath, ...specs] = pos;
if (!compId || !outPath || !specs.length) {
  console.error('用法：node scripts/stills.mjs <合成 id> <输出 jpg> <名字=帧号 …> [--cols 3]');
  process.exit(1);
}
const frames = specs.map((s) => {
  const [a, b] = s.includes('=') ? s.split('=') : [s, s];
  return {label: a, frame: parseInt(b, 10)};
});

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stills-'));
const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
const composition = await selectComposition({serveUrl, id: compId});
const files = [];
for (const {label, frame} of frames) {
  const output = path.join(tmp, `${label}-${frame}.jpg`);
  await renderStill({composition, serveUrl, output, frame, imageFormat: 'jpeg', jpegQuality: 88});
  files.push({label, frame, output});
  process.stdout.write(`  ${label} @${frame}\n`);
}
// 拼图交给 Python/PIL（Node 这边不依赖图像库）：写一份清单，由调用方拼
fs.writeFileSync(path.join(tmp, 'list.json'), JSON.stringify({cols, files}, null, 1));
console.log(`STILLS_DIR=${tmp}`);
console.log(`STILLS_OUT=${outPath}`);
