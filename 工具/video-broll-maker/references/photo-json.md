# photo.json 字段说明

渲染引擎 `src/photo/engine.tsx`。一期一个 `src/epN/photo.json`。完整样例 `src/ep6/photo.json`。

## 顶层

```json
{
  "ep": "ep7", "badge": "07",      // AI经济学期：ep "ai01"，badge ""（角标不显示期号）
  "series": "100 个经济学原理",     // 左上角栏目名、栏目卡用；AI经济学期是 "AI经济学"
  "photos": "ep7/photos",          // public/ 下的照片目录
  "chapterPhoto": "S22",           // 章节卡的虚化底图
  "style": {                       // 本期视觉方案（由发布清单的 STYLE_DNA 注释生成，也可手改）
    "layout": "topleft",           //   文字母版：topleft | right | center | bottom（场景不写 box/grad 时按它）
    "scale": "v2",                 //   字号档位：v2 = h88 / t44 / big180（新期写上）；不写 = 旧档 h66/t38/big150
    "badge": false,                //   左上角标（像素呼吸 · 栏目名）关掉。2026-10 起新期默认 false；不写 = 显示（老期照旧）
    "titleFont": "smiley",         //   标题字体：固定得意黑（smiley），不要换；字体怎么分工见下面「字体」一节
    "theme": {"gold": "#D9C49C", "coral": "#C9545A", "teal": "#9DB9CF", "bg": "#070B14", "dim": "#B9C0CC"},
    "tint": "#1B2A44", "tintOpacity": 0.3,   // 所有照片统一罩色
    "letterbox": true, "grain": false,       // 2.35:1 黑边 / 胶片颗粒
    "enter": "cut"                 //   场景入场：blur | cut | slideL | zoom | slideUp
  },
  "scenes": [ ... ]
}
```

## 场景

```json
{
  "id": "shop",                    // = scenemap 里的场景 id
  "name": "奶茶店排队-再叫一个人",    // 中文名（拼图、剪辑说明用）
  "type": "photo",                 // photo（默认）| chapter（章节卡，不用写，缺省自动生成）| series（栏目卡）

  "photo": "S01",                  // 底图编号
  "move": "in",                    // 推拉：in 缓推（默认）| out 缓拉 | still 几乎不动；或者直接给 "zoom": [1.0, 1.12]
  "origin": "MR",                  // 推拉中心（照片里主体的位置）：区域名或百分比 "68% 62%"，默认居中
  "grad": "top",                   // 压暗哪一侧放字：left | right | top | bottom | all | none
  "dim": 0.3, "blur": 10,          // 整体压暗 0–1、虚化 px（做底纹时用）
  "pos": "left center",            // objectPosition，照片比例不对时决定保留哪边

  "swap": {"at": 2, "photo": "S02", "grad": "left", "move": "in", "delay": 0},   // 第 2 句时淡入切换到另一张图
  "split": {"at": [2, 3], "photos": ["S20A", "S20B"]},                            // 第 2 句左半推入 S20A，第 3 句右半推入 S20B；配合 box "L" / "R"

  "box": "TL",                     // 文字框：区域名（见下面「画面区域」）或像素框 {"x": 90, "y": 120, "w": 900}；不写走 style.layout 母版
  "boxes": {"right": "MR", "bottom": "BW"},  // 命名文字框，元素用 "box": "right" 指定；也可以写像素框
  "center": true,                  // 文字整体居中（定义卡、金句、结尾）；等价于 box 设全宽 + align center

  "ambience": "奶茶店",             // 铺环境声（按音效库的词；true = 随机一个）
  "enterSfx": null,                // 场景开头的音效，默认 pop；null 关掉；"tick" / "flip" 等
  "items": [ ... ]                 // 元素，按出现顺序写
}
```

栏目卡（`type: "series"`）：`"num": 7, "title": "需求定律", "tagline": "一句话"`，第 0 句出栏目名，第 1 句数字滚到本期并出标题，第 2 句出 tagline。

## style（每期视觉方案）

