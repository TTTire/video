# aroll-prep — 相机视频 + 录音笔音频 → 对齐、转写、提议剪点、按清单剪

本地脚本，Windows 10 + Python 3.13 + ffmpeg（PATH 里）+ RTX 4060（可选，没有就走 CPU）。
全部命令在 `工具/aroll-prep/` 目录下用系统 `python` 直接跑；除 `setup.py` 和 `propose_cuts.py` 外的脚本会自动用 `.venv\Scripts\python.exe` 重新执行自己，不用手动激活。

## 流程

```
原片文件夹/            ← 相机 mp4/mov（含机内麦原声，可多段）+ 录音笔 wav/mp3/m4a/flac（一条）
   │  python scripts/sync.py 原片文件夹 [--concat]
   ▼
同步/                  ← <原名>-同步.mp4（视频 copy，音轨换成录音笔+响度归一）
                         <原名>-口型核对.mp4（10 秒 1080p，人眼核对口型）
                         同步报告.md / .json
                         A-roll-同步-全部.mp4（--concat 时）
   │  python scripts/transcribe.py 同步/xxx-同步.mp4 --hotwords "海底捞,需求价格弹性"
   ▼
xxx-同步.words.json    ← 分段 + 字级时间戳
xxx-同步.转写.txt      ← 每段一行 [mm:ss.s] 文本   → 读它、决定怎么剪
   │  python scripts/propose_cuts.py 同步/xxx-同步.words.json
   ▼
剪切清单.md / .json    ← 人工改 `处理` 列或时间
   │  python scripts/cut.py 同步/xxx-同步.mp4 同步/剪切清单.md --words 同步/xxx-同步.words.json
   ▼
xxx-同步-成片.mp4      ← 1080p30 h264 + AAC 192k
xxx-同步-成片.srt / .words.json / 剪辑映射.json
```

## 0. 安装（一次）

```
python scripts/setup.py            # 建 .venv，清华镜像装 numpy / faster-whisper 1.2.1 / ctranslate2 4.8.4 / nvidia-cublas-cu12 / nvidia-cudnn-cu12
python scripts/setup.py --cpu-only # 没有 NVIDIA 卡
```

结尾打印 `CUDA 设备数: 1 -> cuda/float16` 即 GPU 可用。幂等，重复跑只做校验；`--force` 重装。
首次转写会从 hf-mirror 下载 large-v3（约 3GB）到 HF 默认缓存（`%USERPROFILE%\.cache\huggingface`）。

## 1. 对齐换音轨 `sync.py`

```
python scripts/sync.py <原片文件夹> [--out 输出目录] [--concat] [--recorder 文件] [--win 60] [--drift-threshold-ms 20] [--no-loudnorm]
```

- 自动分类：有视频流的 = 相机段；只有音频流的 = 录音笔（多条时取最长，或 `--recorder` 指定）。输出目录默认 `<原片文件夹>/../同步`。
- 对齐算法：两边都抽成 8kHz 单声道、300–3000Hz 带通、归一化互相关（overlap-save FFT，全长搜索，录音笔先开机/后开机都行）。
  相机段开头/中间/结尾各取 60s 窗口（能量最大的位置），窗口偏移对时间做线性拟合得钟漂 ppm。
  钟漂会抹平长窗的相关峰，所以首窗先按 ±500ppm 网格预拉伸粗搜，再迭代拉伸重测，收敛到 1ppm 内。
- 置信度 = 主峰 / 次峰（排除主峰 ±50ms）。**< 2 要人工看 `口型核对.mp4`**；正常同源音频在 5–10 以上。
- 输出音轨：录音笔按偏移裁到相机段长度（录音笔晚开机就前补静音、早停就后补静音并警告）；段尾累计钟漂 > 20ms 时用 `aresample=384000,asetrate=384000*(1+ppm),aresample=48000` 修正（整数采样率在 384k 上取整，误差 < 1.5ppm）；
  再响度归一到 I=-16 LUFS / TP=-1.5：第一遍 `loudnorm print_format=json` 测量，第二遍能线性增益就 `loudnorm linear=true`（目标 LRA 抬到 ≥ 源 LRA，否则 loudnorm 会悄悄退回 dynamic 模式）；
  线性增益会顶破真峰值时改用 `volume + alimiter(-2.5dBTP, latency 补偿)`，成品响度会略低于 -16，报告里写明。AAC 192k 48k。
