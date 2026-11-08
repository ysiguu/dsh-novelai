# NovelAI 4.5 Full 提示词体系笔记

> 来源：B 站《【NAI入门教程】从零开始 60 分钟掌握最强二次元 AI 画图工具｜NovelAI 4.5 Full（2025）》
> https://www.bilibili.com/video/BV1TeMbzwExw/ （61 分钟，7 章：准备工作 / 总览 / 提示词 / 高级设置 / 多角色 / 工具箱 / 氛围转移）
> 视频无字幕轨，本笔记基于音轨转写 + 关键画面核对，数字可在括注时间点复核。

## 一、模型与额度

- 4.5 分 **Full（完整版）** 与 **Curated（精选版）**：Curated 训练集不含 NSFW、也画不出，Full 无限制且功能更全，但"不代表效果一定更好"（06:49–07:10）。
- 角色知识库覆盖到 **2025 年 6 月** 前有概念的角色（14:34）。
- 正面提示词（Base + 角色提示词）合计上限 **512 token ≈ 380 英文单词**；负面（Undesired Content + 负面角色提示词）另算 **512 token**（07:28–08:01）。
- 勾选 `Quality tags enabled` 时自动补 **16 token** 通用质量词（07:45）。

## 二、提示词结构与书写顺序

两类写法：**词条式**（逗号分隔 tag）与**自然语言式**（4.5 已能还原"红立方体上方放蓝立方体、绿球紧贴左侧"这类空间关系）。

推荐九段式顺序（13:32–13:50，作者强调非强制，但有助于思路组织与稳定性）：

1. 艺术家与风格
2. 角色数量与性别（one girl / two characters…）
3. 角色身份与性质（角色名 + 作品名，可直接调用知识库）
4. 身体特征
5. 服装与配饰
6. 动作与表情
7. 环境与背景
8. 光影与视角
9. 整体风格

关键取舍：**角色名写对后，4–6 段可大幅省略**（16:49）；只有冷门角色才需要堆外观 tag。

角色提示词写法（14:54–16:40）：

- 格式 `角色名 (作品名)`，可选中间插 `(皮肤/外观名)`；角色名与作品名必须拼写完全正确，大小写不敏感。
- 含空格的人名、多词作品名必须用**空格或下划线**隔开；括号推荐半角。
- 只认 ASCII 基本拉丁字符：带变音符号的名字要改写成无变音拼写，否则识别不到。

## 三、权重语法

- **花括号**：`{tag}` = ×1.1，`[tag]` = ×0.9，可叠加。
- **数字权重**（4.5 新增）：`1.2::tag::`，tag 前后各两个**半角**冒号，最前面的冒号前写数字；全角无效。
  - 不写结尾 `::` 时，数字会一直作用到后面的所有 tag，直到结束。
  - 批量给一段 tag 同权重：`1.4::tagA, tagB, tagC::`。
  - 以数字结尾的 tag（如 `z3z4`）后紧跟 `::` 会被误读为新权重开头，需在 tag 末尾补 `_`、逗号或空格（19:11–19:48）。

颜色提示：增强=红、降低=蓝、数字权重范围=绿（前提是没在齿轮里关掉"强调权重"）。

**去色实验**（20:00–20:50）：给 colorful 逐级加权 1.0 → 2.0 → 4.0/8.0，画面逐步失彩直至全灰。8 倍若用 `{}` 要 **22 个**（≈1.1²²≈8），2 倍要 7 个（≈1.95）。等价写法：正面 `-8::colorful::` 或负面 `8::colorful::`。

但权重是**非线性映射**，不是数字越大越听话；实战建议集中在 **1.0–2.0**（20:54–21:09）。

实战示例（21:15–23:40）：`one girl` 2 倍防多余角色、角色身份 1.5 倍；"头发遮一只眼"给 **0.8** 防遮过头；"白色灯笼裤"给 2 倍却连带把构图改成回头侧身——该 tag 在训练集常与俏皮回望构图同现，**暗含构图影响的词比直白构图词更强势**；`white background` 加到 3–8 倍也只影响背景，因为它是条件信息而非画面主体。锁上半身用 `3.5::upper body close-up::`，同时删掉上半身看不到的服饰 tag。

## 四、强度 Power 与引用数 Frequency

- **Power**：模型训练中自然学到的默认强度；手写权重只是在其上放大/抑制。
- **Frequency**：tag 在 Danbooru 类图站的作品数，越高通常越强。
- 对照（24:22–24:52）：初音未来（2007，87,401）Power 已封顶 **10000**；白上吹雪（2019，688）约 5200；25 年 6 月新角色（28）仅约 200。
- 关系近似**对数**：引用 10→1000 提升明显，2000→3000 几乎平坦，约 **3000 引用即触顶**（25:23–25:47）。
- 推论：新角色 tag 强度低 → 五官发型易漂、一致性差，多角色同框更易被污染。估算方式：Danbooru 查引用数（1girl 650 万、2girls 170 万），再用 NAID Tag Search 查相邻引用数对应的强度（该站 2024 年后停更）。

## 五、画面内文字

Base Prompt 写完后**空一行（Shift+Enter，直接回车会触发生成）**，再用大写 `Text:` 跟文字；配合 `text`、`english text` 生效。多条文字必须改用自然语言交代"谁说哪句、什么颜色、什么气泡"，且只有第一段前写 `Text:`（26:51–29:40）。

## 六、角色提示词（多角色）

