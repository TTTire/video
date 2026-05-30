# 像素呼吸封面图片通用 Prompt

> 用途：给 **GPT-image / DALL·E** 生成抖音认知类视频封面底图，保持「日常物品经济学」系列统一视觉。
> 推荐做法：先用无字版生成封面底图，再在剪映/设计工具里统一加标题文字，这样系列感更稳定。
>
> **GPT-image 写法要点**：以正向描述为主，少用否定词（模型对一长串 `Do not...` 基本不理会）。把否定项压成一句简短结尾即可。

## 〇、画幅怎么填（横竖通用）

本系列同一个画面要能出 **3:4 竖版** 和 **4:3 横版**，画面内容不变，只换画幅。

- 想要竖版：`[画幅]` 填 `3:4 (portrait)`
- 想要横版：`[画幅]` 填 `4:3 (landscape)`
- 为了横竖都不崩：构图统一让物品**居中、四周留出呼吸空间**，标题暗部留白放在**顶部**而不是侧边。

## 一、统一封面风格

- 主题：日常物品经济学。
- 视觉承诺：一个普通物品，背后连接一个社会规则。
- 构图：单个核心物品占画面 45%-60%，居中或略偏下，四周留呼吸感（保证横竖两版都成立）。
- 标题区：画面**顶部**保留一块干净、偏暗、带轻微压暗渐变的留白，方便后期加 8-12 个中文字，白字能压得住。
- 风格：高级、克制、电影感、**真实摄影**为主，概念海报为辅。
- 质感关键词（治"廉价3D"）：实拍质感、真实材质、影棚布光、中画幅相机、浅景深、细腻表面细节。
- 色彩：深色背景 + 暖色主光 + 少量青绿色/金色点缀。
- 品牌感：统一暗色背景、强对比光影、物品大特写、顶部干净留白。
- 避免：杂乱背景、过多人物、卡通、廉价 3D/CGI 渲染感、夸张霓虹、过度赛博朋克、乱码文字。

## 二、推荐无字版 Prompt（主用）

把下面的 `[变量]` 替换成当前选题即可。`[画幅]` 按第〇节填写。

```text
A premium [画幅] cover image for a Chinese knowledge channel, in the visual series "daily object economics" — one ordinary object that quietly reveals one hidden social rule.

Hero object: [物品]. Render it as a real, physical object captured with professional product photography.
Core idea behind the object: [核心机制].
Emotional undertone: [现实痛点].

Composition:
- one large, instantly recognizable [物品] as the single hero, centered with breathing room on all sides so the same framing works in both portrait and landscape
- the object occupies about 45% to 60% of the frame, in sharp focus
- keep the top portion as a clean, darker, slightly vignetted negative space, reserved for Chinese title text added later
- a single directional warm spotlight or soft diagonal light beam makes the object feel important and a little dramatic
- faint, blurred background hints of [相关场景] far behind the object, kept dark and secondary, never cluttered

Look and feel:
- photographed, not a 3D render and not CGI — real materials with believable surface texture, fine grain, micro-scratches and natural wear
- shot on a medium-format camera, 85mm lens, shallow depth of field, gentle bokeh
- cinematic editorial poster mood, chiaroscuro lighting like a careful studio still life
- dark charcoal background, warm amber key light, subtle teal shadows, rich high contrast
- restrained, modern, intelligent, expensive-looking — not flashy, not neon
- very subtle film grain as a quiet brand texture; the image must read clearly as a phone thumbnail

Keep it clean: no text, no letters, no logo, no watermark, no extra hands, no cartoon or cheap 3D style, no messy background.
```

## 三、带字版 Prompt（仅测试用）

GPT-image 中文渲染比以前稳，但仍可能出错或断字，**正式封面还是建议无字版 + 后期加字**。

```text
A premium [画幅] cover image for a Chinese knowledge channel named "像素呼吸", in the series "daily object economics".

Main title, in large bold accurate Simplified Chinese, placed across the top portion:
"[封面标题]"
Small brand text in a bottom corner, subtle:
"像素呼吸"

Hero object: [物品], shot as a real physical object with professional product photography.
Core idea: [核心机制]. Background hints: [相关场景], blurred and secondary.

Composition:
- one large [物品] centered with breathing room, occupying 45%-60% of the frame, sharp focus
- title sits in the top portion over a clean darker area, big bold modern sans-serif, white or warm off-white, strong contrast so it pops on a phone
- small brand text near a lower corner, clean, not competing with the title
- generous spacing around all text; title must be crisp and readable as a thumbnail

Look and feel:
- photographed, not a 3D render and not CGI — real materials, believable texture, fine grain
- medium-format camera, 85mm lens, shallow depth of field
- cinematic editorial poster, chiaroscuro studio lighting
- dark charcoal background, warm amber key light, subtle teal shadows, high contrast
- restrained, modern, expensive-looking, very subtle film grain

The Chinese text must be exact and clean. Keep it clean: no random characters, no watermark, no messy UI, no cartoon or cheap 3D style, no cluttered background.
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

### 一枚印章

```text
[物品]：一枚中国传统印章
[核心机制]：信用与承诺的制度化
[现实痛点]：信用崩塌、承诺不值钱、签名造假的焦虑
[相关场景]：合同、签名、公章、红印泥、官方文件
[封面标题]：一枚印章代表信用
```

## 六、后期加字规范（治"标题不吸睛"）

- 主标题：白色或暖白色，**粗体/特粗**，8-12 字以内，宁可少字也要大。
- 字号：占满标题宽度的大部分，手机缩略图里一眼能读清；不够大就再放大。
- 对比：底图顶部本身偏暗；如还压不住，给标题加一层**轻微深色渐变/半透明色块**或细描边，保证白字不糊在背景里。
- 字体气质：思源黑体、阿里巴巴普惠体、HarmonyOS Sans 这类现代无衬线粗体。
- 标题位置：顶部留白区，不要压住主体物品。
- 关键词高亮：可把标题里最反直觉的 2-3 个字换成**暖黄/青绿**点缀色，制造视觉钩子（如「不是**重量**」「藏着**安全感**」）。
- 辅助字：尽量不用；必须用时控制 4-6 字，如"信任成本""社交货币"。
- 品牌字：右下角小字"像素呼吸"，低调，不抢标题。
