# 生成 ai02 的 photo.json / scene-names.json（一次性脚本，改完 photo.json 后可以直接手改 JSON，不必再跑）
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
style = {"layout": "center", "titleFont": "smiley", "tint": "#24170E", "tintOpacity": 0.25, "enter": "zoom", "letterbox": False, "grain": True,
         "theme": {"gold": "#E8833A", "coral": "#D9534F", "teal": "#7FB89A", "bg": "#0A0806", "dim": "#CFC6BA"}}
def h(text, at=0, **k): return {"type": "h", "text": text, "at": at, **k}
def t(text, at=0, **k): return {"type": "t", "text": text, "at": at, **k}
def tag(text, at=0, **k): return {"type": "tag", "text": text, "at": at, **k}
S = []
S.append({"id": "haiku", "name": "10月8日早上-Haiku5.5便宜75%", "photo": "S01", "move": "in", "origin": "MR", "box": "TL", "grad": "left", "ambience": "办公室", "enterSfx": None, "items": [
    tag("2026 年 10 月 8 日 · 早上", 0, dark=True, delay=6, until=4),
    t("一边冲咖啡，一边刷 AI 新闻", 1, until=4),
    h("Anthropic 发了新模型\nClaude Haiku 5.5", 2, size=60),
    h("平均跑下来，比上一代便宜了 **约 75%**", 5, size=56, sfx="ding"),
    t("我第一反应：好事啊", 6),
    h("账单要变薄了？", 7, size=66),
]})
S.append({"id": "swarm", "name": "同一周-一句话拉起1000个AI", "photo": "S02", "move": "in", "origin": "MC", "box": "TW", "grad": "top", "dim": 0.15, "items": [
    tag("同一个星期", 0, dark=True, delay=6, until=4),
    h("同一家公司，又上了一个新功能", 1, size=50, color="dim", until=4),
    h("一句话，拉起 **1000** 个 AI，同时帮你干活", 2, size=72, sfx="impact"),
    t("他们自己在说明里提醒：", 4),
    h("这个功能会消耗大量的 token", 5, quote=True, size=54),
]})
S.append({"id": "token", "name": "定义卡-token就像流量", "photo": "S02", "move": "out", "blur": 10, "dim": 0.55, "center": True, "items": [
    {"type": "big", "text": "token", "at": 0, "size": 150},
    t("国家数据局的说法", 1),
    h("≈ 互联网时代的 **流量**", 2, size=72),
    h("AI 读一段字、写一段字，都按它算钱", 3, size=46, color="dim"),
]})
S.append({"id": "china", "name": "阶梯-全国日均token两年千倍", "photo": "S03", "move": "in", "origin": "MR", "box": "TW", "grad": "top", "items": [
    {"type": "custom", "name": "chinaSteps"},
]})
S.append({"id": "paradox", "name": "单价掉用量涨-越便宜花得越多", "photo": "S04", "move": "out", "origin": "MR", "box": "TL", "grad": "left", "items": [
    h("单价一直在 ((掉))　用量一直在 [[涨]]", 0, size=60),
    h("掏出去的钱，也跟着 **涨**", 1, size=60),
    h("东西越便宜，反而花得越多", 2, size=66, sfx="impact"),
    t("这事听着别扭 —— 可早在一百六十年前", 4),
    h("就有人把它写进了书里", 5, size=50, color="dim"),
]})
S.append({"id": "title", "name": "片头-AI越便宜你花得越多", "photo": "S04", "move": "in", "origin": "BR", "box": "TL", "grad": "left", "enterSfx": None, "items": [
    t("像素呼吸 · AI经济学", 0, delay=6, sfx=None),
    h("AI越便宜\n你花得越多", 1, delay=20, size=96, sfx="whoosh"),
]})
S.append({"id": "grocery", "name": "菜和油-降价省钱的前提是量不变", "photo": "S05", "move": "in", "origin": "BC", "box": "TW", "grad": "top", "dim": 0.1, "items": [
    t("先说句公道话", 0, until=5),
    h("觉得降价就能省钱，一点都不傻", 1, size=56, until=5),
    h("菜便宜了 → 买菜花得少", 2, size=48, color="dim", until=5),
    h("油价降了 → 加满一箱少掏几十块", 3, size=48, color="dim", until=5),
    t("但这笔账里，藏着一个没说出口的前提：", 5),
    h("**量不变**", 6, size=110, sfx="impact"),
    h("菜还是那几样，油还是一箱", 7, size=46, color="dim"),
    t("因为你本来就只需要那么多", 8),
]})
S.append({"id": "wifi", "name": "2014徐先生省流量-要WiFi密码", "photo": "S06", "move": "in", "origin": "MC", "box": "TW", "grad": "top", "ambience": "咖啡馆", "items": [
    h("可有些东西，一便宜，量就变了", 0, size=56, until=3),
    t("这事我们其实都经历过一回", 1, until=3),
    h("**手机流量**", 2, size=80, until=5),
    tag("2014 · 4G 刚商用", 3, dark=True),
    t("新华社采访过一位徐先生：", 4),
    h("微博：关掉自动加载图片", 5, size=46, color="dim"),
    h("微信：关掉视频自动播放", 6, size=46, color="dim"),
    h("WiFi 密码多少？", 7, quote=True, size=58),
    t("我估计你也干过", 8),
]})
S.append({"id": "traffic", "name": "阶梯-资费降九成-流量205MB到18GB", "photo": "S07", "move": "in", "origin": "BC", "box": "TW", "grad": "top", "dim": 0.1, "items": [
    tag("2019 · 提速降费", 0, dark=True, delay=6, until=6),
    h("手机流量资费，比 2014 年降了 **九成多**", 2, size=56, until=6),
    h("那你省下话费了吗？", 3, size=50, color="dim", until=6),
    h("大多数人没有 —— 因为你开始刷短视频了", 5, size=56, until=6),
    {"type": "custom", "name": "trafficSteps"},
    t("中国信通院 · 2019 年报告，写得很直白", 9),
    h("流量用得太猛，人均话费没降多少", 11, quote=True, size=58),
]})
S.append({"id": "formula", "name": "公式卡-账单=单价×用量", "photo": "S07", "move": "out", "blur": 10, "dim": 0.55, "center": True, "enterSfx": None, "items": [
    {"type": "custom", "name": "formulaCard"},
]})
S.append({"id": "liuyong", "name": "北大创投课刘勇-看做完一件事的总成本", "photo": "S08", "move": "in", "origin": "ML", "box": "TR", "grad": "right", "items": [
    t("上个月 · 北大创投课 · 刘勇老师", 0),
    h("AI 的成本不能只看 token 的单价", 2, quote=True, size=48),
    h("要看做完一件能验收的事，\n一共花了多少", 3, quote=True, size=48),
    h("AI 做了 **80%**，剩下 20% 要人来补", 5, size=52),
    t("那人工也得算进去", 6),
]})
S.append({"id": "paper", "name": "AI就是当年的流量-英文论文丢给AI", "photo": "S09", "move": "in", "origin": "MR", "box": "TL", "grad": "left", "items": [
    h("AI 现在，就是当年的 **流量**", 0, size=60, until=3),
    t("说实话，我自己就是这样：我英语一般", 1, until=3),
    tag("上个月 · 小米的一篇英文论文", 3, dark=True),
    h("直接丢给 AI，让它写了一份精读笔记", 4, size=52),
    h("放在 AI 贵的时候，没几个人舍得", 6, size=46, color="dim"),
    t("所以真正要问的是：", 8),
    h("便宜了以后，用量会涨多少？", 9, size=62, sfx="impact"),
]})
S.append({"id": "jevons", "name": "1865杰文斯煤炭问题-担心煤烧光", "photo": "S10", "move": "in", "origin": "BC", "box": "TW", "grad": "top", "items": [
    tag("1865 · 英国", 0, dark=True, delay=6),
    h("经济学家杰文斯 ——《煤炭问题》", 1, size=60),
    h("那会儿英国人担心：煤迟早烧光", 2, size=50, color="dim"),
    t("很多人觉得不用慌：", 3),
    h("蒸汽机越来越省煤，问题自己就解决了", 4, quote=True, size=52),
]})
S.append({"id": "watt", "name": "瓦特省煤三分之二-杰文斯说正好相反", "photo": "S11", "move": "in", "origin": "MR", "box": "TR", "grad": "right", "items": [
    t("这话有依据", 0, until=3),
    h("瓦特改良过的蒸汽机，干同样的活", 1, size=48, color="dim", until=3),
    h("省下了 **三分之二以上** 的煤", 2, size=60, until=3),
    h("可杰文斯说：正好相反", 3, size=62, sfx="impact"),
    h("以为节省燃料就等于少烧燃料，\n是彻底搞混了", 5, quote=True, size=46),
    {"type": "stamp", "text": "事实恰恰相反", "at": 6, "size": 60, "rotate": -4},
]})
S.append({"id": "spread", "name": "省煤就划算-矿井到纺织厂火车轮船", "photo": "S12", "move": "in", "origin": "MC", "items": [
    h("蒸汽机省煤了 → 用它就划算了", 0, size=60),
    t("以前只有矿井舍得装；后来 ——", 2),
    h("矿井 → 纺织厂 → 铁厂 → 火车 → 轮船", 3, size=54),
    h("**全都装上了**", 4, size=72, sfx="impact"),
]})
S.append({"id": "coal", "name": "阶梯-英国煤产量百年12倍-定义杰文斯悖论", "photo": "S13", "move": "in", "origin": "MR", "box": "MW", "grad": "left", "items": [
    {"type": "custom", "name": "coalSteps"},
    {"type": "big", "text": "杰文斯悖论", "at": 6, "size": 130, "font": "song", "sfx": "impact"},
    h("效率越高，总消耗反而越多", 7, size=60),
]})
S.append({"id": "elastic", "name": "表格-价格降到1/4-用量×2×4×10", "photo": "S13", "move": "out", "blur": 8, "dim": 0.5, "center": True, "enterSfx": None, "items": [
    t("它会不会发生，就看一件事：", 0, until=2),
    h("便宜了以后，用量涨得有多猛", 1, size=64, until=2),
    {"type": "custom", "name": "elasticTable"},
]})
S.append({"id": "google", "name": "阶梯-谷歌月token两年330倍-Anthropic收入12倍", "photo": "S14", "move": "in", "origin": "MC", "box": "TW", "grad": "top", "dim": 0.2, "items": [
    h("那 AI 是哪一种？", 0, size=64, until=1),
    {"type": "custom", "name": "googleSteps"},
]})
S.append({"id": "pertask", "name": "DeepSeek新版每题成本涨两倍半", "photo": "S15", "move": "in", "origin": "MR", "box": "TW", "grad": "top", "items": [
    t("而且不光是事情变多了", 0, until=2),
    h("一件事本身，也越用越多", 1, size=60),
    tag("DeepSeek · 一个便宜模型的新版本", 2, dark=True),
    h("答题更准了 —— 可每道题的成本 ((涨了两倍半))", 4, size=56, sfx="impact"),
    t("因为现在的 AI 会多想一会儿", 5),
    h("想得越久，用掉的 token 就越多", 6, size=48, color="dim"),
]})
S.append({"id": "nadella", "name": "纳德拉凌晨推文-杰文斯悖论又来了", "photo": "S16", "move": "in", "origin": "BR", "box": "TL", "grad": "left", "items": [
    tag("2025 年 1 月", 0, dark=True, delay=6, until=5),
    h("DeepSeek 的便宜模型一出来", 1, size=48, color="dim", until=5),
    h("大家担心：以后用不了那么多算力？", 2, size=56, until=5),
    t("微软 CEO 纳德拉 · 那天凌晨的推文", 3),
    h("杰文斯悖论又来了", 5, quote=True, size=66, sfx="impact"),
    h("AI 越高效、越容易用，用量就会暴涨", 6, quote=True, size=44),
    h("变成一样我们怎么都用不够的东西", 8, quote=True, size=44),
    t("他是卖算力的，当然希望这样", 9),
    h("但这两年的数，确实站在他那边", 10, size=52),
]})
S.append({"id": "maxplan", "name": "200美元包月跑掉几万美元-由俭入奢易", "photo": "S17", "move": "in", "origin": "ML", "box": "TR", "grad": "right", "items": [
    tag("Anthropic · $200 包月套餐", 0, dark=True, delay=10),
    t("去年有个用户", 2, until=5),
    h("在这个套餐上，跑掉了 **几万美元** 的用量", 3, size=54),
    h("→ 逼得他们加了每周限额", 4, size=46, color="dim"),
    t("司马光说过", 5),
    h("由俭入奢易，由奢入俭难", 6, quote=True, size=58),
    h("用法一旦被撑大，就很难再缩回去", 7, size=48),
]})
S.append({"id": "salt", "name": "盐降价不会多吃-只发生在能冒出新用法的东西", "photo": "S18", "move": "in", "origin": "BC", "box": "TW", "grad": "top", "dim": 0.12, "items": [
    h("是不是所有东西降价，最后都会越花越多？", 0, size=52, color="dim", strikeAt=2, until=3),
    h("盐降价一半，你不会多吃一倍", 3, size=60),
    t("杰文斯悖论只发生在一种东西上：", 4),
    h("便宜一点，就能冒出 **新用法**", 5, size=66, sfx="impact"),
    {"type": "nums", "at": 6, "size": 72, "items": [{"value": "煤", "color": "dim"}, {"value": "流量", "color": "dim"}, {"value": "AI", "color": "gold"}]},
]})
S.append({"id": "ask", "name": "多问一句-别盯单价算总账", "photo": "S19", "move": "in", "origin": "MR", "box": {"x": 340, "y": 130, "w": 820}, "grad": "left", "items": [
    t("所以下次再看到降价", 0, until=3),
    h("~~先算能省多少~~", 1, size=50, color="dim", until=3),
    t("多问一句：", 2, until=3),
    h("便宜了以后，\n我会不会用得更多？", 3, size=66, sfx="impact"),
    h("如果会 → 别盯着单价，**算总账**", 5, size=54),
    h("一个月最多花多少，到了就停", 6, size=44, color="dim"),
    h("一件事做完一共花了多少，值不值", 7, size=44, color="dim"),
]})
S.append({"id": "worth", "name": "多花不一定坏-煤换回工业革命", "photo": "S12", "move": "out", "blur": 6, "dim": 0.5, "center": True, "items": [
    t("当然，多花的钱，也不一定是坏事", 0),
    h("当年英国人买煤越买越多", 1, size=54, color="dim"),
    h("换回来的是一整场 **工业革命**", 2, size=70, sfx="impact"),
    h("真正要看的：多花的这部分，有没有换回更多的东西", 3, size=50),
]})
S.append({"id": "back", "name": "回到10月8日-75%没让账单变薄", "photo": "S01", "move": "out", "origin": "MR", "box": "TL", "grad": "left", "ambience": "办公室", "items": [
    t("我自己打算这周", 0, until=4),
    h("把 AI 的账单拉出来，不看单价\n按一件事一件事，重新算一遍", 1, size=50, until=4),
    tag("回到 10 月 8 日早上那条新闻", 4, dark=True),
    h("那 **75%**", 5, size=76),
    h("没有让谁的账单变薄", 6, size=56),
    h("它让 AI 从偶尔问一句", 7, size=46, color="dim"),
    h("变成了一开就是 ((一千个))", 8, size=62, sfx="impact"),
]})
S.append({"id": "next", "name": "下期-AI干不了的那部分会不会更值钱", "photo": "S20", "move": "in", "blur": 6, "dim": 0.5, "center": True, "items": [
    tag("最后留个问题", 0, dark=True, delay=6),
    t("这也是我自己还在想的", 1),
    h("如果 AI 越来越便宜，谁都能用", 2, size=54, color="dim"),
    h("那它干不了、又必须有人干的那部分", 3, size=56),
    h("会不会反而越来越 **值钱**？", 4, size=72, sfx="impact"),
    tag("下期聊", 5),
]})
ep = {"ep": "ai02", "badge": "", "series": "AI经济学", "photos": "ai02/photos", "chapterPhoto": "S20", "style": style, "scenes": S}
json.dump(ep, open(os.path.join(HERE, 'photo.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
names = {s["id"]: s["name"] for s in S}
json.dump(names, open(os.path.join(HERE, 'scene-names.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
sm = json.load(open(os.path.join(HERE, 'scenemap.json'), encoding='utf-8'))
ids = set(sm.values()) - {"chapter"}
print("missing:", ids - set(names), "extra:", set(names) - ids)
