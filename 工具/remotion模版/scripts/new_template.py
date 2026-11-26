"""新建一个模版的骨架并登记进库。看完参考视频、决定要做之后跑它。
用法：python scripts/new_template.py <编号-名称> [--候选 文件夹] [--尺寸 宽x高]
      如 02-手写标题
          02-榜单排名攀升 --候选 参考候选/8850561c --尺寸 1080x1920
生成（已存在的不覆盖）：
- src/templates/<编号-名称>/index.ts、Template.tsx、schema.ts   能直接渲染的最小模版：素色底上一行逐字打出的标题
- src/templates/<编号-名称>/README.md                             说明文档的骨架，状态先写粗做
- src/templates/<编号-名称>/参考/                                 参考视频放这里（mp4 不进 git）
并在 src/Root.tsx 的两处标记里加上引入和注册，在 README.md“用哪个模版”的表里加一行占位。
合成 id 就是文件夹名，所以只能用字母、数字、连字符和汉字（不能有空格、下划线、点）。
--候选 是 scripts/fetch_reference.py 下载到的那个文件夹（参考候选/<片段编号前 8 位>）；给了就把里面的参考视频和来源
挪进新模版的 参考/。--尺寸 是画幅的像素，默认 1920x1080，竖屏写 1080x1920。
做完就能出片试跑：python scripts/render.py <编号>
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

INDEX_TS = """// 这个模版对外的四样东西：画幅、组件、参数定义、默认值。库根目录的 src/Root.tsx 按这里登记。
export const width = {w};
export const height = {h};
export {Template} from './Template';
export {schema, defaultProps} from './schema';
"""

TEMPLATE_TSX = """import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Backdrop} from '../../shared/Backdrop';
import {HANS, SONG} from '../../shared/fonts';
import {Grain} from '../../shared/Grain';
import {Typed} from '../../shared/textParts';
import {TemplateProps} from './schema';

// 共用部件都在 src/shared/：SplitGroup（有蓝红色散的叠字）、Typed（逐字打出）、Backdrop（铺底和推镜）、Grain（颗粒）；
// 关键帧多的曲线用 curve.ts 的 track，段与段之间速度连续，不会一顿一顿的。
// 版面数值写清是参考第几帧的屏幕坐标，量的办法见库根目录 README 的“保存一个新模版”。
export const Template: React.FC<TemplateProps> = (props) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#e6e6e4'}}>
      <Backdrop scale={1} />
      <Typed
        text={props.title}
        frame={frame}
        at={0}
        cps={1}
        channel={0}
        color="rgb(41, 39, 49)"
        rise={0}
        fracture={0}
        style={{position: 'absolute', left: __LEFT__, top: __TOP__, fontFamily: `${SONG}, ${HANS}`, fontSize: 160, lineHeight: 1}}
      />
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};
"""

SCHEMA_TS = """import {z} from 'zod';

export const schema = z.object({
  durationInFrames: z.number().int().min(60).describe('成片总帧数（30fps）'),
  title: z.string().describe('标题文字。粗做阶段先用这一项，版面定下来再往下加参数'),
});

export type TemplateProps = z.infer<typeof schema>;

// 默认内容写参考视频的原样，并注明只为对照、没有核实过；真实的内容另存成 示例-xxx.json。
export const defaultProps: TemplateProps = {durationInFrames: 240, title: '待替换'};
"""


def readme_md(name):
    return f"""# {name}

状态：粗做。参考视频和出处在 `参考/`。

一句话说它是什么动效、画幅多大、多长。

## 适合 / 不适合

## 参数

## 和参考的差异

## 字体

