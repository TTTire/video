---
name: pixel-breath-cover
description: Use when creating, updating, or reverse-engineering a Pixel Breath video cover, thumbnail, Image2 or Image2.5 prompt, or the cover section of a 发布清单, especially when a portrait or style reference is supplied.
---

# 像素呼吸人物封面

## 核心不变量

默认生成 3:4 竖版人物封面，让观众按顺序看清：**顶部标题 → 本人面孔 → 一个主视觉锚点**。

“同风格”只继承这套品牌语法：顶部黄白超粗字、本人身份、明确动作、单一视觉冲突、清晰主体分离。不得因为风格图而复制参考账号的人脸、发型、服装、文案、品牌资产、具体道具或精确构图；如果本期稿件本身需要同类通用物件，可以重新设计其动作、机位和场景。

用户明确要求抽象或无人物时，以当次要求为准，改用 `模板/像素呼吸-抽象主视觉封面Prompt模板.md`；其他指定方向也以当次要求为准。未看到实际成图时，只能称为“Prompt 已完成”，不能声称封面已经完成或验收。

## 工作流

1. 先判断任务类型。纯反向分析且没有本期选题时，只输出参考图视觉语法或通用反向 Prompt，跳过稿件、标题和跨期 DNA；需要落到具体选题时再执行后续步骤。
2. 读取本期口播逐字稿、核心反转和开头动作；拟标题前读取 `模板/三重张力五杠杆写稿流程.md`，只检查处境、代价和判断变化。
3. 确定前三期比较对象：`100 个知识点`系列按正式序号取当前期之前三期；其他视频按发布清单内更新时间排序，缺少更新时间时才使用文件修改时间；始终排除当前正在更新的清单。读取这些清单的 `COVER_DNA`，缺失时从旧 Prompt、现有封面或当前会话推断。
4. 填内部策略卡，先做两套不同的候选 DNA，淘汰错误隐喻或与上一期撞车的方案，再写 Prompt。
5. 按请求分流输出：更新发布清单时输出完整封面块；用户明确说“只要 Prompt”时只交付已经整合身份、场景、文字和排除项的单段 Prompt；用户要求“先反向再出本期”时先给参考图视觉语法或通用反向 Prompt，再给本期单段 Prompt。任何分支都不能让用户手动拼接身份、场景或排除项。

内部策略卡：

```text
核心反转：
开头可冻结的动作：
人物面对的具体损失或冲突：
封面标题：
标题准确换行：
黄色强调片段（0 或 1 个）：
英文概念副题：
人物表情与动作：
主视觉锚点类型：object / scene_conflict
主视觉锚点：
锚点与人物的互动：
唯一环境线索：
不用文字也能看懂的冲突：
最容易被误读成：
必须排除的视觉隐喻：
构图原型与机位：
主色与轮廓光：
近三期需避开的组合：
```

## 固定视觉语法

- **比例与层级**：3:4 竖版。焦点顺序固定为标题、脸、主视觉锚点，三者不得互相遮挡。
- **标题区域**：顶部约 20%—28%，最多两行；默认 2—6 个简体中文字，任何封面中文可见正文硬上限为 13 个汉字。
- **标题字效**：超粗、略紧缩的无衬线字，纯白与亮黄色，超粗黑描边、明显偏移投影、轻微立体挤出。生成前固定准确换行，并选择 0 或 1 个语义完整的黄色强调片段，其余字用纯白；不可拆分的短概念可整词单色。禁止随机逐字换色、贴边或裁字。
- **人物**：只出现同一个本人，胸像或半身位于中下部，占画面高度约 40%—55%；面部有干净主光，眼睛、脸和发型清楚可辨。
- **表情**：按场景使用怀疑、专注、犹豫、恍然、笃定或惊讶，通常为 4—7/10。冲突轻微时不得画成尖叫、嫌恶或惊恐。
- **冻结动作**：动作必须能在单帧中定格，并使用明确动词，例如停、推、递、抽、放、拉、指或比较。人物要处在“正要做决定”的瞬间，不是拿着道具摆拍。
- **真实场景优先**：默认使用稿件开头真实可拍的生活或工作环境。商业科技感主要来自字效、灯光、轮廓光和合成质感，不得擅自把现实场景改成宇宙、实验舱、芯片空间或抽象数据世界。
- **表现质感**：高对比、锐利、饱和但受控的商业知识海报；清晰人物抠图层次、统一彩色轮廓光、明确纵深。霓虹、广角和夸张透视是可轮换变量，不是每期必用。
- **文字数量**：只允许封面标题，以及必要时一行英文概念词或系列标记。`100 个知识点`系列保留最短且准确的英文概念副题；过长时先选更短的标准概念名，仍拥挤则在成图后叠字。

## 主视觉锚点与因果准确性

每期只选择一种锚点：

- **object**：一件轮廓清楚、无需读取物件文字也能认出的主题物件。可用轻广角或近大远小强化，但不能为了“显得有料”堆第二件物品。
- **scene_conflict**：没有天然道具时，用一个正在发生的场景冲突作锚点，例如一道即将关闭的门、正在偏移的光路或被卡住的动作。不要再添加同等醒目的前景道具。

