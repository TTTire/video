# 为什么你总在深夜下单 — 封面图片 Prompt

> 用途：GPT-image / DALL·E 生成抖音 3:4 竖版封面。
> 风格沿用「像素呼吸」通用模板，与其他选题保持统一。
> 生成后缩到抖音宫格大小看一眼：标题读不清就重做。

## 变量填写

```text
[封面标题]：深夜买的不是东西
[物品]：一只在黑暗中亮着的手机，屏幕停在付款按钮上，被一只手举在床上
[核心机制]：深夜下单买的不是商品，是给白天委屈的情绪止痛
[现实痛点]：白天忍了太多，只有付款那一下世界好像按自己的意思动了一下
[表层误解]：以为是自控力差、欲望太强
[真正反转]：其实是白天的委屈没有出口，把消费当成唯一的情绪止痛片
[相关场景]：关灯的卧室、堆在角落没拆的快递盒、第二天醒来发呆的订单页
```

## 备选标题（任选其一替换 `[封面标题]`）

- 深夜买的不是东西（推荐，highlight「不是」）
- 深夜下单不是缺东西
- 你买的是委屈
- 深夜下单在止痛

## 主 Prompt（可直接复制）

```text
A high-click Douyin 3:4 portrait cover for a Chinese knowledge channel named "像素呼吸".
Designed for Douyin profile grid, search results, and fast mobile scrolling.

Main thumbnail title, exact Simplified Chinese, huge and readable on a phone:
"深夜买的不是东西"

Title design:
- place the title in the top 38% to 45% of the image
- use a very large, extra-bold modern Chinese sans-serif style
- white or warm off-white title text on a clean dark background
- highlight the Chinese characters "不是" in warm yellow
- keep the title within 1 to 2 lines, with strong spacing and crisp edges
- the title must be the first thing people notice
- the title should feel like a sharp Douyin knowledge-video hook, not a book title

Hero subject:
- main object: a smartphone glowing in the dark, screen frozen on a payment confirm button, held up by one hand lying in bed
- show it as a real physical object, instantly recognizable
- place it in the lower middle of the frame, occupying about 50% of the image
- make it sharp, tactile, and close enough to feel like a product poster

Core visual tension:
- this glowing phone at midnight reveals that late-night shopping is not buying goods, it is buying relief for the day's swallowed frustration
- emotional pressure behind the topic: a day of holding back at work, with checkout being the only moment the world finally moves the way you want
- create a subtle visual contrast between thinking it is weak self-control and the real cause, having no outlet for the day's grievances

Composition:
- 3:4 vertical portrait composition
- one clear focal subject only
- top area stays dark and uncluttered for the large title
- the subject must not cover the title
- keep the bottom 15% free of important information
- keep tiny details away from the right edge
- faint blurred hints of a dark bedroom, an unopened delivery box in the corner, and an order page on a screen in the background, kept secondary
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
