# 像素呼吸样片渲染（Remotion）

两种用法：

**A. B-roll 动画轨（现在的主流程）**：写实照片铺底 + 得意黑大字 + 代码图表，按讲稿卡的要点对时（录前按字数估，录后按要点起点表），只有音效。每期一份 `src/epN/photo.json`，由 `src/photo/engine.tsx` 渲染。完整流程见 `工具/video-broll-maker/SKILL.md`，字段说明见该 Skill 的 `references/photo-json.md`，样例 `src/ep6/photo.json`。

两个栏目：《100 个经济学原理》期号 `ep7`（角标显示期号、有栏目卡）；《AI经济学》期号 `ai01`（角标不显示期号、无栏目卡）。脚本按前缀自动分。

```bash
# 在本目录下跑；Windows 把 python3 换成 python。写完讲稿卡和发布清单，先在工作区根目录跑 ruby 工具/validate_package.rb "进行中/选题文件夹"
python3 scripts/new_episode.py epN                                                     # 建期、注册合成（AI经济学：ai01）
python3 scripts/scenes_from_checklist.py "<发布清单.md>" "<讲稿卡.md>" epN [--force]   # 校验起始要点 → scenemap / scene-names / photo.json 骨架，打印每个场景的要点范围
python3 scripts/import_photos.py <图片文件夹> epN --need <发布清单.md>                   # 图入库（裁 16:9、统一命名、报缺图）
python3 scripts/make_timeline.py "<讲稿卡.md>" epN [--cpm 200]                        # 录前：按要点字数估时（AI03 实录：卡上每分钟约 200 字）
python3 scripts/make_timeline.py "<讲稿卡.md>" epN --starts src/epN/starts.json --srt "<粗剪.srt>"   # 录后：按要点起点表
python3 scripts/aroll_face.py epN                                                      # 出镜层跟脸 → src/epN/aroll-face.json（渲出镜层合成时缺了会自动跑；要 pip install opencv-python-headless）
python3 scripts/aroll_cues.py epN                                                      # 出镜表，列名「要点」
python3 scripts/render.py epN sheet | check 40 | full | fullcheck                     # 拼图 / 40 秒小样 / 全片 / 全片带字幕
```

全片（`full` / `fullcheck`）走分段渲染 `scripts/render_seq.py`：并行出图片序列 → 查花屏兜底 → 编码 → 合音频，可断点续渲（改过代码加 `--fresh`）。浏览器用 Remotion 自带的 chrome-headless-shell，不要用本机 Chrome（会随机出花屏帧）。测试记录见 `docs/渲染方式测试-2026-10-28.md`；`python scripts/glitch_check.py <成片.mp4>` 可单独查花屏。

**B. 合成配音样片（旧流程，已停用）**：早期用系统合成配音（Tingting）+ 手写场景组件 `src/epN/scenes.tsx`。生成配音和时间轴的 `build_timeline.py` 已删，不再用这条流程做新期。老期要把字幕烧进画面，在 `src/Root.tsx` 给该期加 `subtitles: true`。

## 字体

五款字体打包在 `assets/fonts/`（woff2，已裁成常用字集，都是免费商用）：得意黑（标题、栏目名）、阿里妈妈数黑体（所有数字）、寒蝉锦书宋 Heavy（定义卡大词 `font: "song"`）、霞鹜文楷 Medium（对白 `quote: true`、角标）、思源黑体（小字、字幕）。`src/photo/kit.tsx` 的 `FONTS` / `useFonts` 统一加载。分工见 `工具/video-broll-maker/SKILL.md`。

## 画面区域

photo.json 里 `box` / `origin` / `spot.region` / `rings.region` 可以写区域名（`TL TC TR / ML MC MR / BL BC BR`，整行 `TW MW BW`），拼图上叠着同一套网格和 y=820 字幕禁区线。见 `references/photo-json.md`。

## 音效

- 音效原文件放在 `工具/音效库/`，文件名里包含类型词即可：whoosh、pop、impact、swipe、tick、ding、riser、flip、cash、error、typing、notify、boom、shutter、ambience。
- 新增或替换后运行 `python scripts/import_sfx.py`：自动裁掉首尾静音、按类型限制时长、统一响度，写入 `public/sfx/` 和 `src/sfx-manifest.json`。
- 场景里用 `<Sfx at={帧} name="pop" />`；同类多个版本会轮流使用。`dur` 截断连续音，`endAt` 让 riser 在揭晓点结束，`fade` 给环境声淡入淡出。
- 音效密度：新期 photo.json 的 `style.sfx = "sparse"`（骨架默认写上）——字和 photo 卡出现不再 pop，只有变化响；不写就是旧的每条字一声 pop（已发布各期不变）。规则见 `工具/video-broll-maker/references/photo-json.md` 的 style 表。

## 给剪辑用的分场景片段

渲染一个 `narration={false}` 的版本（只有音效），再切片：
`python scripts/split_scenes.py out/xxx.mp4 epN <输出文件夹> src/epN/scene-names.json`

## 时间轴（`make_timeline.py`）

- **录前**：`python3 scripts/make_timeline.py "<讲稿卡.md>" epN [--cpm 200]`，按要点字数估时，`source` 记 `estimate`；`subs` 是「要点 id + 要点开头」，只给拼图预览用。
- **录后**：对照粗剪 srt 手填要点起点表 `src/epN/starts.json`——`{"0.1": "00:00.0", "0.2": "00:07.4", …, "1.0": "01:00.2", …, "end": "08:19.5"}`。讲稿卡里每个 id 都要有（含 `N.0`），值是秒数或 `mm:ss.s`；`N.0` = 上一章最后一句说完；`end` = 最后一句说完（给了 `--srt` 可省）。然后 `python3 scripts/make_timeline.py "<讲稿卡.md>" epN --starts src/epN/starts.json --srt "<粗剪.srt>"`，`source` 记 `starts`，`subs` 取 srt 的字幕条。
- 时间以和 A-roll 同一条时间线的粗剪为准（`工具/aroll-prep` 出的粗剪 mp4 + srt）；分段录的先拼成一条再填。

渲染只带音效的版本，和 A-roll 从 0 秒对齐叠放；`check` / `fullcheck` 会额外烧录字幕，用来核对同步。