- 工作区下滑 → `Character Prompts` → 新增并选性别，**最多 6 个**；与基础提示词**共享 512 token**，风格仍受基础提示词影响（38:01–38:41）。
- 基础提示词只写：艺术家与风格、**精确角色数量**、环境背景、光影视角、整体风格；性别、身份、外观、服装、动作写进各角色栏（39:03–39:41）。
- 位置：默认 `Character Positions Global` 交给 AI，关掉后可手动指定 **5×5 = 25 格**（横 A–E、纵 1–5，原点左上）。示例角色 1 在 B3、角色 2 在 D3。
- 排布建议：角色周围 8 格别再放人（否则属性重叠、风格混合）；边缘格易被裁切；方图放中间 9 格，竖图 B1–D5，横图 A2–E4（41:24–41:59）。
- **互动标签**（42:02 起，最实用）：施动方 `source:动作`，受动方 `target:同一动作`；双向同动作写 `mutual:动作`，比两边都写 `imitate pose` 更准。要肢体接触就把两人放相邻或同格（都在 C3）；cosplay 换装必须同坐标，且主提示词写 `one girl` / `one character`。

## 七、负面提示词与质量词

- 负面区即 `Undesired Content`，与负面角色提示词共享 512 token；界面有**预设**可选，作者建议"按需调预设，其余保持默认"（08:16–08:29）。
- 视频**没有给固定必备清单**，实际做法是：默认开 `Quality tags enabled`（自动 16 token 质量词）+ 用预设打底，再按出图问题追加；展示案例的负面提示词超过 300 token（30:17 画面注释）。
- 正负互补：压某词可正面 `-8::tag::`，也可负面 `8::tag::`（20:40）。
- 质量词实际形态：`quality, very aesthetic, absurdres, masterpiece, best quality`。
- 画师 tag 放最前，一两个画师名就能替代大段外观/风格描述，是省 token 的主要手段（13:34、16:52）。

## 八、参数与推荐值

| 参数 | 视频结论 |
|---|---|
| Steps | 默认 **23**；推荐 **23–28**；1–22 效果不佳，29–50 只涨点数（31:10–31:18） |
| Prompt Guidance | 默认 **5**；调低=提示词整体变弱、风格变差；调到 10 严重失真（32:00–33:30） |
| Variety+ | 控制 AI 主动发挥，与 Guidance 的"听不听话"是两件事 |
| Prompt Guidance Rescale | 能救高 Guidance 崩坏（10→0.6 回正常），但作者**不推荐**（34:22–34:49） |
| Sampler / Noise Schedule | 影响很小，保持默认（Euler Ancestral）（34:54–35:12） |
| Seed | 同提示词+同 seed ≈ 同图；换提示词同 seed = 构图相似、内容不同 |
| 分辨率 | 832×1216（竖）/ 1024×1024（方）/ 1216×832（横）；**长宽乘积 < 约 108 万像素**时最高档会员免费（36:37、51:12），手动改尺寸自动按 32/64 对齐 |
| 尺寸档 | Normal 20 点 / Large 30 / Wallpaper 40 / Small 8（09:01） |

## 九、视频里可直接抄的示例

1）权重骨架（21:15 起的结构）：`2::one girl::, 1.5::角色名 (作品名)::, 0.8::hair over one eye::, 2::white bloomers::, looking back, 3::white background::`
2）锁上半身：`3.5::upper body close-up::`，并存删所有下半身服饰 tag。
3）全灰实验：正面 `8::colorful::` 或负面 `8::colorful::`；等价 22 个 `{}`。
4）多角色互动：基础 `2girls, ...`；角色 1 `source:holding clothes`，角色 2 `target:holding clothes`。
5）展示案例元数据（30:17 画面，他人授权作品，仅供风格参考）：
`quality, very aesthetic, absurdres, masterpiece, 1.4::flat color, red skin, dark skin::, shiny skin, dark theme, simple background, thick thighs, thick calves::, 1::1girl, solo, {alternate costume}, {{{blurred foreground}}}::, head down, look down, newsboy cap, blouse, overcoat, shy, crossbody bag, one hand on cup, street, blurry background, pants, wind, crowd, hand in pocket, from above, falling leaves, red leaf, no text, best quality, very aesthetic, absurdres`（STEPS 50 / GUIDANCE 5 / 2176×1408）

## 十、通用模板

1）**单人立绘（最通用）**
正面：`best quality, very aesthetic, absurdres, 1girl, 角色名 (作品名), solo, looking at viewer, upper body, simple background, depth of field, 画师名`
负面：`lowres, bad anatomy, bad hands, extra digits, worst quality, low quality, jpeg artifacts, signature, watermark, username, blurry`

2）**半身特写（锁构图）**
正面：`1girl, solo, 1.2::角色名 (作品名)::, 3.5::upper body close-up::, looking at viewer, from above, 1.5::blurry background::, 画师名, best quality`
负面：`full body, legs, wide shot, lowres, bad hands, extra fingers, watermark, text`

3）**双人同框（防污染）**
基础：`2girls, outdoors, cinematic lighting, 画师名, best quality`
角色1（C3）：`1girl, 角色A (作品A), source:holding hands`
角色2（C4）：`1girl, 角色B (作品B), target:holding hands`
负面：`3girls, multiple girls, character fusion, extra limbs, lowres, watermark`

4）**画面带字**
正面：`1girl, solo, holding pillow, best quality`（空行）`Text: LOVE`，配合 `text, english text, pink cursive text`
负面：`extra text, watermark, cropped text, lowres, bad hands`

5）**风格统一（一组图复用）**
正面：`best quality, very aesthetic, {画师A}, {画师B}, 1girl, solo, upper body, warm lighting, film grain, no text`
负面：`lowres, worst quality, blurry, oversaturated, watermark, signature, text`