桌面、轨道、盘子、门槛或背景光路可作为锚点不可分割的支撑环境，但其尺寸、锐度和对比度必须低于锚点，不能成为第二焦点。

锚点不仅要代表“主题”，还要准确表现稿件的因果。生成前必须写清最容易被误读的机制，并在 Prompt 中明确排除错误隐喻。例如，机制发生在人身上时不要让未变化的客体变质；选择更高增量的去处时不要画成机械平均分配。

时间变化、前后对比或多选题默认压缩成一个“决定发生前一秒”的冻结瞬间。禁止用分屏、重复人物、多个同类物件、箭头或小图标拼贴解释过程。若变化发生在人身上，保持物件品质不变，通过表情、动作和环境状态表现变化。

## 人物与风格参考图

Prompt 开头必须写：`Use the uploaded portrait as the sole identity reference for the same adult host.`

- 保留可辨识的脸型、五官比例、眼距、眼鼻嘴特征、自然肤色、真实皮肤纹理、可见年龄感，以及帮助识别的发型和眼镜。
- 不继承本人照片里的服装、姿势、背景、构图和光线，除非用户明确要求。
- 若同时上传本人照与风格图，必须声明：本人照只负责身份与面部细节；风格图只负责画幅、信息层级、标题几何、色彩能量和灯光语言。不得迁移风格图人物的脸、发型、服装、年龄感或身份。
- 推荐使用清晰正面或轻微侧面的单人照片：脸部无遮挡、不过度美颜、不过曝、无强滤镜。多张照片不得混合成新身份。
- 禁止网红模板脸、过度磨皮、幼态化、卡通化、多人脸混合、重复人物、换脸接缝、脸部变形、额外肢体和畸形手指。

## 构图轮换

每期只选一个原型：

| 原型 | 适用场景 |
|---|---|
| 广角递物 | 工具、手机、消费动作和选择题 |
| 人与巨物并置 | 单一机制或概念落到一件物品 |
| 沉浸场景 | 职业、制度或事件正在发生 |
| 桌面实测 | 账单、实验、操作和决策过程 |
| 俯拍动作 | 资源分配、取舍、排序和比较 |
| 斜向运动 | 增长、失控、加速或边际变化 |

稳定品牌锚点只有三项：本人身份、顶部粗体标题、清晰主体分离。其余变量都要轮换。

相对紧邻上一期至少更换下列九项中的四项，且至少两项来自前五个结构变量：场景原型、景别机位、人物位置、锚点与互动、具体场景、面部表情、服装、主色组合、光线特效。最近三期不得重复同一组“场景原型 + 主色组合”；紧邻两期不得同时重复“人物位置 + 手势方向 + 锚点前景轮廓”。

把方案想象为缩小到约 10% 并转成灰度：如果只换标题仍像同一期，必须重选构图。无法取得历史信息时记录 `unknown`，但不得声称跨期差异已经验证。

读取旧 `COVER_DNA v1` 时：有可独立辨认的实体道具则映射为 `anchor_type=object`；没有独立道具、主要描述空间或过程冲突则映射为 `anchor_type=scene_conflict`；无法判断时写 `unknown`。把旧 `prop` 拆成锚点本身与人物动作；拆不开时 `interaction=unknown`。新输出统一使用 v2，其中 `expression` 只记录面部情绪和强度，`interaction` 只记录人物与锚点的动作，禁止把同一手势重复计入两项变化。

## 输出格式

以下完整格式只用于创建或更新 `发布清单.md`，或用户主动要求完整封面方案。明确的 prompt-only 请求只返回其中的完整单段 Prompt；反向分析请求按工作流第 4 步输出。

````markdown
### 封面图片 Prompt

> 使用方法：在 Image2 或 Image2.5 中同时上传一张清晰本人照片，并完整粘贴下方 Prompt。本人照片只用于人物身份和面部细节参考。

封面标题：
`[默认标题]`

备选标题：
- [备选一]
- [备选二]

一句视觉方案：
[人物冻结动作 + 一个主视觉锚点 + 场景冲突 + 主色]

Image2 / Image2.5 一段式 Prompt：
```text
[完整单段 Prompt]
```

<!-- COVER_DNA v2 | archetype=[构图原型] | shot=[景别机位] | position=[人物位置] | expression=[面部情绪与强度] | anchor_type=[object或scene_conflict] | anchor=[主视觉锚点] | interaction=[人物与锚点的动作] | scene=[场景] | outfit=[服装] | palette=[主辅色] | light=[光线特效] -->
````

## Prompt 写法

单段 Prompt 固定按以下优先级排序，身份锚点不得后置：

1. 本人身份保真与多参考图分工。
2. 核心反转和不应被误读成什么。
3. 景别、机位、人物位置、表情与冻结动作。
4. 唯一锚点、环境线索和无需文字也能看懂的冲突。
5. 标题安全区、准确换行、黄白分色和英文副题。
6. 主色、面光、轮廓光、纵深与商业摄影质感。
7. 针对本期错误隐喻的排除项，再补通用排除项。