- `--concat`：按文件名顺序拼成 `A-roll-同步-全部.mp4`。编码参数全一致 → concat demuxer `-c copy`；不一致（例如某段 4K 某段 1080p）→ filter_complex concat 重编码（h264_nvenc，没有就 libx264），统一到第一段高度、30fps。

### 同步报告怎么看

| 列 | 含义 |
|---|---|
| 偏移(s) | 相机 t=0 对应录音笔的时间。正 = 录音笔先开机。多段时每段各自独立搜索（第二段通常 = 第一段偏移 + 中间间隔）。 |
| 钟漂(ppm) / 段尾累计(ms) | 录音笔相对相机的时钟快慢；累计 = ppm × 段长。相机/录音笔晶振一般 < 50ppm，10 分钟段 ≈ 30ms。 |
| 修正 | 累计 > 阈值（默认 20ms）且钟漂可信时为"是"。 |
| 置信度 / 峰值 | 主/次峰比、归一化相关峰值（同源音频 0.9+；录音笔离嘴近、相机机内麦远时 0.2–0.5 正常，看置信度）。 |
| 警告 | 置信度低、录音笔不覆盖整段、钟漂不可测等。 |

「各窗口」列出每个窗口的偏移，几个窗口偏移一致（修正后）才说明钟漂拟合可靠。

## 2. 转写 `transcribe.py`

```
python scripts/transcribe.py <视频或音频> [--hotwords "词1,词2"] [--model large-v3] [--device auto|cuda|cpu] [--out-dir 目录] [--no-vad]
```

- `--device auto`：有 CUDA → `cuda/float16`，否则 `cpu/int8`。打印设备、模型加载秒、音频长度、转写秒与倍速。
- 参数：`language=zh`、`beam_size=5`、`vad_filter=True`、`word_timestamps=True`、`initial_prompt="以下是普通话的句子。"`、`hotwords` 透传、`condition_on_previous_text=False`（避免长录音幻觉传染）。
- 后处理：Whisper 常把段首第一个字的时间戳拉到前面静音段开头（例如首字 15.79–16.27，第二个字 17.79 才开始）；若首字与第二字空 > 0.5s 就把首字贴回第二字前 0.3s，打印修正条数。
- 产物：`<名>.words.json`（`segments[]: start/end/text/words[{word,start,end,prob}]`，另含 model/device/耗时）、`<名>.转写.txt`（`[mm:ss.s] 文本`，每段一行）。
- 音频不走 faster-whisper 的 `decode_audio`，而是 `ffmpeg -f f32le` 管道读成 numpy（见常见问题）。

## 3. 提议剪点 `propose_cuts.py`

```
python scripts/propose_cuts.py <words.json> [--pause 1.5] [--window 60] [--similarity 0.75] [--out 剪切清单.md]
```

纯标准库，不需要 venv。先按标点把词序列切成短句，再找四类：

| 类型 | 规则 | 默认删除范围 |
|---|---|---|
| 停顿 | 相邻两词空隙 > `--pause`（1.5s） | 空隙两端各保留 0.2s |
| 重说 | 60s 窗内两短句归一化文本相似度 ≥ 0.75（短于 10 字时 ≥ 0.85，避免"弹性大/弹性小"这类排比误报）；连续几句一起重说会合成一块 | 前一遍起点（向前扩到最近的停顿）→ 后一遍开口前 0.1s；中间的卡壳/自言自语一起删 |
| 垫字 | 短句开头独立的 呃/嗯/啊/额；那个/就是/然后/这个 需后面带标点或 ≥0.25s 停顿才算 | 前一词结束 +0.2s → 下一词开口前 0.08s |
| 残句 | ≤6 字或 ≤2s 的短句，且下一句开头 2–4 字相同（卡壳重起） | 同重说 |

完全落在别的删除段里的停顿不单列，并在那条的内容里注明"含 静音 3.7s"。

### 剪切清单怎么改

