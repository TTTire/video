# 像素呼吸封面图片通用 Prompt

> **历史参考，不作为「100 个知识点」系列默认封面。** 该系列及后续新视频必须优先使用 `模板/像素呼吸-抽象主视觉封面Prompt模板.md`：3:4 竖版、中心白色主题大字＋英文副题、单一抽象主视觉、每期背景母题换新。以下“芒格高点击封面”仅在用户明确点名要求时使用。

## 芒格高点击封面反向拆解

- **版式**：high impact 4:3，左侧约 60% 放标题，右侧约 40% 放单一人物或巨大核心物件。
- **标题**：8—14 个字，拆成 3—4 行，每行 2—5 个字；只讲一个判断，不用解释句抢主标题。
- **颜色**：主标题按“白—黄—白—红”或“黄—白—红”分层，最关键的反转词固定用红色。
- **字体**：超粗中文标题，黑色超厚描边，重阴影，3D 斜切贴纸漫画感；手机缩略图里仍要一眼读清。
- **主体**：优先使用强识别人物；没有名人时，用一个情绪明确的人物或一个巨大核心物件替代。主体与证据道具合计不超过两个。
- **背景**：深棕黑或暗红黑的真实场景，暖金轮廓光，高饱和红黄点缀，带轻微旧纸、书页或桌面质感。
- **信息层级**：顶部一个黄色标签或红色警示条，左侧主标题，底部一个小解释横幅；金色圆章等装饰最多一个。
- **禁区**：不做双状态对撞，不堆多人物和多道具，不做普通写实电影海报，不用细字体、低对比和大面积留白。

## 芒格高点击封面模板

```text
A high impact 4:3 Chinese knowledge-channel short-video thumbnail using a bold editorial photomontage composition, left 60% dominated by the exact Chinese headline arranged in four stacked lines: "芒格说" in white, "普通人" in saturated yellow, "最大的" in white, and "错误" in vivid red, huge heavy Chinese characters with ultra-thick black outline, deep offset shadow and slightly slanted 3D sticker-comic typography, right 40% shows one highly recognizable warm-toned half-body portrait of Charlie Munger beside one upright copy of Poor Charlie's Almanack as the only evidence prop, dark brown-black vintage study desk and bookshelf background, warm golden rim light, subtle old-paper texture, one small yellow top label reading "穷查理宝典", one narrow red warning banner near the bottom reading "避免一生平庸的关键认知", at most one small gold circular seal, three clear information levels, strong red-yellow-white contrast, high saturation, readable in a small mobile grid, controlled dense layout, no split-screen before-and-after scene, no multiple people, no extra props, no ordinary realistic movie poster, no thin font, no small main title, no low contrast, no excessive empty space, no messy collage, no blurred or wrong Chinese characters, no logo, no watermark, Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution
```

## Image2 通用一段式模板

复制后只替换方括号内容；主 Prompt 与排除项必须保留在同一个段落中。

```text
A high impact 4:3 Chinese knowledge-channel short-video thumbnail about [主题], using a bold editorial photomontage composition, left 60% dominated by the exact Chinese headline arranged in [三或四] stacked lines: "[第一行]" in [white or yellow], "[第二行]" in [yellow or white], "[第三行]" in [white or red], [如有第四行则写 "[第四行]" in vivid red], huge heavy Chinese characters with ultra-thick black outline, deep offset shadow and slightly slanted 3D sticker-comic typography, the single most important reversal word in vivid red, right 40% shows [either one strong-recognition person with one evidence prop, or one oversized core object with no additional props], dark brown-black or dark red-black realistic [主题场景] background, warm golden rim light, subtle paper desk or book-page texture, one small yellow top label reading "[不超过六字的主题标签]", one narrow red warning banner near the bottom reading "[一句短解释]", at most one small gold circular seal, three clear information levels, strong red-yellow-white contrast, high saturation, readable in a small mobile grid, controlled dense layout, no split-screen before-and-after scene, no multiple people, no extra props, no ordinary realistic movie poster, no thin font, no small main title, no low contrast, no excessive empty space, no messy collage, no blurred or wrong Chinese characters, no logo, no watermark, Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution
```

## 非人物主题替换规则

- 有明确人物：右侧用人物半身像，再配一个能证明主题的实体道具。
- 没有明确人物：右侧用一个情绪明确的普通人，再配一个核心道具。
- 纯概念主题：右侧可以只放一个巨大物件，例如时钟、手机、账本或饭碗；不要为了填满画面继续加小元素。
- 标题负责给判断，人物负责给情绪，道具负责给证据；三者不要重复讲同一件事。

## 发布前自检

- [ ] 比例为 4:3，左 60% 标题、右 40% 主体
- [ ] 标题 8—14 字、3—4 行、只有一个核心判断
- [ ] 最关键的反转词为红色，其他行使用白黄分层
- [ ] 主体和证据道具合计不超过两个
- [ ] 顶部标签不超过 6 字，底部横幅不抢主标题
- [ ] 缩小到手机列表后，主标题仍然能一眼读清
- [ ] Image2 Prompt 为一个完整段落，负面约束没有单独拆出
- [ ] Prompt 末尾保留：Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution
