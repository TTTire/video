# 查理·芒格高点击封面反向 Prompt

> 视觉依据：2026-07-30 直接查看「像素呼吸」抖音主页中《穷查理宝典——芒格说普通人最大的错误》的已发布封面。本文件是对成品视觉的反向拆解，不代表原始生成参数。

## 成品视觉结构

- 画面左侧约 60% 是四行主标题：`芒格说 / 普通人 / 最大的 / 错误`。
- 字色依次为白、黄、白、红，最后的“错误”承担认知警报。
- 标题使用超粗中文字体、黑色超厚描边、重阴影和轻微斜切，缩略图中仍然醒目。
- 画面右侧约 40% 是查理·芒格半身像与一本《穷查理宝典》，人物负责识别，书负责证明主题。
- 背景是深棕黑书房与桌面，暖金光集中在人物、书和标题边缘。
- 顶部小标签、底部短解释和一个金色圆章构成辅助信息，但不抢主标题。
- 画面密度高，但只有“标题、人物与书、短解释”三层信息，没有多人物和多场景拼贴。

## Image2 一段式反向 Prompt

```text
A high impact 4:3 Chinese knowledge-channel short-video thumbnail using a bold editorial photomontage composition, left 60% dominated by the exact Chinese headline arranged in four stacked lines: "芒格说" in white, "普通人" in saturated yellow, "最大的" in white, and "错误" in vivid red, huge heavy Chinese characters with ultra-thick black outline, deep offset shadow and slightly slanted 3D sticker-comic typography, right 40% shows one highly recognizable warm-toned half-body portrait of Charlie Munger beside one upright copy of Poor Charlie's Almanack as the only evidence prop, dark brown-black vintage study desk and bookshelf background, warm golden rim light, subtle old-paper texture, one small yellow top label reading "穷查理宝典", one narrow red warning banner near the bottom reading "避免一生平庸的关键认知", at most one small gold circular seal, three clear information levels, strong red-yellow-white contrast, high saturation, readable in a small mobile grid, controlled dense layout, no split-screen before-and-after scene, no multiple people, no extra props, no ordinary realistic movie poster, no thin font, no small main title, no low contrast, no excessive empty space, no messy collage, no blurred or wrong Chinese characters, no logo, no watermark, Cinematic lighting, hyper-realistic, dark moody color palette, 8k resolution
```

## 后续复用原则

以后不复制“芒格 + 书”这两个具体元素，只复制它的信息秩序：**左侧一个强判断，右侧一个识别主体，再加一个证据道具**。没有名人时，人物可换成真实生活中的普通人；纯概念主题可直接用一个巨大核心物件替代人物。