```
| # | 开始 | 结束 | 时长 | 类型 | 内容 | 处理 |
|---|---|---|---|---|---|---|
| 1 | 00:09.540 | 00:17.390 | 7.85 | 重说 | 删前一遍「…」→ 留后一遍「…」（相似度 1.00，2 句） | 删 |
| 2 | 00:22.780 | 00:27.070 | 4.29 | 垫字 | 「呃」；含 静音 3.7s（保留 0.4s） | 删 |
```

- `处理` 写 `删`（或 删除/剪/x）才执行；改成 `留` 就跳过。
- `开始`/`结束` 可以直接改，接受 `mm:ss.sss`、`h:mm:ss.sss` 或纯秒（`9.6`）。
- 可以手动加行（序号任意整数），`时长`/`类型`/`内容` 列只是给人看的，不参与执行。
- 同名 `.json` 是机器可读版本，`cut.py` 只读 `.md`。

## 4. 剪 `cut.py`

```
python scripts/cut.py <同步后视频> <剪切清单.md> [--words words.json] [--out 成片.mp4] [--height 1080] [--fps 30] [--snap 0.3] [--margin 0.08] [--encoder auto|h264_nvenc|libx264]
```

- 边界吸附：对音轨算 20ms 帧 RMS(dB)，在每个边界 ±0.3s 内找最低点所在的"安静区"（比最低点高 ≤10dB 的连续帧）。删除段起点落在安静区内且离前面的话音 ≥ 80ms，终点离后面的话音 ≥ 80ms；提议值本身在安静区内就尊重提议（所以长停顿保留的 0.4s 不会被吃掉）。
- 相邻删除段间隔 < 0.25s 合并。一条 `filter_complex`：每个保留段 `trim/atrim + setpts`，`concat`，再 `scale=-2:1080,fps=30`，一次编码输出。
- 编码：`h264_nvenc -preset p5 -rc vbr -cq 19`（启动前用 1 秒测试编码确认可用），不可用回退 `libx264 -crf 18`；AAC 192k。
- 产物：成片、`剪辑映射.json`（`cuts[]` 吸附前后区间，`keeps[]` 源区间 → 成片区间）。给了 `--words` 则按映射重定时输出 `<成片名>.words.json` 和 `<成片名>.srt`：
  词中点落在删除区间里的词去掉，跨边界的词裁掉被删一半；一段无剩余词则整段去掉。srt 以 Whisper 段为底，按标点切成 ≤20 字的小条（Whisper 中文段常 30–40 秒一条，直接做字幕没法用），相邻条不重叠。

## 常见问题

- **CUDA 用不了 / `cublas64_12.dll not found`**：机器装的是 CUDA 13 toolkit，ctranslate2 4.8 需要 CUDA 12 的 `cublas64_12.dll` 和 `cudnn64_9.dll`。`setup.py` 用 pip 装 `nvidia-cublas-cu12`、`nvidia-cudnn-cu12`，脚本启动时对 `.venv\Lib\site-packages\nvidia\{cublas,cudnn,cuda_nvrtc}\bin` 逐个 `os.add_dll_directory` 并前置到 `PATH`（`_common.add_cuda_dlls`）。在 bash/PowerShell 里 export PATH 对 Windows DLL 搜索无效，必须在 Python 进程里加。
- **模型下载慢/失败**：脚本默认 `HF_ENDPOINT=https://hf-mirror.com`、`HF_HUB_DISABLE_SYMLINKS_WARNING=1`（已设环境变量则不覆盖）。
- **为什么不把文件路径直接丢给 `transcribe()`**：faster-whisper 1.2.1 的 `decode_audio` 与 av 19 不兼容（`metadata_errors` 关键字报错）。所有脚本统一 `ffmpeg -i X -vn -ac 1 -ar 16000 -f f32le -` 管道读成 numpy float32 再传。
- **pip 慢**：`setup.py` 用 `-i https://pypi.tuna.tsinghua.edu.cn/simple`。
- **同步报告置信度低**：相机机内麦离得远、混响大、或两边根本不是同一场录音。先看 `口型核对.mp4`；偏移明显错时可以把录音笔裁一段再 `--recorder` 指定。
- **成片响度低于 -16 LUFS**：报告里响度一栏写了 `volume + alimiter` 的就是源音频峰值/响度比太大（音效、拍桌子），线性增益顶破真峰值被限制器压了；正常口播会走 `loudnorm linear` 精确落到 -16。