标题为单行时写成 `on one line “[完整标题]”`；标题为两行时写成 `arranged in exactly two lines: top line “[上行]”, bottom line “[下行]”`。不要在单段 Prompt 的引号内插入真实换行。

按策略卡替换下列字段，并删除所有方括号；实际输出必须是一个完整段落：

```text
Use the uploaded portrait as the sole identity reference for the same adult host. Preserve the host's recognizable facial geometry, face shape, eye spacing, eyes, nose and mouth, natural skin tone, visible age range and realistic facial texture; retain recognizable hairstyle and eyewear. Do not copy the portrait's clothing, pose, background, composition or lighting. [若有风格图，明确它只用于视觉语法而不用于人物身份。] Create a high-impact 3:4 vertical Chinese knowledge-video thumbnail about “[核心反转]”; make clear that it is not about “[最容易被误读的机制]”. Show the host in a [景别与机位] at [人物位置], with a natural [表情和强度], [冻结动作], visibly interacting with one dominant visual anchor: [锚点]. Use [构图原型] so the conflict “[不用文字也能看懂的冲突]” is clear at a glance, with only [低对比环境线索] inside a coherent [真实场景]. Keep [不会变化的对象或事实] visually unchanged; express the change through [真正变化的人物反应、动作或环境状态]. Establish three non-overlapping focal levels: headline first, recognizable face second, visual anchor third. Reserve the upper 20–28 percent for the exact Simplified Chinese headline [按上方规则写明单行或两行], using extra-bold condensed sans-serif typography; [若有黄色强调片段，写明该完整片段为 bright yellow，其余字为 pure white；若没有，写明整标题的单色。] Use an ultra-thick black outline, strong offset shadow and subtle 3D extrusion, readable at small mobile-thumbnail size. [放置最短准确英文副题，或明确不加副题。] Keep the face, eyes, headline, hands and anchor unobstructed. Use [主色组合], crisp cinematic commercial lighting, clean facial key light, coherent colored rim light, strong depth, saturated but controlled color, sharp subject separation and premium photo-realistic compositing. Show only one host, one dominant anchor and one coherent scene. Explicitly exclude [本期错误隐喻]. Do not reproduce any creator identity, account name, title, logo, watermark, product branding or exact composition from a style reference. No social-media interface, fake likes, duration badge, rounded screenshot card, QR code, decorative sticker, badge, banner strip, extra text, gibberish Chinese, split screen, duplicated person, duplicated object, face distortion, plastic skin, malformed hands, extra fingers, extra limbs, irrelevant AI icons or clutter. Cinematic lighting, hyper-realistic, 8k resolution.
```

## 质量闸门

- [ ] 已读取稿件；标题兑现唯一反转，默认 2—6 字且绝不超过 13 个汉字。
- [ ] 已固定标题为单行或明确的上下两行，并选择 0 或 1 个语义完整的黄色强调片段；没有随机逐字换色。
- [ ] 主视觉锚点只有一个，并已明确为 `object` 或 `scene_conflict`；环境线索不与其竞争。
- [ ] 锚点与场景没有暗示与正文相反的机制；Prompt 已明确排除最危险的错误隐喻。
- [ ] 只有同一个本人；身份句完整，本人照与风格图职责分开，脸、眼睛、标题、手和锚点互不遮挡。
- [ ] 动作是一个可冻结的决定瞬间，不是摆拍、分屏或多物件解释图。
- [ ] 已读取或尽力推断前三期 DNA；相对上一期至少变化四项，其中至少两项为结构变量。
- [ ] Prompt 为单段，顺序正确，无未替换占位符；除准确标题和必要英文副题外没有其他文字。
- [ ] 创建或更新发布清单、完整封面方案时，输出块齐全：使用方法、默认标题、恰好两个备选、一句视觉方案、Prompt、`COVER_DNA v2`；prompt-only 分支只检查交付的是完整、可直接复制的单段 Prompt。
- [ ] 未复制参考创作者身份、文案、品牌、具体道具或精确构图。

## 失败修正

| 问题 | 优先修正 |
|---|---|
| 人脸不像 | 换清晰单人参考照；简化表情、角度和遮挡；把身份保真保留在 Prompt 首段 |
| 出现多个同类物件或分屏 | 改写为一个“决定前一秒”的冻结动作；删掉并列名词；降低环境线索对比度 |
| 视觉隐喻画错因果 | 明写什么保持不变、真正变化的是什么，并逐项排除错误隐喻 |
| 表情过猛 | 降低到 4—5/10，改用停顿、犹豫、专注或轻微恍然 |
| 中文或英文错误 | 保留相同构图，生成顶部 20%—28% 无字安全区，再在剪映中叠字 |
| 手部畸形 | 简化为一只可见手和一个明确动词，避免双手交叉或遮脸 |

只有在实际成图中目检通过人物身份、文字、手部、锚点数量和裁切后，才能称封面完成。
