// 让模版自己报出每一帧里几个点的位置，算每帧走了多远、速度变了多少、方向转了多少，看动作连不连续。
// 用法：node scripts/motion.mjs <编号> [示例名 | 参数json路径] [--表] [--每 N]
//   如 node scripts/motion.mjs 02                 默认内容，只打印各个点的汇总
//       node scripts/motion.mjs 02 竖屏 --表      逐帧列表
//       node scripts/motion.mjs 02 自己的参数.json --表 --每 4
// 只能查导出了 makeView 的模版（照 02-榜单排名攀升/Template.tsx 的写法）：它给一组参数，返回“某一刻 t 画面该是什么样”，
// 里面的 probes 是页面上几个点落在画面哪儿的位置。从成片画面反推会被遮挡和模糊干扰，量不准，所以从代码里取。
import {createRequire} from 'module';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import esbuild from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const showTable = argv.includes('--表');
const every = argv.includes('--每') ? Math.max(1, Number(argv[argv.indexOf('--每') + 1]) || 1) : 1;
const positional = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--每');

const folders = fs
  .readdirSync(path.join(ROOT, 'src/templates'))
  .filter((name) => fs.statSync(path.join(ROOT, 'src/templates', name)).isDirectory());
const hit = folders.filter((name) => name.split('-')[0] === positional[0]);
if (positional.length === 0 || hit.length !== 1) {
  console.log(`要给一个编号。现在有：${folders.map((name) => name.split('-')[0]).join('、')}`);
  process.exit(1);
}
const folder = path.join(ROOT, 'src/templates', hit[0]);
let extra = {};
if (positional[1]) {
  const file = positional[1].endsWith('.json')
    ? path.resolve(positional[1])
    : fs
        .readdirSync(folder)
        .map((name) => ({file: path.join(folder, name), key: name.startsWith('示例-') ? name.slice(3, -5) : ''}))
        .find(({key}) => key && key.includes(positional[1]))?.file;
  if (!file || !fs.existsSync(file)) {
    console.log(`找不到示例或参数文件「${positional[1]}」`);
    process.exit(1);
  }
  extra = JSON.parse(fs.readFileSync(file, 'utf8'));
}

// 字体和颗粒那几个模块一加载就要浏览器，在这里用不上，换成空壳
const cache = path.join(ROOT, 'node_modules/.cache');
fs.mkdirSync(cache, {recursive: true});
const stub = path.join(cache, 'pixel-motion-stub.js');
fs.writeFileSync(stub, "export const SANS = 'x', SERIF = 'x', SONG = 'x', HANS = 'x', MONO = 'x', DISPLAY_SERIF = 'x'; export const FONT_FAMILIES = []; export const Grain = () => null;");
const bundle = path.join(cache, `pixel-motion-${hit[0]}.cjs`);
try {
  await esbuild.build({
    stdin: {
      contents: `
        import {makeView} from ${JSON.stringify(path.join(folder, 'Template'))};
        import {defaultProps} from ${JSON.stringify(path.join(folder, 'schema'))};
        export const run = (props, frames) => {
          const view = makeView(props);
          const rows = [];
          for (let f = 0; f < frames; f++) rows.push(view(f).probes);
          return rows;
        };
        export {defaultProps};
      `,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: bundle, // 放进 node_modules 里，运行时才找得到 remotion、react
    external: ['remotion', 'react'],
    logLevel: 'silent',
    plugins: [{name: 'stub-fonts', setup(b) { b.onResolve({filter: /shared\/(fonts|Grain)/}, () => ({path: stub})); }}],
  });
} catch (err) {
  console.log(`打不起来这个模版。多半是它没有导出 makeView（照 02-榜单排名攀升/Template.tsx 的写法加一个），或者代码本身有错：\n${err.message}`);
  process.exit(1);
}

const {run, defaultProps} = createRequire(import.meta.url)(bundle);
const props = {...defaultProps, ...extra};
const rows = run(props, props.durationInFrames ?? 240);
const N = rows.length;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

console.log(`${hit[0]}${positional[1] ? `（${positional[1]}）` : ''}：${N} 帧，跟 ${rows[0].length} 个点`);
console.log('点   每帧最多走      在第几帧   速度一次最多变   在第几帧   方向一次最多转(走得动时)   在第几帧');
for (let i = 0; i < rows[0].length; i++) {
  const speed = [];
  for (let f = 1; f < N; f++) speed.push({f, v: dist(rows[f - 1][i], rows[f][i])});
  const acc = speed.slice(1).map((s, k) => ({f: s.f, v: s.v - speed[k].v}));
  const turn = speed.slice(1).flatMap((s, k) => {
    if (s.v < 3 || speed[k].v < 3) return []; // 几乎不动时方向没有意义
    const a = Math.atan2(rows[s.f][i][1] - rows[s.f - 1][i][1], rows[s.f][i][0] - rows[s.f - 1][i][0]);
    const b = Math.atan2(rows[s.f - 1][i][1] - rows[s.f - 2][i][1], rows[s.f - 1][i][0] - rows[s.f - 2][i][0]);
    const d = Math.abs(a - b) % (2 * Math.PI); // 转角按不超过 180° 算，别把从 +179° 到 -179° 当成转了 358°
    return [{f: s.f, v: (Math.min(d, 2 * Math.PI - d) * 180) / Math.PI}];
  });
  const top = (list) => (list.length ? list.reduce((m, x) => (Math.abs(x.v) > Math.abs(m.v) ? x : m)) : {f: '-', v: 0});
  const s1 = top(speed), a1 = top(acc), t1 = top(turn);
  console.log(`${i + 1}   ${s1.v.toFixed(1).padStart(8)} px   ${String(s1.f).padStart(6)}   ${a1.v >= 0 ? '+' : ''}${a1.v.toFixed(1).padStart(10)} px   ${String(a1.f).padStart(6)}   ${t1.v.toFixed(1).padStart(14)}°            ${String(t1.f).padStart(6)}`);
}
console.log('（第 1 个点是模版自己选的主角位置，其余是页面上固定的点，只跟着镜头动。速度一次变化很大的那几帧，就是看着会顿的地方）');
if (showTable) {
  console.log(`\n逐帧（每 ${every} 帧一行）：每帧走多少像素，括号里是比上一帧快或慢了多少`);
  console.log('帧   ' + rows[0].map((_, i) => `点${i + 1}`.padEnd(16)).join(''));
  for (let f = 1; f < N; f += every) {
    const cells = rows[0].map((_, i) => {
      const v = dist(rows[f - 1][i], rows[f][i]);
      const prev = f >= 2 ? dist(rows[f - 2][i], rows[f - 1][i]) : v;
      return `${v.toFixed(1)} (${v - prev >= 0 ? '+' : ''}${(v - prev).toFixed(1)})`.padEnd(16);
    });
    console.log(`${String(f).padStart(3)}   ${cells.join('')}`);
  }
}