## 文件

```
scripts/_common.py      venv 自动切换、CUDA DLL 注入、ffprobe/ffmpeg 封装、read_audio(numpy)、NVENC 探测、时间格式
scripts/setup.py        建 .venv + 装依赖 + 校验
scripts/sync.py         对齐 / 钟漂 / 换音轨 / 响度 / 口型核对 / 报告 / 拼接
scripts/transcribe.py   faster-whisper 转写
scripts/propose_cuts.py 剪点提议 → 剪切清单.md/.json
scripts/cut.py          按清单剪 + 字幕重定时
tests/smoke.py          冒烟测试：自造素材跑完整链路后清理（python tests/smoke.py [--keep] [--skip-asr]）
```

## 实测（2026-10-31，RTX 4060 Laptop 8GB，ffmpeg 8.0.1，faster-whisper 1.2.1 / ctranslate2 4.8.4）

`python tests/smoke.py` 一次跑完，总耗时约 50s：

**对齐（无钟漂）**：`工具/video-render/out/ep8-full.mp4` 前 180s 当相机；录音笔 = 同一音轨 `adelay 2345ms` + 粉噪 -30dB + EQ(200Hz -6dB, 4kHz +3dB)。
结果偏移 **+2.345s**（期望 2.345 ±0.005），钟漂 0.0ppm，首窗/尾窗偏移均 +2.3450，置信度 10.2（峰值 0.93），用时 7.2s。
`--concat` 单段走 copy。另测两段（C0001 1080p copy、C0002 缩到 720p 重编码）共用一条 mp3 录音笔：偏移 +2.345 / **+62.345**，置信度 5.3 / 6.3，拼接走 h264_nvenc 重编码到 1080p30。
同步后音轨与相机原声残差：5s / 90s / 165s 处分别 -0.01 / -0.00 / -0.06 ms。

**对齐（钟漂）**：录音笔再经 `aresample=480000,asetrate=480144,aresample=48000`（精确 ×1.0003；不用 `atempo`，它的 WSOLA 让漂移非线性、前 5 秒就跳 9ms）。
结果偏移 +2.344s，钟漂 **-299.9ppm**（期望 -300），段尾累计 **-54.0ms**（期望 -54），判定修正=是，置信度 9.9。
修正后残差：5s / 90s / 165s 处 -0.01 / -0.03 / -0.14 ms。首窗不做网格预拉伸时置信度只有 1.4（峰被抹平），这是加网格粗搜的原因。

**响度**：ep8 音轨是稀疏音效（I=-30 LUFS、TP=-5.7、LRA 15），线性增益 +14dB 会顶破 TP，走了 `volume+alimiter(-2.5dBTP)` 路径，成品实测 -22.3 LUFS / TP -1.5 dBTP（限制器把 10dB 的峰压掉，响度自然到不了 -16；AAC 过冲约 1dB，所以限制器留了 1dB 余量）。正常口播素材不会进这条路径。

**转写 → 提议 → 剪**：SAPI `Microsoft Huihui Desktop` 合成 67s 普通话（一句读两遍、中间 3s 静音、一处句首"呃"），配纯色 1080p30 画面；录音笔 = 同一 wav 延迟 1234ms。
- sync：偏移 +1.234s，置信度 8.1。
- transcribe：`cuda/float16` large-v3，加载 3.4s，69s 音频转写 5.8s（11.9x 实时），3 段，修正段首字时间戳 1 处。文本全对（含热词"海底捞""需求价格弹性"），"呃,"被识别成独立词。
- propose_cuts：2 处，合计 12.1s —— `重说`（两句一起，相似度 1.00，9.54→17.39）、`垫字`「呃」（22.78→27.07，内含 3.7s `停顿` 并入）。`残句` 这次素材里没有。
- cut：吸附后 9.70–17.39、22.92–27.07，共删 11.84s；成片 69.37s → **57.53s**，h264_nvenc 编码 4.9s。srt 19 条，起止单调、不重叠、末条 54.3s < 成片时长 ✓。
- 把第 2 行改成 `留`、第 1 行开始改成纯秒 `9.6` 后重跑：只执行 1 行，成片 61.58s ✓。

`tests/_tmp/` 跑完已清空。
