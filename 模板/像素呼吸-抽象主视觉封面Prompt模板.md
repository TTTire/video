# 像素呼吸｜抽象主视觉封面 Prompt 模板

> 用于「100 个知识点」系列及其后续新视频的默认封面：**版式与字体形成统一识别，背景主视觉每期完全换新**。旧版 `模板/封面图片通用Prompt.md` 的红黄漫画拼贴只作历史参考；除非用户明确点名，否则不得用于本系列。

## 一句话原则

每期只讲一个概念，主题大字永远在画面**几何中心**；英文副题紧贴在下；背景只承担情绪和隐喻，并且每期必须更换“视觉母题”。

## 固定识别规则

- **比例**：3:4 竖版。
- **主标题**：2—6 个中文，纯白、超粗、方正无衬线字，位于画面几何中心；标题块中心约在画面高度 50%—55%，不能放到底部。
- **英文副题**：全大写，小字号、字距拉开，紧贴主标题下方；只写概念英文，不写完整解释句。
- **背景**：深色、高质感、可被标题压住的单一抽象主视觉；不放平台爱心、播放量、时长、Logo 或水印。
- **信息密度**：标题 + 英文副题 + 一个背景隐喻。不要再加标签、横幅、人物、道具或多句解释。
- **文字保障**：若生成模型的中文不准，先生成无字背景，再在剪映中按本模板叠加文字；不要为了让模型写字而牺牲背景质量。

## 背景不重复规则

每一期都要同时改变下列至少三项，避免作品流看起来像同一张图换字：

1. **视觉母题**：粒子与压力 / 液态与矿物 / 显微生物纹理 / 地质地貌 / 天气与天体 / 建筑光影 / 森林荒原等。
2. **主色组合**：每张最多三种主色；相邻两期不能使用同一主色组合。
3. **构图动力**：向内挤压、向上生长、横向断裂、旋涡下沉、中心爆发、远景留白，六选一并轮换。
4. **材质**：颗粒、油墨、岩石、玻璃、纤维、云层、液态金属等；相邻两期不重复。

背景负责“让人停一下”，标题负责“让人看懂”。背景不能复用，但不必把概念画成直白的购物车、账单或 PPT 图标。

## 生成前填写卡

```text
主题中文：[2—6 个字]
英文副题：[一个简短概念英文]
核心判断：[本期只讲的一句反转]
视觉母题：[本期从未用过的抽象意象]
构图动力：[向内挤压 / 向上生长 / 横向断裂 / 旋涡下沉 / 中心爆发 / 远景留白]
主色组合：[不超过三种颜色]
排除项：[上一期的背景母题、颜色或材质]
```

## Image2 一段式模板

```text
A premium 3:4 vertical cover for a Chinese knowledge account about [核心判断], using one original abstract fine-art visual: [视觉母题]. The background uses [主色组合], with [构图动力] composition and [材质] texture; it should feel deep, refined, cinematic and visually distinct from a previous cover about [排除项]. Keep the background as one coherent visual world, with no literal infographic, no busy collage, no people, no product shot, no platform UI, no logo and no watermark. Place the exact Simplified Chinese title “[主题中文]” as massive pure-white extra-heavy square sans-serif typography at the geometric center of the image, the center of the title block at about 52% of image height; use clean edges, subtle soft dark shadow and high mobile-thumbnail readability. Directly beneath it, place the small, tracked, all-caps English subtitle “[英文副题]”. The typography is the stable account identity; the background is unique for this episode. Do not place the title at the bottom, do not use red-yellow comic sticker typography, do not use fake likes or duration, do not repeat [排除项], no gibberish text, 4K.
```

## 第 41 期示例｜稀缺性

```text
A premium 3:4 vertical cover for a Chinese knowledge account about scarcity: limited resources can never carry every desire that appears at once. Use one original abstract fine-art visual: four streams of fine luminous particles are slowly squeezed from the edges toward one extremely narrow central opening; only a small amount passes through while the rest dissolves into darkness. The background uses obsidian black, muted deep violet and restrained copper-gold, with an inward-pressure composition and mineral-dust, liquid-metal particle texture; it should feel deep, refined, cinematic and visually distinct from previous blue smoke, ocean marble, galaxy cloud or landscape covers. Keep the background as one coherent visual world, with no literal shopping cart, receipt, money, product shot, person, platform UI, logo or watermark. Place the exact Simplified Chinese title “稀缺性” as massive pure-white extra-heavy square sans-serif typography at the geometric center of the image, the center of the title block at about 52% of image height; use clean edges, subtle soft dark shadow and high mobile-thumbnail readability. Directly beneath it, place the small, tracked, all-caps English subtitle “SCARCITY”. The typography is the stable account identity; the background is unique for this episode. Do not place the title at the bottom, do not use red-yellow comic sticker typography, do not use fake likes or duration, no blue-white smoke cloud, no repeated ocean texture, no gibberish text, 4K.
```

## 发布前自检

- [ ] 主标题处于画面中心，而不是下三分之一。
- [ ] 英文副题紧贴在主标题下方，且没有抢标题。
- [ ] 背景只存在一个抽象主视觉，不存在多元素拼贴。
- [ ] 与上一期相比，至少换了三项：母题、颜色、构图动力、材质。
- [ ] 没有把小红书/抖音的爱心、播放量、时长误生成进封面。
- [ ] 缩小到作品流九宫格后，中文主题仍能直接读出。
