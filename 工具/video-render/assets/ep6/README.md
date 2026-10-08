# 第 6 期素材库（米白底 / 扁平插画 / 得意黑）

全部由 `_work/gen.py`（元素）和 `_work/scenes.py`（场景）生成，改调色或线宽重跑即可，风格天然一致。

- `fonts/`     得意黑 Smiley Sans v2.0.1（OFL 开源，可商用）
- `elements/`  47 个透明底 SVG 元素（E01–E14 全部齐）
- `scenes/`    17 张 1920×1080 场景 SVG（清单里的 S01–S22 全部，S13 可选项未做）
- `_work/`     生成脚本 + preview 截图

预览：`py _work/gen.py && py _work/scenes.py`，然后用 Chrome 打开 `_work/preview.html` / `_work/preview-scenes.html`。

## 用法
场景 SVG 可直接作为 Remotion 背景（`<Img>` 或内联），元素 SVG 由代码摆位做动效。需要 PNG 时用 Chrome 无头截图或 resvg 转。
