# photo.json 字段说明

渲染引擎 `src/photo/engine.tsx`。一期一个 `src/epN/photo.json`。完整样例 `src/ep6/photo.json`。

## 顶层

```json
{
  "ep": "ep7", "badge": "07",
  "series": "100 个经济学原理",     // 左上角栏目名、栏目卡用
  "photos": "ep7/photos",          // public/ 下的照片目录
  "chapterPhoto": "S22",           // 章节卡的虚化底图
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
  "origin": "68% 62%",             // 推拉中心（照片里主体的位置），默认居中
  "grad": "top",                   // 压暗哪一侧放字：left | right | top | bottom | all | none
  "dim": 0.3, "blur": 10,          // 整体压暗 0–1、虚化 px（做底纹时用）
  "pos": "left center",            // objectPosition，照片比例不对时决定保留哪边

  "swap": {"at": 2, "photo": "S02", "grad": "left", "move": "in", "delay": 0},   // 第 2 句时淡入切换到另一张图
  "split": {"at": [2, 3], "photos": ["S20A", "S20B"]},                            // 第 2 句左半推入 S20A，第 3 句右半推入 S20B；配合 box "L" / "R"

  "box": {"x": 90, "y": 120, "w": 900},   // 默认文字框（默认左上）
  "boxes": {"right": {"x": 1080, "y": 300}, "bottom": {"x": 0, "w": 1920, "bottom": 200, "align": "center"}},  // 命名文字框，元素用 "box": "right" 指定
  "center": true,                  // 文字整体居中（定义卡、金句、结尾）；等价于 box 设全宽 + align center

  "ambience": "奶茶店",             // 铺环境声（按音效库的词；true = 随机一个）
  "enterSfx": null,                // 场景开头的音效，默认 pop；null 关掉；"tick" / "flip" 等
  "items": [ ... ]                 // 元素，按出现顺序写
}
```

栏目卡（`type: "series"`）：`"num": 7, "title": "需求定律", "tagline": "一句话"`，第 0 句出栏目名，第 1 句数字滚到本期并出标题，第 2 句出 tagline。

## 元素公共字段

| 字段 | 含义 |
|---|---|
| `at` | 场景内第几句开始时出现（0 起，默认 0） |
| `delay` | 再延后几帧（30 帧 = 1 秒） |
| `until` | 到第几句时消失（做"前半段 / 后半段"换内容） |
| `dir` | 飞入方向 left / right / up / down，默认按文字框位置自动 |
| `box` | 放进哪个命名文字框，默认 main |
| `sfx` | 出现时的音效名；`null` 不响；默认按类型（h/t/tag→pop，stamp→stamp/impact，big/count→ding，panel→page/flip，compare→swipe，nums→drop/impact，clock→click/tick） |
| `vol` | 音量 0–1 |

## 元素类型

| type | 字段 | 用途 |
|---|---|---|
| `h` | `text` `size`(66) `color`(white) `strikeAt` | 得意黑标题。`strikeAt: n` 第 n 句被划掉 |
| `t` | `text` `size`(38) `color`(dim) | 小字说明、英文副题 |
| `tag` | `text` `size`(42) `color`(gold) `dark` | 标签块：金底黑字；`dark: true` 黑底白字 |
| `stamp` | `text` `size`(60) `color`(coral) `rotate`(-5) | 从天上砸下来的印章 |
| `big` | `text` `size`(150) `color`(gold) | 大数字 / 大词 |
| `count` | `to` `from` `prefix` `suffix` `before` `label` `dur` `size` | 数字滚动。`before: "85"` 显示 85 → 滚动值；`label` 前面的小字 |
| `nums` | `items: [{label, value, color}]` `arrow`(→) `size` | 一排依次落下的数字（30 → 30 → 20 → 5） |
| `panel` | `lines: [..]` `label` `size`(50) | 黑色毛玻璃面板，第一行白、其余 dim；`label` 面板顶部小标题 |
| `compare` | `left` `right` `mid`(vs) `size`(72) | 左右对比两组文字 |
| `clock` | `h` `m` `to` `dur` | 时钟牌 19:00，`to` 分钟数滚到 |
| `spot` | `x` `y` `r`(260) `strength`(0.72) | 聚光：以外压暗，指向照片里的某处 |
| `rings` | `x` `y` `n`(3) `max`(360) `color` | 响声圈，从某处一圈圈扩散 |
| `sfx` | `name` `variant` `dur` `endAt` `fade` | 任意音效。`riser` 用 `endAt` 对齐揭晓点 |
| `custom` | `name` | 调 `src/epN/custom.tsx` 里注册的组件，全屏覆盖 |

颜色：`white` `dim` `gold`(陶土橙) `teal`(正常/增长) `coral`(问题/瓶颈) 或 `#hex`。

## 文本标记

在 `text` / `lines` / `left` / `right` / `tagline` 里：

| 写法 | 效果 |
|---|---|
| `**十几个人**` | 金色强调 |
| `[[值 30 杯]]` | 青色（好的那边） |
| `((只值 5 杯))` | 红色（坏的那边） |
| `~~还差几个人？~~` | 红色划掉 |
| `\n` | 换行 |

## 套路

- **开场**：时钟 + 一句大字 + 第 2 句 tag（对白）+ 第 3 句 dim 的疑问。`ambience` 铺环境声，`enterSfx: null`。
- **否定旧判断**：第 0 句 `h`(dim) 写旧判断并 `strikeAt: 1`；第 1 句 `spot` 指向照片里的真凶 + `h` 大字揭晓，`sfx: "impact"`。
- **数字一路变化**：`custom` 柱状图；或 `nums` 一排。
- **定义卡**：`blur: 10, dim: 0.55, center: true`，`t` 英文 + `h` 150 大词 + 等号句。
- **前提 / 边界**：`panel` 带 `label: "前提"`。
- **分屏对比**：`split` + `box: "L"` / `box: "R"` 各放 tag + 两句；收尾 `panel` 放 `bottom` 框。
- **结果揭晓**：`count` 带 `before`（85 → 120+），`sfx` 用 `riser` 的 `endAt` 卡在数字出现。
- **金句**：`center` 或左侧 1100 宽，第 0 句 `t` + `h`(dim, 划掉旧问题)，第 1 句 `h` 96 大字，`rings` 指向照片里的"机器"。
- **下期预告**：开场图 `blur: 6, dim: 0.5, center`，`tag` 下期 + 两句 + 价格对比。

## 时间轴（timeline.json，脚本生成，不手改）

每个场景 `{scene, from, dur, steps:[...]}`，`steps[i]` 是场景内第 i 句开始的帧（相对场景起点）。元素的 `at` 就是对这个数组的下标；`custom` 组件里用 `at(p, i)` 取帧、`p.step` 取当前到第几句。
