# 像素呼吸样片渲染（Remotion）

两种用法：

**A. B-roll 动画轨（现在的主流程）**：写实照片铺底 + 得意黑大字 + 代码图表，按真人口播的字幕对时，只有音效。每期一份 `src/epN/photo.json`，由 `src/photo/engine.tsx` 渲染。完整流程见 `工具/video-broll-maker/SKILL.md`，字段说明见该 Skill 的 `references/photo-json.md`，样例 `src/ep6/photo.json`。

```bash
python scripts/new_episode.py ep7                                      # 建期、注册合成
python scripts/scenes_from_checklist.py <发布清单.md> <口播稿.md> ep7      # 发布清单的分场景表 → scenemap / scene-names / photo.json 骨架
python scripts/import_photos.py <图片文件夹> ep7 --need <发布清单.md>      # 图入库（裁 16:9、统一命名、报缺图）
python scripts/timeline_from_srt.py <口播稿.md> <口播.srt> ep7 src/ep7/scenemap.json
python scripts/render.py ep7 sheet | check 40 | full | fullcheck        # 拼图 / 40 秒小样 / 全片 / 全片带字幕
```

**B. 合成配音样片（旧流程）**：系统合成配音（Tingting）+ 手写场景组件，步骤如下。

## 做一期

1. 查看句子序号：`python scripts/build_timeline.py <口播逐字稿.md> epN --list`
2. 写场景表 `src/epN/scenemap.json`（`{"句子序号": "场景名"}`），在 `src/epN/scenes.tsx` 实现这些场景
3. 生成配音和时间轴：`python scripts/build_timeline.py <口播逐字稿.md> epN src/epN/scenemap.json`
4. 在 `src/Root.tsx` 注册，预览：`npm run studio`
5. 渲染：`npx remotion render src/index.ts EpN out/epN.mp4 --codec=h264 --crf=20`

需要把字幕烧进画面时，在 `src/Root.tsx` 给该期加 `subtitles: true`。

## 音效

- 音效原文件放在 `工具/音效库/`，文件名里包含类型词即可：whoosh、pop、impact、swipe、tick、ding、riser、flip、cash、error、typing、notify、boom、shutter、ambience。
- 新增或替换后运行 `python scripts/import_sfx.py`：自动裁掉首尾静音、按类型限制时长、统一响度，写入 `public/sfx/` 和 `src/sfx-manifest.json`。
- 场景里用 `<Sfx at={帧} name="pop" />`；同类多个版本会轮流使用。`dur` 截断连续音，`endAt` 让 riser 在揭晓点结束，`fade` 给环境声淡入淡出。

## 给剪辑用的分场景片段

渲染一个 `narration={false}` 的版本（只有音效），再切片：
`python scripts/split_scenes.py out/xxx.mp4 epN <输出文件夹> src/epN/scene-names.json`

## 已经录好真人口播时（按口播对时间）

不用合成配音，直接用剪映导出的口播字幕（srt，和逐字稿逐句对应）生成时间轴：
`python scripts/timeline_from_srt.py <口播逐字稿.md> <口播.srt> epN src/epN/scenemap.json`

脚本会逐句核对字幕和逐字稿，对不上就报错。章节卡接在上一句结束后。渲染只带音效的版本（如 `Ep6FxSfx`），和 A-roll 从 0 秒对齐叠放；`Ep6FxCheck` 会额外烧录字幕，用来核对同步。