| 字段 | 值 | 说明 |
|---|---|---|
| `layout` | `topleft` / `right` / `center` / `bottom` | 文字母版，场景不写 box 时按它 |
| `scale` | `v2` / 不写 | 字号档位。`v2` = h88 / t44 / big180（2026-10 起新期默认写上）；不写 = 旧档 h66 / t38 / big150，已发布各期都走这个 |
| `enter` | `cut` / `blur` / `slideL` / `zoom` / `slideUp` / `flip` | 场景入场 |
| `letterbox` `grain` | true / false | 2.35:1 黑边 / 胶片颗粒 |
| `cardSkin` | `tactile` / 不写 | 卡片质感。`tactile` = 实物感：厚底边、细金边、四角角花、±6px 漂动、从侧面飞入带轻回弹（**2026-10-29 起新期默认**）；不写 = 旧的扁平半透明，已发布各期不变 |
| `cards` | 路径 | 卡内小图目录（`public/` 下），`photocard` / `photorow` / `graph` 的 `img` 从这里取；默认 `<ep>/cards` |
| `tint` `tintOpacity` | `#hex` / 0–1 | 统一罩色 |
| `theme` | `{gold, coral, teal, bg, white, dim}` | 本期配色 |

## 元素公共字段

| 字段 | 含义 |
|---|---|
| `at` | 场景内第几句开始时出现（0 起，默认 0） |
| `delay` | 再延后几帧（30 帧 = 1 秒） |
| `until` | 到第几句时消失（做"前半段 / 后半段"换内容） |
| `dir` | 飞入方向 left / right / up / down，默认按文字框位置自动 |
| `box` | 放进哪个命名文字框，默认 main |
| `card` | 卡片：`solid` 结论 / `paper` 原文 / `notch` 前提定义 / `tab` 一条数据。写在 `box` 上（`{"card": "tab", "label": "数据"}`）或场景顶上（`"card": "solid"`） |
| `label` `tabColor` | 卡片上的分类签文字 / 签底色（不写走 dim；只允许 `dim` `gold`，teal/coral 留给正负对比） |
| `font` | 单个元素换字体：`song` 锦书宋（定义卡大词）/ `kai` 文楷 / `num` 数黑体 / `sans` 思源黑 / `title` 得意黑 |
| `quote` | `true` = 对白：文楷 + 金色引号（h / t / tag 都支持；原文自带的引号会自动去掉） |
| `sfx` | 出现时的音效名；`null` 不响；默认按类型（h/t/tag→pop，stamp→stamp/impact，big/count→ding，panel→page/flip，compare→swipe，nums→drop/impact，clock→click/tick） |
| `vol` | 音量 0–1 |

## 元素类型

