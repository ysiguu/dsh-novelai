# NovelAI V5 提示词笔记

来源：[【NAI5教程】2026最强二次元AI画图工具!｜NovelAI V5 保姆级教程](https://www.bilibili.com/video/BV1zi8R6wES1/)（17:28，全程硬字幕）。下文时间戳均可回查。

## 一、V5 相对 V4.5 到底改了什么

- **数据集**：覆盖到 2026 年 7 月（V4.5 停在 25 年 6 月），新增更多版权角色与作画风格（0:45–1:10）。
- **两个版本差异变大了**：V5 Full 母体更完整、V5 Curated 数据集更小；同一提示词在两者上"表现差异大"的概率比以往更新更高（1:40–2:00）。选错版本，后面调提示词都是白费。
- **提示词上限**：V5 Full 为 750 token（约 1220 个中文汉字 / 1090 个日文汉字 / 6000 个英文字符），约为 V4.5 的 3 倍（5:15–5:40）。
- **自然语言是最大变化**：V4.5 只能吃"提示词"，V5 能读完整句子。视频拿 pixiv 作者"九夜 恋梦"的 910 token 长文举例，同样的文本放 4.5 会明显吃不消，V5 Full 能还原氛围（6:20–7:00）。
- **tag 还有用，但只擅长静态属性**：角色、服装、构图照旧堆 tag；一旦涉及"谁对谁做了什么"，tag 就废了——"A 一边蹭掉嘴角的西瓜汁，一边转头接过 B 递来的西瓜"，用 tag 几乎画不出来，画面里两个角色基本没有互动（7:05–7:40）。

## 二、语言与画面内文字

- **写提示词的效果排序**：English ≈ 日本語 > 中文 ≈ 其他语言。中文"效果欠佳"但可用，所以推荐**英文为主、中文长句作辅助**（7:30–8:10、10:45–11:00）。
- **让文字出现在画面里**：英文/日文最好，中文差，其他语言基本生不出。做法是**用英文半角双引号把要生成的文字括起来**，模型就会照写；日文可用「」（9:00–9:30）。
- 中英混合提示词完全可行，作者自己也这么用（9:35）。

## 三、权重语法

- 写法是 `权重:词条`，逗号分隔。视频截图原样：`girl, Takamoto Tomori, 1.5:full body, looking at viewer, opened mouth,`，以及 `1.3:text, Chinese text, speech bubble. A white speech bubble with black clean text`（9:55–10:03）。
- **从 1.0 往上加，且是非线性的**：1.1→1.3 几乎没有变化，到 **1.5–1.8** 才明显，极端需求要到 2.0 甚至 3.0–4.0（10:05–10:40）。别指望 1.1 的微调。
- **混合风格时反过来**：不要每个风格词条都上 1.5–2，压到 **0.1–1.0** 区间微调，例如 `0.8:风格1, 0.2:风格2, 0.3:风格3, 0.2:风格4`，让总权重收敛（10:25–10:40）。

## 四、参数与 V5 新设置项

- 全片演示参数一致：**Steps 28 / Guidance 5.6 / Sampler Euler**（6:20、7:12、12:07 三处界面截图相同）。
- 大图预设 `42 steps | Wallpaper 大图`，一张 **62 点**（11:50–12:15）。步数直接吃点数，**先用 28 步试提示词**，满意了再上 42 步出大图。
- **Base 下拉**：V5 Full / V5 Curated（另有 Anime 模型）；负向提示词仍是原来的 Undesired content 栏，视频没有专门讲写法。
- **新词条**：年代感 `year 2026`、`retro`、`meta: novel era`、`meta: golden era`；立绘/背景 `visual novel sprite`、`visual novel background`；透明底 `transparent background` + `has alpha` + `alpha transparency`（配"导演工具–RemoveBG"效果更好，5:50–6:20）。
- **画面复杂度**（直接加在提示词最后）：`low complexity` / `medium complexity` / `high complexity` / `ultra complexity`。一般高质量插画用 **high**；low 与 ultra 属于"特殊风格化需求"，会明显改变画风和观感（11:15–11:45）。
- **风格词条可存成 chunk（preset）**，画质/光影/构图 tag 不用每次重输（5:00–5:15）。

## 五、多角色与漫画

- **Character Prompts** 在主提示词栏下方，一个角色一条，角色名要带系列名，如 `aria (series, zero, zero...)`；Position 可选 AI's choice 或 Custom（13:50–14:10）。
- 位置从 4.5 的 **5×5 网格升级为自由拖动**，拖动后必须点 **Finish Editing Positions** 才保存；画面上编号与提示词顺序一一对应（14:10–14:40）。
- 演示一次排了 6 个角色编号。

## 六、视频点名的坑

1. 用 tag 硬堆多角色互动 → 画面无互动、无氛围，必须改写成句子。
2. 想让画面出文字却用中文描述 → 中文文字生成效果差，要英文/日文并加引号。
3. 权重卡在 1.1–1.3 反复微调 → 非线性，白费力气，直接上 1.5+。
4. 混合风格时把每个风格词条都加权 → 画面糊、风格打架，应 0.1–1.0 并控制总和。
5. 多角色位置贴太近 → 身份特征互相污染（截图中红框警告）。
6. 复杂度词条当"画质开关"乱加 → low/ultra 会改画风，只有特殊风格化才用。
7. 版本没选对（Full vs Curated）就调提示词 → 差异比以往更大，先定版本。

## 七、V5 提示词模板

**1) 单人静态插画（tag 为主）**
```
1girl, solo, silver hair, blue eyes, black school uniform, standing, looking at viewer, 1.5:detailed eyes, depth of field, high complexity
```

**2) 双人互动（自然语言为主）**
```
1girl, 1boy, indoors, kitchen. She wipes the watermelon juice from the corner of her mouth with the back of her hand, then turns her head to take the slice of watermelon he is holding out to her. Warm afternoon light, medium shot.
```

**3) 画面内出文字**
```
1girl, holding a sign, text "SALE 50%", white speech bubble with black clean text, 1.3:text
```

**4) 风格混合（权重压在 0.1–1.0）**
```
0.8:<风格A>, 0.2:<风格B>, 0.3:<风格C>, 1girl, full body, outdoors, high complexity
```

**5) 多角色自由定位**
```
主体：2girls, indoors, sitting on sofa, looking at viewer, high complexity
Character 1：aria (series, zero, zero...), pink hair, ...
Character 2：sunna (series, zero, zero...), blonde hair, ...
Position：Custom → 拖动 → Finish Editing Positions
```
