"""按编号给一个模版出片，或者只出单帧。免得每次手敲 remotion 的长命令。
用法：python scripts/render.py <编号> [示例名 | 参数json路径] [--still 帧号] [--out 输出文件] [--单独] [-- 其余透传给 remotion 的参数]
  编号：模版文件夹名开头的数字，如 01
  示例名：模版文件夹里 示例-xxx.json 的 xxx 的一部分，如“片头”；也可以直接给一个 .json 的路径
  --still N：不出片，只出第 N 帧的一张图
  --单独：不走装着所有模版的 src/index.ts，只用一个只装这一个模版的小入口。别的模版正改到一半、整包打不起来的时候用
不给示例就用模版的默认内容。输出默认放 out/<模版文件夹>/，文件名是 默认.mp4 / xxx.mp4（--still 时是同名的 png）。
不带任何参数运行，会列出所有模版和各自的示例。
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = 'src/index.ts'

# --单独 用的小入口。每次都重写一遍，免得模版的文件夹名改了以后它还指着旧的。out/ 不进 git。
STANDALONE = """import {registerRoot} from 'remotion';
import {standalone} from '../../src/shared/Standalone';
import * as T from '../../src/templates/{name}';

registerRoot(standalone('{name}', T));
"""


def templates():
    """库里的全部模版：[(文件夹名, 编号, 文件夹绝对路径)]。合成 id 就是文件夹名。"""
    out = []
    for d in sorted(glob.glob(f"{ROOT}/src/templates/*")):
        if os.path.isdir(d):
            name = os.path.basename(d)
            out.append((name, name.split('-', 1)[0], d))
    return out


def samples(folder):
    """一个模版文件夹里的示例参数：[(名字去掉“示例-”, 文件绝对路径)]。"""
    return [(os.path.basename(f)[3:-5], f) for f in sorted(glob.glob(f"{folder}/示例-*.json"))]


def print_list():
    for name, no, folder in templates():
        print(f"{no}  {name}")
        for label, _ in samples(folder):
            print(f"      示例：{label}")
    print("\n出片：python scripts/render.py <编号> [示例名]    只出一帧：加 --still <帧号>    指定输出：加 --out <文件>")


def main():
    args = sys.argv[1:]
    passthrough = []
    if '--' in args:
        i = args.index('--')
        passthrough, args = args[i + 1:], args[:i]
    still = None
    out = None
    alone = False
    positional = []
    i = 0
    while i < len(args):
        if args[i] == '--单独':
            alone = True
            i += 1
        elif args[i] in ('--still', '--out'):
            if i + 1 >= len(args):
                sys.exit(f"{args[i]} 后面要跟一个值")
            if args[i] == '--still':
                still = int(args[i + 1])
            else:
                out = args[i + 1]
            i += 2
        else:
            positional.append(args[i])
            i += 1

    if not positional:
        print_list()
        return
    hit = [t for t in templates() if positional[0] in (t[0], t[1])]
    if len(hit) != 1:
        print(f"编号「{positional[0]}」对不上库里的模版。现在有：")
        print_list()
        sys.exit(1)
    name, no, folder = hit[0]

    props = None
    label = '默认'
    if len(positional) > 1:
        key = positional[1]
        if key.endswith('.json'):
            props = os.path.abspath(key)
            label = os.path.basename(key)[:-5]
        else:
            found = [s for s in samples(folder) if key in s[0]]
            if len(found) != 1:
                names = '、'.join(s[0] for s in samples(folder)) or '（这个模版还没有示例）'
                sys.exit(f"示例名「{key}」对不上。这个模版的示例有：{names}")
            label, props = found[0]

    if out:
        out = os.path.abspath(out)
    elif still is None:
        out = f"{ROOT}/out/{name}/{label}.mp4"
    else:
        out = f"{ROOT}/out/{name}/{label}-第{still}帧.png"
    os.makedirs(os.path.dirname(out), exist_ok=True)

    remotion = f"{ROOT}/node_modules/.bin/remotion"
    if not os.path.exists(remotion):
        sys.exit("还没装依赖。先在库根目录跑一次 npm install")
    entry = ENTRY
    if alone:
        entry = f"{ROOT}/out/{name}/单独入口.ts"
        os.makedirs(os.path.dirname(entry), exist_ok=True)
        open(entry, "w", encoding="utf-8").write(STANDALONE.replace('{name}', name))
    cmd = [remotion, 'still' if still is not None else 'render', entry, name, out]
    if still is not None:
        cmd += ['--frame', str(still)]
    if props:
        cmd += ['--props', props]
    cmd += passthrough
    print(' '.join(cmd))
    subprocess.run(cmd, cwd=ROOT).returncode and sys.exit(1)


main()