| type | 字段 | 用途 |
|---|---|---|
| `h` | `text` `size`(88 v2 / 66 v1) `color`(white) `strikeAt` `stagger` `textfx` `em` | 得意黑标题。`strikeAt: n` 第 n 句被划掉；`stagger: 3` 逐字入场；`textfx: outline / gradient / reveal`；`em: [起, 止]` 给逐字的某几个字上强调色 |
| `t` | `text` `size`(44 v2 / 38 v1) `color`(dim) | 小字说明、英文副题 |
| `tag` | `text` `size`(42) `color`(gold) `dark` | 标签块：金底黑字；`dark: true` 黑底白字 |
| `stamp` | `text` `size`(60) `color`(coral) `rotate`(-5) | 从天上砸下来的印章 |
| `big` | `text` `size`(180 v2 / 150 v1) `color`(gold) | 大数字 / 大词 |
| `count` | `to` `from` `prefix` `suffix` `before` `label` `dur` `size` | 数字滚动。`before: "85"` 显示 85 → 滚动值；`label` 前面的小字 |
| `nums` | `items: [{label, value, color}]` `arrow`(→) `size` | 一排依次落下的数字（30 → 30 → 20 → 5） |
| `panel` | `lines: [..]` `label` `size`(50) | 黑色毛玻璃面板，第一行白、其余 dim；`label` 面板顶部小标题。**旧件，新期用 notch 卡** |
| `stack` | `items: [{big, small, color}]` `w`(820) | 叠卡因果链：依次推入，最后一张金底高亮。副标题超宽走省略号 |
| `compare` | `left` `right` `mid`(vs) `size`(72) | 左右对比两组文字 |
| `clock` | `h` `m` `to` `dur` | 时钟牌 19:00，`to` 分钟数滚到 |
| `spot` | `region` 或 `x` `y`，`r`(260) `strength`(0.72) | 聚光：以外压暗，指向照片里的某处。`"region": "MR"` 指向区域中心 |
| `rings` | `region` 或 `x` `y`，`n`(3) `max`(360) `color` | 响声圈，从某处一圈圈扩散 |
| `sfx` | `name` `variant` `dur` `endAt` `fade` | 任意音效。`riser` 用 `endAt` 对齐揭晓点 |
| `custom` | `name` | 调 `src/epN/custom.tsx` 里注册的组件，全屏覆盖 |
| **`photocard`** | `img`(C01) `title` `sub` `w`(420) `imgH` | **一个实体一张**：上半小图、下半中文大词 + 英文小字。公司 / 国家 / 人 / 商品 |
| **`photorow`** | `cards: [{img, title, sub, at?}]` `w`(380) `gap`(28) | 2–4 张 photo 卡并排；每张可以自己写 `at`（相对本元素 at 的句数偏移），不写则同句依次 6 帧错开 |
| **`odometer`** | `from` `to`（字符串）`size` `color` `dur`(28) `label` | 里程表：每位数字独立上/下滚，右位先动左位晚 3 帧。`"¥16" → "¥23"`、`"2011" → "2024"`、`"$2.15" → "$0.11"`。非数字字符原位不动 |
| **`flap`** | `from` `to` `size`(88) `color` `toColor` `label` | 机场翻牌：牌从中线分两半，旧值翻下去新值翻上来。**一个判断被另一个替换**（"涨得离谱" → "只涨了 6%"），和 `strikeAt` 同语义、另一种长相 |
| **`slam`** | `text` `size`(big) `color` `label` | 大数从 2.8× 砸到 1×，到位震 6 帧 + impact。**本期核心数字，一期 1–2 次** |
| **`rank`** | `rows: [{id, label, value, color}]` `orders: [[id…], …]` `orderAt: [句…]` `hi` `w` `rowH`(92) | 排名：rows 固定，到 `orderAt[i]` 那句换成 `orders[i]` 的顺序，行平滑换位（往下的右移、往上的左移，中途不叠）。`hi` 高亮某行 |
| **`units`** | `n` `unit`(`person` / `bill` / 任意字符) `cols`(10) `size`(48) `max`(50) `label` `color` | 实物堆叠：n 个一个一个落下（整堆约 40 帧落完），从下往上填。超过 `max` 的写 `+N` |
| **`fill`** | `pct` `w`(160) `h`(320) `color` `label` `horizontal` | 容器液面升到 pct%，数字跟着滚，液面有轻微波动 |
| **`graph`** | `nodes: [{id, x, y, w, at, img?, title?, sub?, text?}]` `edges: [{from, to, at?, label?, color?}]` `w` `h` | 关系图：节点是 photo 卡（有 `img`）或字卡（`text`），坐标相对 box 左上角；边在两端都出现后从 from 向 to 生长、带光晕；`label` 写在线中间 |

新元素都自带音效（odometer tick、flap flip、slam impact、units drop、fill riser），不用再写 `sfx`。

颜色：`white` `dim` `gold`(陶土橙) `teal`(正常/增长) `coral`(问题/瓶颈) 或 `#hex`。

## 画面区域（锚点）

画面分 3 列 × 3 行，底部 y > 820 是字幕区不放字。`box` / `boxes` / `origin` / `spot.region` / `rings.region` 都可以直接写区域名，不用算像素；拼图（sheet）上叠着这套网格和字幕禁区线，审查时按区域名提意见（"场景 07 的标题从 TL 挪到 TR"）。

```
TL  TC  TR     TW（整行宽、居中）
ML  MC  MR     MW
BL  BC  BR     BW
```

- 列：L 左 x=90 / C 中 / R 右（右对齐）/ W 整行 1740 宽居中；行：T 顶 y=120 / M 中 y=400 / B 底（距字幕区上方）。
- 出图清单的「文字放哪侧」直接写区域名，`scenes_from_checklist.py` 会按每张图的区域自动填场景的 `box` 和 `grad`；只有照片主体和它冲突时再手改。
- 像素框仍然可用（`{"x":…,"y":…,"w":…}`），但新写的优先用区域名，换母版才生效。

