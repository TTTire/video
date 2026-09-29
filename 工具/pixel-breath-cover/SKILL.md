---
name: pixel-breath-cover
description: 为像素呼吸生成视频封面，包括发布清单的封面板块、Image2 / Image2.5 一段式 Prompt，或反向拆解参考封面。默认使用用户上传的本人照片生成 3:4 竖版人物封面。
---

# 像素呼吸人物封面

## 固定视觉语法

观众的视线顺序固定为：**顶部标题 → 本人面孔 → 一个主视觉锚点**，三者互不遮挡。

- **画幅**：3:4 竖版。
- **标题**：放在顶部约 20%—28% 的区域，最多两行；中文可见正文不超过 13 个汉字，越短越好。字体用超粗紧缩无衬线，纯白加亮黄，超粗黑描边、明显偏移投影、轻微立体。黄色最多只强调一个语义完整的片段，不随机逐字换色。
- **人物**：只出现同一个本人，胸像或半身，位于中下部，约占画面高度的 40%—55%；面部光线干净，五官清楚。
- **表情和动作**：用一个能在单帧定格的“正要做决定”的瞬间，比如停、推、递、指、比较；表情强度约 4—7/10，不画尖叫或惊恐。
- **主视觉锚点**：只选一个。可以是一件主题物件（object），也可以是一个正在发生的场景冲突（scene_conflict），不再加第二个同等醒目的道具。
- **场景**：优先用稿件开头那个真实可拍的场景。科技感来自字效和灯光，不擅自改成宇宙、芯片或数据空间。
- **文字**：只写封面标题；必要时加一行最短、准确的英文概念副题。真实品牌不出现 Logo。

## 工作流

1. 读取本期口播稿，抓住核心反转和开头现场。
2. 读取上一期发布清单里的 `COVER_DNA`。和上一期相比，场景原型、机位、主色这三项至少换掉两项。读不到时写 `unknown`。
3. 先想清楚 6 件事：封面标题及换行、表情和冻结动作、唯一锚点、不用文字也能看懂的冲突、最容易被误读成什么、本期要避开的错误隐喻。
4. 按下面的输出格式交付。用户只要 Prompt 时，只给那一段完整 Prompt。

**关于因果准确**：锚点要表现稿件真正的因果，不只是主题。如果变化发生在人身上，物件本身就不要画成变质；时间变化要压缩成“决定前一秒”，不用分屏、箭头或多个同类物件来解释过程。

**参考图分工**：本人照只负责身份和面部细节，不继承照片里的服装、姿势、背景和光线。如果还有风格参考图，它只负责画幅、信息层级、标题样式和灯光，不迁移其中人物的脸和身份，也不复制文案和品牌。

**例外**：用户明确要求抽象或无人物时，改用 `模板/像素呼吸-抽象主视觉封面Prompt模板.md`。

## 输出格式（写进发布清单）

````markdown
### 封面图片 Prompt

> 使用方法：在 Image2 或 Image2.5 中同时上传一张清晰本人照片，并完整粘贴下方 Prompt。本人照片只用于人物身份和面部细节参考。

封面标题：
`[默认标题]`

备选标题：
- [备选一]
- [备选二]

一句视觉方案：
[人物冻结动作 + 唯一锚点 + 场景冲突 + 主色]

Image2 / Image2.5 一段式 Prompt：
```text
[完整单段 Prompt]
```

<!-- COVER_DNA v2 | archetype=[构图原型] | shot=[景别机位] | position=[人物位置] | expression=[表情与强度] | anchor_type=[object或scene_conflict] | anchor=[锚点] | interaction=[人物与锚点的动作] | scene=[场景] | outfit=[服装] | palette=[主辅色] | light=[光线] -->
````

构图原型可在这些里轮换：广角递物、人与巨物并置、沉浸场景、桌面实测、俯拍动作、斜向运动。

## Prompt 模板

替换方括号里的内容，输出为一整段，引号内不要插入真实换行。标题单行时写 `on one line “[标题]”`；两行时写 `arranged in exactly two lines: top line “[上行]”, bottom line “[下行]”`。

```text
Use the uploaded portrait as the sole identity reference for the same adult host. Preserve the host's recognizable facial geometry, face shape, eye spacing, eyes, nose and mouth, natural skin tone, visible age range and realistic facial texture; retain recognizable hairstyle and eyewear. Do not copy the portrait's clothing, pose, background, composition or lighting. Create a high-impact 3:4 vertical Chinese knowledge-video thumbnail about “[核心反转]”; make clear that it is not about “[最容易被误读的意思]”. Show the host in a [景别与机位] at [人物位置], with a natural [表情和强度], [冻结动作], visibly interacting with one dominant visual anchor: [锚点]. Use [构图原型] so the conflict “[不用文字也能看懂的冲突]” is clear at a glance, inside a coherent [真实场景] with only [低对比环境线索]. Establish three non-overlapping focal levels: headline first, recognizable face second, visual anchor third. Reserve the upper 20–28 percent for the exact Simplified Chinese headline [单行或两行写法], in extra-bold condensed sans-serif typography; [黄色强调片段] in bright yellow and the rest in pure white, with an ultra-thick black outline, strong offset shadow and subtle 3D extrusion, readable at small mobile-thumbnail size. [英文副题，或 No English subtitle.] Keep the face, eyes, headline, hands and anchor unobstructed. Use [主色组合], crisp cinematic commercial lighting, clean facial key light, coherent colored rim light, strong depth, saturated but controlled color, sharp subject separation and premium photo-realistic compositing. Show only one host, one dominant anchor and one coherent scene. Explicitly exclude [本期错误隐喻]. No real brand logos, watermark, social-media interface, QR code, sticker, banner strip, extra text, gibberish Chinese, split screen, duplicated person, duplicated object, face distortion, plastic skin, malformed hands, extra fingers or clutter. Cinematic lighting, hyper-realistic, 8k resolution.
```

## 出图后常见问题

| 问题 | 修正 |
|---|---|
| 人脸不像 | 换一张清晰的正面单人照；简化表情和角度；身份句保持在 Prompt 开头 |
| 出现多个物件或分屏 | 改成一个“决定前一秒”的冻结动作，删掉并列的名词 |
| 表情过猛 | 降到 4—5/10，改用停顿、犹豫或轻微恍然 |
| 中文写错 | 保持构图，让顶部留出无字区域，到剪映里再叠字 |
| 手部畸形 | 只露一只手，配一个明确的动作 |

没有看到实际成图之前，只能说“Prompt 已完成”，不能说封面已经完成。