用到哪些字体、各自的授权。
"""


def write_if_absent(path, content):
    if os.path.exists(path):
        print(f"  已有 {os.path.relpath(path, ROOT)}")
        return
    open(path, "w", encoding="utf-8").write(content)
    print(f"  新建 {os.path.relpath(path, ROOT)}")


def insert_sorted(text, start_mark, end_mark, line):
    """把一行插进两道标记之间，和里面已有的行一起按编号排好（别名、id 开头的数字）。"""
    a = text.index(start_mark) + len(start_mark)
    b = text.index(end_mark, a)
    lines = [old for old in text[a:b].splitlines(keepends=True) if old.strip()]
    number = lambda item: re.search(r"(\d+)-", item).group(1)  # noqa: E731  取这一行里第一串“数字加连字符”，也就是编号
    lines = sorted(lines + [line], key=number)
    return text[:a] + ''.join(lines) + text[b:]


def register_in_root(name, alias):
    root = f"{ROOT}/src/Root.tsx"
    s = open(root, encoding="utf-8").read()
    imp_line = f"import * as {alias} from './templates/{name}';\n"
    if imp_line in s:
        print("  Root.tsx 已注册")
        return
    imp_mark = "// ---- templates（由 scripts/new_template.py 维护，别删这两行标记） ----\n"
    imp_end = "// ---- /templates ----"
    reg_mark = "  // ---- registry（由 scripts/new_template.py 维护，别删这两行标记） ----\n"
    reg_end = "  // ---- /registry ----"
    if any(mark not in s for mark in (imp_mark, imp_end, reg_mark, reg_end)):
        sys.exit("src/Root.tsx 里的标记注释被改过，脚本不知道往哪儿插。按库根目录 README 里写的样子把标记补回来再跑")
    reg_line = f"  {{id: '{name}', width: {alias}.width, height: {alias}.height, size: sizeOf({alias}), C: {alias}.Template, schema: {alias}.schema, defaults: {alias}.defaultProps}},\n"
    # 引入和登记都按编号从小到大排，Studio 里的顺序和文件夹的顺序一致
    s = insert_sorted(s, imp_mark, imp_end, imp_line)
    s = insert_sorted(s, reg_mark, reg_end, reg_line)
    open(root, "w", encoding="utf-8").write(s)
    print(f"  Root.tsx 注册合成 {name}")


def add_to_readme(name):
    readme = f"{ROOT}/README.md"
    s = open(readme, encoding="utf-8").read()
    link = f"| [{name}](src/templates/{name}/)"
    if link in s:
        print("  README.md 已登记")
        return
    anchor = "| 待补充 |"
    if anchor not in s:
        sys.exit("  README.md 的“用哪个模版”表里找不到「| 待补充 |」这一行，请手动在表里给这个模版加一行")
    header_end = s.index(anchor)
    rule = s.rindex("\n|---", 0, header_end)  # 表头下面那条横线；它的下一行起才是条目
    header_start = s.index("\n", rule + 1) + 1
    table_row = f"{link} | 待补 | 待补 | 待补 | 粗做 |\n"
    number = lambda item: re.match(r"\| \[(\d+)-", item).group(1)  # noqa: E731
    rows = sorted([old for old in s[header_start:header_end].splitlines(keepends=True) if old.strip()] + [table_row], key=number)
    open(readme, "w", encoding="utf-8").write(s[:header_start] + ''.join(rows) + s[header_end:])
    print("  README.md“用哪个模版”的表里加了一行占位")


def take_candidate(candidate, template_dir):
    """把候选区里的参考视频和来源挪进新模版的 参考/。"""
    src = candidate if os.path.isabs(candidate) else os.path.join(ROOT, candidate)
    if not os.path.isdir(src):
        sys.exit(f"找不到候选文件夹 {candidate}")
    for fn in ("参考视频.mp4", "来源.txt"):
        if os.path.exists(os.path.join(src, fn)):
            os.replace(os.path.join(src, fn), os.path.join(template_dir, "参考", fn))
            print(f"  参考视频挪进来：参考/{fn}")
    if not os.listdir(src):
        os.rmdir(src)
        parent = os.path.dirname(src)
        if os.path.isdir(parent) and not os.listdir(parent):
            os.rmdir(parent)


def main():
    argv = sys.argv[1:]
    options = {}
    for flag in ("--候选", "--尺寸"):
        if flag in argv:
            i = argv.index(flag)
            if i + 1 >= len(argv):
                sys.exit(f"{flag} 后面要跟一个值")
            options[flag] = argv[i + 1]
            del argv[i:i + 2]
    name = argv[0] if argv else ''
    if not re.fullmatch(r'\d{2,}-[\w\u4e00-\u9fff-]+', name):
        sys.exit('名字要写成「编号-名称」，如 02-手写标题；只能用字母、数字、连字符和汉字')
    size = options.get('--尺寸', '1920x1080')
    if not re.fullmatch(r'\d{3,5}x\d{3,5}', size):
        sys.exit('--尺寸 要写成 宽x高，如 1080x1920')
    w, h = (int(v) for v in size.split('x'))
    alias = 'T' + name.split('-', 1)[0]  # Root.tsx 里的引入别名，如 T02
    d = f"{ROOT}/src/templates/{name}"
    if os.path.exists(d):
        sys.exit(f"{os.path.relpath(d, ROOT)} 已经有了，不覆盖")

    os.makedirs(f"{d}/参考", exist_ok=True)
    print(f"新建模版 {name}（{w}×{h}）：")
    # index.ts 的内容里本来就有花括号（export {Template}），所以用 replace 而不是 format
    write_if_absent(f"{d}/index.ts", INDEX_TS.replace('{w}', str(w)).replace('{h}', str(h)))
    write_if_absent(f"{d}/Template.tsx", TEMPLATE_TSX.replace('__LEFT__', str(int(w * 0.09))).replace('__TOP__', str(int(h * 0.44))))
    write_if_absent(f"{d}/schema.ts", SCHEMA_TS)
    write_if_absent(f"{d}/README.md", readme_md(name))
    if '--候选' in options:
        take_candidate(options['--候选'], d)
    register_in_root(name, alias)
    add_to_readme(name)
    print(f"\n下一步：粗做。版面照着参考量，量的办法见库根目录 README 的“保存一个新模版”")
    print(f"        出片试跑  python scripts/render.py {name.split('-')[0]}")


main()
