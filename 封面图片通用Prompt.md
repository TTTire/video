# 像素呼吸封面图片通用 Prompt

> 用途：给 `gpt-image2` 生成抖音认知类视频封面底图，保持「日常物品经济学」系列统一视觉。
> 推荐做法：先用无字版生成封面底图，再在剪映/设计工具里统一加标题文字，这样系列感更稳定。

## 一、统一封面风格

- 画幅：竖版 3:4
- 主题：日常物品经济学。
- 视觉承诺：一个普通物品，背后连接一个社会规则。
- 构图：单个核心物品占画面 45%-60%，位于画面中上部或中央偏下。
- 标题区：画面上方或中部保留大块干净留白，方便后期加 8-12 个中文字。
- 风格：高级、克制、电影感、轻微像素质感、真实摄影与概念海报结合。
- 色彩：深色背景 + 暖色主光 + 少量青绿色/金色点缀。
- 品牌感：统一使用暗色背景、强对比光影、物品大特写、干净留白。
- 避免：杂乱背景、过多人物、卡通风、廉价 3D、夸张霓虹、过度赛博朋克、模型生成的乱码文字。

## 二、推荐无字版 Prompt

把下面的 `[变量]` 替换成当前选题即可。

```text
Create a vertical 9:16 Douyin short-video cover image for a Chinese knowledge account named "像素呼吸".

Series visual identity: "daily object economics" — one ordinary object reveals one hidden social rule.

Main object: [物品].
Core metaphor: [核心机制].
Emotional tension: [现实痛点].

Composition:
- one large, highly recognizable [物品] as the hero object
- the object should occupy about 45% to 60% of the frame
- place the object in the center or slightly lower center
- leave a clean dark negative space area in the upper third for Chinese title text added later
- use a strong diagonal light beam or warm spotlight to make the object feel important
- add subtle background hints related to [相关场景], but keep them blurred and secondary

Visual style:
- premium cinematic editorial poster
- realistic object photography mixed with conceptual visual storytelling
- dark charcoal background, warm amber key light, subtle teal shadows
- restrained, modern, intelligent, not flashy
- slight pixel-grain texture as a subtle brand signature for "像素呼吸"
- sharp focus on the object, shallow depth of field
- high contrast, clean layout, strong readability on a phone screen

Do not include any text, letters, logos, watermark, subtitles, messy UI, extra hands, distorted objects, low-quality rendering, cartoon style, cheap 3D style, or cluttered background.
```

## 三、带字版 Prompt

如果你希望模型直接生成带标题的封面，用这个版本。但中文文字容易不稳定，建议只在测试时使用。

```text
Create a vertical 9:16 Douyin short-video cover image for a Chinese knowledge account named "像素呼吸".

Main title text, in accurate simplified Chinese:
"[封面标题]"

Small brand text:
"像素呼吸"

Main object: [物品].
Core metaphor: [核心机制].
Scene hints: [相关场景].

Composition:
- one large [物品] as the visual center
- keep the title in the upper third, large bold Chinese typography, white or warm off-white
- put the small brand text near the lower corner, subtle and clean
- leave enough spacing around all text
- title must be clearly readable on a mobile phone screen

Visual style:
- premium cinematic editorial poster
- realistic object photography mixed with conceptual visual storytelling
- dark charcoal background, warm amber key light, subtle teal shadows
- restrained, modern, intelligent
- slight pixel-grain texture
- high contrast, clean layout, no clutter

The Chinese text must be exact and readable. Do not add extra text, random characters, watermark, subtitles, messy UI, distorted objects, cartoon style, cheap 3D style, or cluttered background.
```

## 四、统一标题模板

封面标题尽量短，控制在 6-12 个中文字。

```text
[物品]，称的不是[表层东西]
[物品]，藏着[社会规则]
[物品]，看懂[现实痛点]
[物品]，为什么改变[结果]
```

示例：

- 一杆秤称的不是重量
- 一张纸改变了命运
- 一杯茶不是饮料
- 一碗米饭藏着安全感
- 一枚铜钱让人焦虑
- 一枚印章代表信用

## 五、当前系列变量示例

### 一杆秤

```text
[物品]：一杆中国传统杆秤 / 现代电子秤
[核心机制]：交易里的信任成本
[现实痛点]：怕被坑、缺斤少两、平台评分不可信
[相关场景]：菜市场、电子秤、商品评论、平台评分
[封面标题]：一杆秤称的不是重量
```

### 一张纸

```text
[物品]：一张微微泛黄的纸
[核心机制]：知识复制成本
[现实痛点]：AI 让知识生产门槛下降，普通人开始焦虑
[相关场景]：竹简、印刷术、考试卷、电脑文档、AI 生成内容
[封面标题]：一张纸改变了命运
```

### 一杯茶

```text
[物品]：一杯热茶 / 一只茶杯
[核心机制]：社交货币和关系定价
[现实痛点]：饭局、送礼、人情往来里不能明说的价格
[相关场景]：茶桌、办公室、商务局、饭局
[封面标题]：一杯茶不是饮料
```

### 一碗米饭

```text
[物品]：一碗白米饭
[核心机制]：确定性和安全感
[现实痛点]：房贷、储蓄、稳定工作、家庭账本
[相关场景]：粮仓、储蓄罐、账本、餐桌
[封面标题]：一碗米饭藏着安全感
```

### 一枚铜钱

```text
[物品]：一枚古代铜钱
[核心机制]：货币确定性
[现实痛点]：工资到账、物价上涨、房租账单、存款缩水
[相关场景]：账单、工资短信、城市夜景、老铜钱
[封面标题]：一枚铜钱让人焦虑
```

## 六、后期加字规范

- 主标题：白色或暖白色，粗体，8-12 字以内。
- 字体气质：黑体、思源黑体、阿里巴巴普惠体、HarmonyOS Sans 这类现代无衬线。
- 标题位置：上方三分之一，不要压住主体物品。
- 字号：手机缩略图里也要能一眼读清。
- 辅助字：尽量不用；如果必须用，控制在 4-6 字，例如“信任成本”“社交货币”。
- 品牌字：右下角小字“像素呼吸”，不要抢标题。
