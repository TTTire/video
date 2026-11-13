# 改引擎 / 渲染脚本之前：画面基线对比

已发布的成片不在仓库里（`*.mp4` 不进 git），没法拿交付版对照。改了各期共用的代码以后，成片会不会变样，只能靠**改动前后在同一台机器上重渲、逐帧比**来证明。这份写的是具体怎么做。

## 什么时候要做

| 改了什么 | 要不要做 |
|---|---|
| `src/` 下各期共用的代码：`photo/*`（engine / kit / aroll / tactile / numfx / register / sheet / faces）、`Episode.tsx` `fx.tsx` `sfx.tsx` `ui.tsx` `Root.tsx` | 要 |
| 会写渲染输入的脚本：`make_timeline.py` `scenes_from_checklist.py` `card.py` `aroll_face.py` `import_photos.py` `import_cards.py` `import_sfx.py` | 要，再加最后一节「脚本输出」 |
| 升级 Remotion / 浏览器 / 依赖（`package.json`、`package-lock.json`、`remotion.config.ts`） | 要 |
| 只改某一期的 `photo.json` / `custom.tsx` | 不用，那一期照常走拼图检查单 |
| 只改文档 | 不用 |

## 原则：已发布的期，重渲必须和改前一样

修引擎 bug 时，如果修复会改变已发布期的画面，二选一：

- 先把那一期的数据改成和已发布画面一致（删掉从来没生效过的字段），再改引擎；
- 或者给新行为加 `style` 开关，只有新期打开（`badge` `scale` `sfx` `cardSkin` `textEnter` `faceTrack` 都是这么做的）。

动手前写好**预期差异清单**：哪一期、哪个场景、从哪一帧起、变成什么样。对比结果逐项核对，**清单外的差异一律算 bug**。

已知、已发布期还依赖现状的两处，修之前按上面的原则处理：

- `center: true` 时场景的 `box` 不生效（字固定从 y 110 起）。ep6（define、next）、ep7（law、realprice、bill、next）、ai01（oppcost、next）都写了 box；直接改成 box 生效，这 8 个场景的字会下移 60–190 px。2026-11-13 实测 ep7 law（需求定律定义卡）最后一行底边从 y 720 落到 850，压进字幕区。
- 栏目卡正好占 2 条要点时 tagline 不出（只有 ep7）。照「byTime 放宽到 ≤ 2」的改法，ep7 的期号会从场景第 82 帧提前到第 45 帧；只补 tagline 的话，它在第 127 帧出、第 151 帧场景就切走，只闪 0.8 秒。

## 基线覆盖哪几期

只用一期不够：AI05 没有用到栏目卡、center、分屏、扁平卡、v1 字号、飞入等 30 多项。下面 7 期合起来能覆盖引擎的全部分支：

| 期 | 主要覆盖 |
|---|---|
| ep6 | 时钟 / 聚光 / 响声圈、center + box、3 条要点的栏目卡 |
| ep7 | 2 条要点的栏目卡、center + box、分屏、扁平卡、v1 字号、飞入、panel |
| ep8 | 5 条要点的栏目卡、分屏、固定 face 的出镜层、reveal 字效 |
| ep9 | 1 条要点的栏目卡、跟脸的出镜层、里程表、砸入 |
| ai02 | center 母版、zoom 入场 |
| ai03 | right 母版、graph / stack / photocard / odometer / flap / slam、固定 face 的出镜层 |
| ai05 | topleft + 黑边、液面、跟脸的出镜层（定稿后加入，内容还在变的期不当基线） |

另外，每一期都渲一张拼图（`render.py <ep> sheet`，有出镜层的再渲一张 `arollsheet`），一张 10 秒。以后哪一期用了新元素或新开关，就补进上面这张表。

## 怎么渲

1. **素材要是真的**：照片从选题文件夹的 `图片素材/` 重新跑 `import_photos.py`（会覆盖占位图）。有出镜层的期，要有 `public/<ep>/aroll.mp4` 代理和脸轨。拼图里只要看到占位图（深色渐变 + 圆里一个大编号 + 左下「占位图 Sxx」），就先停下来。
2. **有出镜层的期渲 `<Comp>Full`**，不能只渲 `<Comp>Photo`：小圆、半屏卡、脸轨这些代码只在出镜层合成里跑。
3. **同一台机器、同一套环境**：改前改后用同一套 `node_modules` 和同一个浏览器。
4. **改后那次一律加 `--fresh`**：`render_seq.py` 只按帧号判断帧在不在。不加的话会直接复用改前渲好的帧，比出来永远是「零差异」。
5. **基线留成片 mp4**：用 `--out` 写到 `out/` 以外的目录（比如 `../_baseline/<ep>-<Comp>.mp4`）。图片序列一期 4–5 GB，不用留。

**自检**：改动前，用同一份代码连渲两次，两次的 mp4 md5 一样（或者逐帧都 ≥ 40 dB、音轨差值峰值是 -inf），才说明环境本身是稳的，后面出现的差异才能算到代码头上。参考 `工具/video-render/docs/渲染方式测试-2026-10-28.md`：同一份代码换不同跑法渲，逐帧最低也有 42 dB。

## 怎么比

```bash
# 1. md5 一样 = 画面和音轨都没变，到此为止
md5 -q base.mp4 new.mp4            # Windows：certutil -hashfile base.mp4 MD5

# 2. 画面：逐帧 PSNR，列出低于 40 dB 的帧（n 从 1 起，帧号 = n - 1）
ffmpeg -hide_banner -i base.mp4 -i new.mp4 -lavfi "[0:v][1:v]psnr=stats_file=psnr.log" -f null -
awk '{for(i=1;i<=NF;i++) if($i ~ /^psnr_avg:/) v=substr($i,10); if (v!="inf" && v+0<40) print $1, v}' psnr.log

# 3. 音轨：两条相减看峰值，-inf = 完全一样
ffmpeg -hide_banner -i base.mp4 -i new.mp4 -filter_complex "[1:a]volume=-1[i];[0:a][i]amix=inputs=2:normalize=0,astats=measure_overall=Peak_level:measure_perchannel=none" -f null - 2>&1 | grep "Peak level"
```

低于 40 dB 的帧，按 `timeline.json` 的场景 `from` / `dur` 归到场景，再逐个对预期差异清单。音轨峰值不是 -inf，说明有音效变了（时间、种类或音量），用 `fullcheck` 版对着听。

## 脚本输出

改了会写渲染输入的脚本，要用改前同样的参数重跑一遍，再用 `git diff -- src/` 看结果：

- `make_timeline.py`：拿有起点表的期（ai04、ai05、ep9）重跑，看 `timeline.json` 的 `scenes`、`points`、`total` 三项，这三项必须一样；`subs` 只给核对版预览用，`--srt` 换了文件它就会变，不算问题。
- `aroll_face.py <ep>`：`aroll-face.json`、`src/photo/faces.ts` 应该一样。
- `scenes_from_checklist.py`：会重写 photo.json 的 `style`。先 `git stash` 或在副本上跑，看 `scenemap.json`、`scene-names.json`、`style` 有没有变。

有差异的，要么逐条解释清楚，要么当 bug 处理。