## 字体

五款字体各管一个岗位，一期之内不要再加（都打包在 `assets/fonts/`，免费商用）：

| 岗位 | 字体 | 怎么用 |
|---|---|---|
| 场景标题 `h`、章节卡、栏目名 | 得意黑 | 默认，不随期换 |
| 所有数字：`big`（纯数字）/ `count` / `nums`、角标期号 | 阿里妈妈数黑体 | 自动 |
| 定义卡大词 | 寒蝉锦书宋 Heavy | `big` 或 `h` 加 `"font": "song"`，一期只出现一两次 |
| 对白、人说的话、角标「像素呼吸」 | 霞鹜文楷 Medium | `"quote": true` |
| 小字 `t` / `tag` / `panel` / 字幕 | 思源黑体 | 自动 |

## 文本标记

在 `text` / `lines` / `left` / `right` / `tagline` 里：

| 写法 | 效果 |
|---|---|
| `**十几个人**` | 金色强调 |
| `[[值 30 杯]]` | 青色（好的那边） |
| `((只值 5 杯))` | 红色（坏的那边） |
| `~~还差几个人？~~` | 红色划掉 |
| `\n` | 换行 |

## 出镜层 `aroll`（2026-10-29 起）

用户的 A-roll（出镜视频）叠在 B-roll 上，**独立一层、独立时间轴，不碰场景排版**。写在 photo.json 顶层：

```json
"aroll": {
  "src": "ai03/aroll.mp4",          // public/ 下。必须是和 srt 同一条时间线的粗剪成片，从 0 秒对齐，30fps；放进来的是 ffmpeg 转好的 1080p 静音代理（用户原片可以是 4K，见 SKILL.md 3b）。一律静音（人声用户在剪映放原音轨）
  "idle": "bubble",                 // cue 之外的状态：bubble 小圆 | hide 不出现
  "face": [0.5, 0.42],              // 脸在 A-roll 画面里的位置（比例）。bubble / half 态以它为中心裁
  "bubbleView": 0.62,               // 小圆直径装下 A-roll 画面高度的多少：0.62 ≈ 头到胸口的半身（默认）；0.31 = 只有一张脸（10-29 旧版）。头顶离画面上沿 ≤ 20% 的实拍（ep8）用 0.72，不然头发被圆切掉
  "bubbleFaceAt": 0.32,             // 脸放在圆里从上往下的位置（默认 0.32，留出下面的肩膀和身子）；bubbleView 调大时同步到 0.34 左右
  "halfView": 0.8,                  // 半屏卡只显示 A-roll 画面上面这一截（默认 1）。A-roll 底部烧了字幕时设 0.8 裁掉
  "cues": [                         // at 是口播稿行号 [起, 止)，和场景表同口径
    {"at": [0, 7],     "mode": "full"},
    {"at": [47, 49],   "mode": "half"},
    {"at": [241, 257], "mode": "full"}
  ]
}
```

| mode | 长相 | 用在 |
|---|---|---|
| `full` | 全屏 | 开场第一句（观众先见人）、第一人称判断（"我猜"、"我自己的感受"）、结尾 |
| `half` | 左侧 640×720 圆角卡（x 60–700、y 90–810），不碰右侧字列和字幕区 | 讲自己经历、带情绪的段落，又不想丢掉 B-roll 的字 |
| `bubble` | 直径 260 小圆（左下圆心 220,650 / 右下 1700,650），带金边，默认取半身（`bubbleView`） | 数据、历史、图表段——B-roll 是主角，你在角落 |
| `hide` | 不出现 | 章节卡、栏目卡（`hideOn` 默认就是这两个场景，不用写行号） |

