---
name: pixel-breath-cover
description: 为“像素呼吸”生成或更新视频发布清单中的 Image2 封面 Prompt，也适用于视频封面、缩略图、人物参考图和面部细节要求。默认使用本人参考照作为唯一身份锚点，生成 3:4 竖版的“顶部粗体标题 + 人物情绪 + 一个主题物件或场景冲突”高识别封面；用户明确要求抽象、无人物或其他风格时不套用。
---

# 像素呼吸人物封面

目标：让每期封面在作品流里同时看清三件事——标题、本人面孔、本期主题物件。学习参考图的视觉语法，不复制参考账号的创作者形象、具体封面、文案或品牌资产。

## 使用边界

- 创建或更新任何 `发布清单.md` 时，必须执行本 Skill 的封面部分。
- 只写 Prompt 时，也输出一段已经整合人物参考、场景、文字和排除项的完整 Prompt，不让用户手动拼接。
- 用户会在生成图片时同时上传本人照片；没有照片时仍完成清单，并注明“生成时请同时上传一张清晰本人照片”。
- 参考照片只约束人物身份，不默认复制照片里的服装、姿势、背景和光线。
- 用户明确指定“抽象”“无人物”或另一种视觉方向时，以当次要求为准，可改用工作区的备用模板。
- 未看到实际生成结果时，只能称为“Prompt 已完成”，不能声称封面已经验收。

## 生成前提炼

先读取本期口播逐字稿和核心认知反转，再填写一张内部策略卡：

```text
核心反转：
开头可见动作：
人物面对的损失或冲突：
封面标题：
人物表情与动作：
唯一主题物件：
唯一场景线索：
构图原型与机位：
主色与轮廓光：
近三期需避开的组合：
```

封面物件优先取自稿件开头的具体动作。不要为了显得“AI”而加入无关机器人、芯片、电路、悬浮图标或数据流。

## 固定视觉 DNA

- **比例**：3:4 竖版，适合抖音作品流。
- **焦点顺序**：先读标题，再认出人物脸，最后看懂一个主题物件；三者不互相遮挡。
- **标题**：默认 2—6 个简体中文字；技术名、产品名或中英混排最多 8 个可见字符。最多两行，放在顶部约 20%—28% 区域，禁止压住眼睛。
- **字形**：超粗、略紧缩的无衬线字，纯白与亮黄色为主，超粗黑描边、明显投影、轻微立体挤出；缩到手机九宫格仍能读清。
- **人物**：只出现同一个本人，使用胸像或半身，位于中下部，占画面高度约 40%—55%，面部明亮、清晰、可辨认。
- **表情**：按主题选择惊讶、怀疑、笃定、专注或若有所思，强度约 6—7/10；不要每期都张嘴尖叫。
- **动作**：人物必须与物件或场景发生明确互动，而不是像证件照一样站着。
- **道具**：只保留一个主物件，可用轻广角和近大远小夸张到前景；最多再用一个环境线索交代场景，不堆小图标。
- **服装**：按主题选择自然、日常、有质感的服装；不复制参考照穿搭，也不默认使用僵硬西装或企业讲师造型。
- **光色**：高饱和、高对比、商业科技海报质感；面部有干净主光，人物与道具有统一的彩色轮廓光，背景有纵深但不过度抢戏。
- **信息量**：只允许封面标题，以及必要时一行较小的英文概念词或系列标记；`100 个知识点`系列保留英文概念副题，其他视频按需使用。默认不加横幅、贴纸、圆章或解释句。

## 人物参考图规则

把同时上传的照片写成 `the sole identity reference for the same adult host`，并明确：

- 准确保留可辨识的脸型、五官比例、眼距、眼鼻嘴特征、自然肤色与真实皮肤纹理。
- 默认保持能帮助识别的发型和眼镜；若本期需改变造型，也不能改变人物身份或可见年龄感。
- 不继承参考图的背景、服装、姿势、构图或光线，除非用户明确要求。
- 不把人物改成参考账号中的创作者，不做网红模板脸，不做过度磨皮、幼态化或卡通化。
- 禁止多人脸混合、重复人物、换脸接缝、脸部变形、额外肢体和畸形手指。

## 构图原型

每期只选一种：

1. **广角递物**：人物正面或微侧，把一个主题物件伸向镜头；适合工具、手机、消费和选择题。
2. **人与巨物并置**：人物偏左或偏右，另一侧是一件被放大的核心物件；适合经济学机制和抽象概念落地。
3. **沉浸场景**：人物置身一个主题环境，只突出一个正在发生的冲突；适合职业、制度或事件型选题。
4. **桌面实测**：人物在桌前操作一个物件，镜头略低或略俯；适合教程、实验、账单和决策过程。
5. **俯拍动作**：镜头从上方看人物与物件的互动；适合资源分配、取舍、排序和对比。
6. **斜向运动**：人物和物件沿对角线形成推进感；适合增长、失控、加速或边际变化。

## 跨期防同质化

稳定品牌锚点只有三项：本人身份、顶部粗体标题、清晰轮廓光。其余元素必须轮换。

先确定比较对象：`100 个知识点`系列按正式序号取当前期之前的三期；其他视频按发布清单内的更新时间取最近三期，缺少更新时间时才用文件修改时间。排除当前正在更新的清单。

