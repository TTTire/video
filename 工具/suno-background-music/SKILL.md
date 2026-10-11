---
name: suno-background-music
description: 为像素呼吸已完成的视频稿生成一段可直接粘贴到 Suno 的严格纯器乐背景音乐 Prompt，写进发布清单。不用于人声、逐句配乐或直接生成音频。
---

# Suno 背景音乐

目标：一整条配乐线托住旁白和主场景，不替每句话配音效，也不按章节换曲风。

## 先读稿，归纳四件事

- **主场景**：观众在前 30 秒看到的那个画面。
- **反转**：观众改掉了什么判断。
- **情绪弧线**：开头的张力 → 解释段的推进 → 证据或顿悟处 → 结尾的余味。
- **声音边界**：旁白优先；哪些环境声要保留；哪些情绪会伤到主题。

## 写 Prompt

一段英文，包含：

1. 情境或心理张力，加上有辨识度的乐器、音色和节奏；不要只堆 emotional、cinematic 这类形容词。
2. 和情绪弧线一致的整体走向，中频克制，给旁白留出空间，尾部可以淡出或循环。
3. **必须原样包含这句禁人声条款**，任何题材都不能省：
   `strictly instrumental only, no vocals, no vocal chops, no humming, no choir, no spoken word, no whispers, no ad-libs, no vocal samples`
4. 本期不相容的元素，例如 `no intrusive lead melody, no abrupt EDM drop, no corporate inspirational climax`。

**选材参考**：日常消费和温和顿悟用温暖钢琴、木质打击乐、轻律动；悬念、风险、误判用低频贝斯、闷拍、逐渐收紧的节奏；AI 和不确定性用克制的合成器脉冲、玻璃质感；历史和人性用毛毡钢琴、细弦乐。

不要写在世音乐人、具体歌曲或可辨认的艺人风格；BPM 只在确实影响气质时才写。

## 输出格式（放在发布清单「发布时间」之后）

```markdown
## 背景音乐（Suno）

**音乐定位：** [一句中文：主场景、核心张力、旁白优先]

**情绪弧线：** [开场] → [中段] → [顿悟处] → [结尾]

**Suno Prompt（直接粘贴，打开 Instrumental 开关，歌词栏留空）：**

> [一段英文 Prompt]
```

生成后，只要听到任何人声或人声采样，就重新生成，不作为成片候选。
