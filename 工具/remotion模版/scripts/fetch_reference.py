"""从 motionface 的“复刻提示词”里把参考视频下载下来。保存新模版的流程第 1 步用。
用法：python scripts/fetch_reference.py <存着提示词的txt> [编号-名称]
不给编号-名称，就下到库根目录的 参考候选/<片段编号前 8 位>/：先看值不值得做，值得做再跑
  python scripts/new_template.py <编号-名称> --候选 参考候选/<片段编号前 8 位>
它会把视频和来源挪进新模版的 参考/。候选区不进 git。
给了编号-名称就直接下进那个模版的 参考/（模版要先建好）。
从以「参考视频：」开头的那一行取下载地址（只拿来下载，不保存、不打印）；只把「视频标题」「动效片段」开头的几行记进
来源.txt。提示词里其余内容（建仓库、调接口用的凭证）不碰、不打印、不保存，所以这个脚本不会建 GitHub 仓库，也不会调用任何接口。
签名视频链接一小时内有效，过期了回片段页面右键重新复制一份再来。
结果：参考视频.mp4，以及 来源.txt（片段页面链接和标题，记出处用）。
"""
import os
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEEP = ('视频标题', '动效片段')  # 只记这些出处信息；参考视频那一行带签名地址，只拿来下载，不存不打印

if len(sys.argv) < 2:
    sys.exit('用法：python scripts/fetch_reference.py <存着提示词的txt> [编号-名称]')
txt = sys.argv[1]
name = sys.argv[2] if len(sys.argv) > 2 else None

lines = open(txt, encoding="utf-8").read().splitlines()
url = next((ln[len('参考视频：'):].strip() for ln in lines if ln.startswith('参考视频：')), None)
source = [ln.strip() for ln in lines if ln.startswith(KEEP)]
clip = next((ln.split('：', 1)[1].strip() for ln in lines if ln.startswith('动效片段 ID：')), '')

if name:
    folder = f"{ROOT}/src/templates/{name}/参考"
    if not os.path.isdir(folder):
        sys.exit(f"找不到 {os.path.relpath(folder, ROOT)}。先跑 python scripts/new_template.py {name}")
else:
    if not clip:
        sys.exit("提示词里没有「动效片段 ID」这一行，没法给候选文件夹起名。给出 <编号-名称> 再跑")
    folder = f"{ROOT}/参考候选/{clip[:8]}"
    os.makedirs(folder, exist_ok=True)
target = f"{folder}/参考视频.mp4"
if os.path.exists(target):
    sys.exit(f"已经有 {os.path.relpath(target, ROOT)}，不覆盖。要换先删掉它")
if not url:
    sys.exit("提示词里没有以「参考视频：」开头的一行")
if not url.startswith('https://'):
    sys.exit("参考视频的网址不是 https 开头，不下载")

part = target + '.part'
try:
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'curl/8.0'}), timeout=60) as r, open(part, 'wb') as f:
        total = 0
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
            total += len(chunk)
    os.replace(part, target)
except urllib.error.HTTPError as e:
    sys.exit(f"下载失败（服务器返回 {e.code}）。链接签发后一小时就失效，回片段页面右键重新复制一份提示词再试")
except urllib.error.URLError as e:
    sys.exit(f"下载失败，连不上服务器（{e.reason}）。检查网络后再试")
finally:
    if os.path.exists(part):  # 没下完的不留
        os.remove(part)
open(f"{folder}/来源.txt", "w", encoding="utf-8").write("\n".join(source) + f"\n\n参考视频 {total / 1e6:.1f}MB，已存为 参考视频.mp4\n")
print(f"{os.path.relpath(target, ROOT)}  {total / 1e6:.1f}MB")
print(f"{os.path.relpath(folder, ROOT)}/来源.txt 记下了出处：")
for line in source:
    print("  " + line)
print(f"\n下一步：看它长什么样  python scripts/measure/frames.py {target}")
if not name:
    print(f"        值得做的话      python scripts/new_template.py <编号-名称> --候选 {os.path.relpath(folder, ROOT)}")