读取这三期的 `COVER_DNA`。本期相对紧邻的上一期至少更换下列九项中的四项，其中至少两项来自前五个结构变量：

1. 场景原型
2. 景别与机位
3. 人物位置
4. 物件与互动方式
5. 具体场景
6. 表情与手势
7. 服装
8. 主色组合
9. 光线或特效

最近三期不得重复同一组“场景原型 + 主色组合”。如果旧清单没有 `COVER_DNA`，根据现有 Prompt 推断；无法判断的字段记为 `unknown`，不阻塞本期生成。

“唯一场景线索”必须属于背景环境，不能被人物拿在手里、伸向前景或拥有与主物件相近的尺寸和对比度；否则它就是第二主物件，必须删除或弱化。

## 发布清单输出格式

在发布清单的“封面图片 Prompt”位置依次写：

````markdown
**封面图片 Prompt：**

> 使用方法：在 Image2 中同时上传一张清晰本人照片，并完整粘贴下方 Prompt。照片只用于人物身份和面部细节参考。

封面标题：
`[默认标题]`

备选标题：
- [备选一]
- [备选二]

一句视觉方案：
[人物动作 + 唯一物件 + 场景冲突 + 主色]

Image2 一段式 Prompt：
```text
[完整 Prompt]
```

<!-- COVER_DNA v1 | archetype=[构图原型] | shot=[景别机位] | position=[人物位置] | expression=[表情手势] | prop=[物件互动] | scene=[场景] | outfit=[服装] | palette=[主辅色] | light=[光线特效] -->
````

封面标题服务同一个核心反转，不能制造稿件无法兑现的夸张承诺。标题候选要用 `模板/三重张力五杠杆写稿流程.md` 检查观众损失、身份代入和转变方向。

## Image2 一段式 Prompt 骨架

根据策略卡替换方括号，并把所有内容合成一个段落：

```text
Use the uploaded portrait as the sole identity reference for the same adult host. Preserve the host's recognizable facial geometry, face shape, eye spacing, eyes, nose and mouth, natural skin tone, visible age range and realistic facial texture; retain recognizable hairstyle and eyewear unless this episode explicitly requires a change. Do not copy the reference photo's clothing, pose, background, composition or lighting. Create a high-impact 3:4 vertical Chinese knowledge-video thumbnail about “[核心反转]”. Show the host in a [胸像或半身景别] at [人物位置], looking toward the camera with a natural [表情] expression at medium-high intensity, [具体动作], visibly interacting with one oversized thematic object: [唯一主题物件]. Use [构图原型与机位] so the visible conflict “[不用文字也能看懂的冲突]” is clear at a glance, with only [唯一场景线索] inside a coherent [具体环境]. Establish three non-overlapping focal levels: headline first, recognizable face second, thematic object third. Reserve the upper 20–28 percent for the exact Simplified Chinese headline “[封面标题]”, no more than two lines, in extra-bold condensed sans-serif typography, pure white and bright yellow, ultra-thick black outline, strong offset shadow and subtle 3D extrusion, readable at small mobile-thumbnail size; [若需要英文概念词则写：place the smaller exact English concept “英文词” directly beneath it；否则写：do not add a subtitle]. Keep the face, eyes, headline and main object unobstructed. Use [主色组合], crisp cinematic commercial lighting, clean facial key light, coherent colored rim light, strong depth, saturated but controlled color, sharp subject separation and premium photo-realistic 3D compositing. Show only one host, one dominant object and one coherent scene. Do not reproduce any creator face, hairstyle, outfit, account name, title, logo, watermark, product branding or exact composition from the style reference. No social-media interface, no fake likes, no duration badge, no rounded screenshot card, no QR code, no stickers, no banner, no extra text, no gibberish Chinese, no duplicated person, no face distortion, no plastic skin, no malformed hands, no extra fingers, no extra limbs, no irrelevant AI icons and no clutter. Cinematic lighting, hyper-realistic, 8k resolution.
```

## 质量闸门

- [ ] 标题、本人面孔、唯一主题物件在手机缩略图尺寸下仍可同时识别。
- [ ] 封面标题与稿件的核心反转一致，没有无依据的“爆款”承诺。
- [ ] 人脸像本人，皮肤自然；参考照的衣服、背景和姿势没有被无意复制。
- [ ] 只有一个本人、一个主物件、一个连贯场景，没有杂乱拼贴。
- [ ] 人物与物件有动作关系，表情符合本期主题，不是固定惊讶脸。
- [ ] 与紧邻上一期相比至少变化四项，其中至少两项为结构变量；最近三期没有重复“场景原型 + 主色组合”。
- [ ] 没有参考账号的文案、人物形象、Logo、品牌元素或平台界面。
- [ ] 没有额外文字、乱码、脸手畸形、重复人物、遮眼或标题被裁切。
- [ ] Prompt 为一个完整段落，人物参考、正向描述和排除项没有拆开。

如果实际成图的中文不准确，保留同一构图和人物要求，生成顶部留出 20%—28% 安全区的无字背景，再在剪映中叠加标题；成图未经目检前不得标记为完成。