- **小圆放哪边自动躲字**：`style.layout=right`（字在右）→ 小圆左下；否则右下。某个场景字在另一边，场景里写 `"arollSide": "right"` 单独指定；左右两边都有字时写 `"arollPos": [x, y]` 直接给圆心（例：ep8 define 放 `[1720, 800]`，字列下方）。两个场景小圆换位置时平滑滑过去，不响。**每个场景都要单独看**：拼图每场只抽 4 帧，后出现的字容易漏，交付前把成片按 2 秒一帧抽一遍
- **切换动效**（24 帧，慢进慢出，每次 whoosh）：bubble ⇄ full 是圆形 iris——圆从小圆位置长大到盖满屏 / 缩回，边缘一圈金光跟着扩；→ half 是卡从左 wipe 开、前沿一道亮线，小圆缩进卡里脸的位置；half → full 是圆从卡里的脸长出来
- 节奏经验：每段 bubble 别超过 40–60 秒，中间切回 full 露 6–10 秒，不然像配音 PPT
- 查表：`python3 scripts/aroll_cues.py <epN>` 打印每段的模式 / 行号 / 时间 / 第一句，粘进剪辑说明
- 合成：有 `aroll` 时多出 `EpNFull`（交付）/ `EpNFullCheck`（带字幕）/ `EpNFullSheet`（拼图）；`render.py <epN> aroll | arollcheck | arollsheet | arollclip <起> <止>`
- 性能：叠 A-roll 比纯 B-roll 慢约 18%（@remotion/media 的 `<Video>`）

## 卡内小图（C 编号）

`photocard` / `photorow` / `graph` 用的小图和场景底图分开：
- 编号 `C01`、`C02`…，写在出图清单最后一段「卡内小图」里；**方形**（或 4:3），主体居中，纯色或虚化背景，不要文字
- 用户出好后 `python3 scripts/import_cards.py <文件夹> <epN> --need <发布清单.md>` → `public/<epN>/cards/C01.jpg`（1:1 中心裁切、长边 900）
- 国旗、品牌 logo 不用真图（版权），用文字卡（`graph` 节点不写 `img`）

## 套路

- **开场**：时钟 + 一句大字 + 第 2 句 tag（对白）+ 第 3 句 dim 的疑问。`ambience` 铺环境声，`enterSfx: null`。
- **否定旧判断**：第 0 句 `h`(dim) 写旧判断并 `strikeAt: 1`；第 1 句 `spot` 指向照片里的真凶 + `h` 大字揭晓，`sfx: "impact"`。
- **数字一路变化**：`custom` 柱状图；或 `nums` 一排。
- **定义卡**：`blur: 10, dim: 0.55, center: true`，`t` 英文 + `h` 150 大词 + 等号句。
- **前提 / 边界**：`notch` 卡带 `label: "前提"`、`sub: "PREMISE"`（实物皮肤下标签旁出英文小字）。
- **一个实体登场**（公司 / 国家 / 商品）：`photocard`；两三个并列比较：`photorow`。
- **价格 / 年份变了**：`odometer`；**旧判断被新判断替掉**：`flap`；**本期那一个数**：`slam`。
- **几个群体谁先走 / 谁更敏感**：`rank`，`hi` 指向本期主角那行。
- **人数 / 钱数**：`units`（`person` / `bill`），一个单位 = 多少写在 `label` 里。
- **占比**：`fill`。
- **三件事 / 因果 / 关系**：`graph`，中心一张字卡，周围 photo 卡，边上写一句关系。
- **分屏对比**：`split` + `box: "L"` / `box: "R"` 各放 tag + 两句；收尾 `panel` 放 `bottom` 框。
- **结果揭晓**：`count` 带 `before`（85 → 120+），`sfx` 用 `riser` 的 `endAt` 卡在数字出现。
- **金句**：`center` 或左侧 1100 宽，第 0 句 `t` + `h`(dim, 划掉旧问题)，第 1 句 `h` 96 大字，`rings` 指向照片里的"机器"。
- **下期预告**：开场图 `blur: 6, dim: 0.5, center`，`tag` 下期 + 两句 + 价格对比。

## 时间轴（timeline.json，脚本生成，不手改）

每个场景 `{scene, from, dur, steps:[...]}`，`steps[i]` 是场景内第 i 句开始的帧（相对场景起点）。元素的 `at` 就是对这个数组的下标；`custom` 组件里用 `at(p, i)` 取帧、`p.step` 取当前到第几句。
