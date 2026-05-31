# 像素呼吸封面图片通用 Prompt

> 用途：给 **GPT-image / DALL·E** 生成「像素呼吸」抖音认知类视频封面。
> 当前只保留一种主模板：**抖音 3:4 竖版 + 醒目中文标题**。
> 正式使用前，建议把生成图缩到抖音主页宫格大小看一眼：标题读不清，就不是好封面。

## 一、抖音封面策略

- 画幅固定为 **3:4 portrait**，优先适配抖音主页宫格、搜索结果和推荐流里的竖版封面。
- 标题是第一视觉锤：5-9 个中文字，最多两行，缩到小卡片也能读清。
- 封面只讲一个冲突：不是完整知识点，而是一句让人停一下的反常识判断。
- 画面只保留一个强主体：一个物品、一个价格、一张账单或一个明确表情，不堆复杂背景。
- 标题和主体要互相解释：标题制造疑问，主体让用户一眼知道这条视频和什么生活场景有关。
- 用强对比：深色背景、白色/暖白粗体字，关键词用暖黄或青绿点亮。
- 构图留白明确：顶部 38%-45% 给标题，主体放在中下部，占画面 45%-55%。
- 避开抖音遮挡区：底部 15% 不放关键信息，右侧边缘不放小字和细节。
- 背景只做情绪，不讲故事：相关场景可以模糊出现，但不能抢标题和主体。

## 二、主模板：抖音 3:4 醒目标题版 Prompt

把下面的 `[变量]` 替换成当前选题即可。

```text
A high-click Douyin 3:4 portrait cover for a Chinese knowledge channel named "像素呼吸".
Designed for Douyin profile grid, search results, and fast mobile scrolling.

Main thumbnail title, exact Simplified Chinese, huge and readable on a phone:
"[封面标题]"

Title design:
- place the title in the top 38% to 45% of the image
- use a very large, extra-bold modern Chinese sans-serif style
- white or warm off-white title text on a clean dark background
- highlight the most surprising 2 to 3 Chinese characters in warm yellow or teal
- keep the title within 1 to 2 lines, with strong spacing and crisp edges
- the title must be the first thing people notice
- the title should feel like a sharp Douyin knowledge-video hook, not a book title

Hero subject:
- main object: [物品]
- show it as a real physical object, instantly recognizable
- place it in the lower middle of the frame, occupying about 45% to 55% of the image
- make it sharp, tactile, and close enough to feel like a product poster

Core visual tension:
- this ordinary object reveals [核心机制]
- emotional pressure behind the topic: [现实痛点]
- create a subtle visual contrast between [表层误解] and [真正反转]

Composition:
- 3:4 vertical portrait composition
- one clear focal subject only
- top area stays dark and uncluttered for the large title
- the subject must not cover the title
- keep the bottom 15% free of important information
- keep tiny details away from the right edge
- faint blurred hints of [相关场景] in the background, kept secondary
- strong silhouette, high contrast, easy to understand within one second
- no crowded props, no small unreadable details

Look and feel:
- cinematic realistic photography, not cartoon, not cheap 3D, not CGI
- premium editorial poster style
- dark charcoal background, warm amber key light, subtle teal shadows
- dramatic but restrained lighting, shallow depth of field, realistic texture
- medium-format camera look, 85mm lens, fine surface details, subtle film grain
- designed for Douyin mobile scrolling, bold, clean, curiosity-driven

Small brand text:
- add "像素呼吸" in a tiny lower corner, subtle and not competing with the title
- keep the brand text above the bottom safe zone

Text accuracy:
- Chinese title must be exact, clean, complete, and readable
- no random characters, no broken strokes, no watermark, no messy UI
```

## 三、标题写法

封面标题不要解释完整观点，只负责制造一个点击前的疑问。
抖音标题要更像“停顿钩子”：短、硬、跟用户生活有关。

```text
[物品]不是[表层东西]
[物品]正在偷走[结果]
[物品]让你[情绪]
[物品]背后是[机制]
[物品]早就变了
```

示例：

- 米饭不是主食
- 外卖不是贵了
- 铜钱让人焦虑
- 印章不是签名
- 秤称的不是重量
- 茶桌不是喝茶

## 四、变量填写格式

```text
[封面标题]：
[物品]：
[核心机制]：
[现实痛点]：
[表层误解]：
[真正反转]：
[相关场景]：
```

## 五、测试 Prompt：一碗米饭抖音 3:4 版

```text
A high-click Douyin 3:4 portrait cover for a Chinese knowledge channel named "像素呼吸".
Designed for Douyin profile grid, search results, and fast mobile scrolling.

Main thumbnail title, exact Simplified Chinese, huge and readable on a phone:
"米饭不是主食"

Title design:
- place the title in the top 38% to 45% of the image
- use a very large, extra-bold modern Chinese sans-serif style
- white or warm off-white title text on a clean dark background
- highlight the Chinese characters "不是" in warm yellow
- keep the title within 1 to 2 lines, with strong spacing and crisp edges
- the title must be the first thing people notice
- the title should feel like a sharp Douyin knowledge-video hook, not a book title

Hero subject:
- main object: one steaming bowl of plain white rice
- show it as a real physical object, instantly recognizable
- place it in the lower middle of the frame, occupying about 48% of the image
- make it sharp, tactile, and close enough to feel like a product poster

Core visual tension:
- this ordinary bowl of rice reveals the economics of certainty and household security
- emotional pressure behind the topic: mortgage stress, savings anxiety, fear of losing stability
- create a subtle visual contrast between rice as daily food and rice as a symbol of safety

Composition:
- 3:4 vertical portrait composition
- one clear focal subject only
- top area stays dark and uncluttered for the large title
- the subject must not cover the title
- keep the bottom 15% free of important information
- keep tiny details away from the right edge
- faint blurred hints of a family dining table, a small account book, and a storage jar in the background, kept secondary
- strong silhouette, high contrast, easy to understand within one second
- no crowded props, no small unreadable details

Look and feel:
- cinematic realistic photography, not cartoon, not cheap 3D, not CGI
- premium editorial poster style
- dark charcoal background, warm amber key light, subtle teal shadows
- dramatic but restrained lighting, shallow depth of field, realistic texture
- medium-format camera look, 85mm lens, fine surface details, subtle film grain
- designed for Douyin mobile scrolling, bold, clean, curiosity-driven

Small brand text:
- add "像素呼吸" in a tiny lower corner, subtle and not competing with the title
- keep the brand text above the bottom safe zone

Text accuracy:
- Chinese title must be exact, clean, complete, and readable
- no random characters, no broken strokes, no watermark, no messy UI
```
