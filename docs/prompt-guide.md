# NovelAI 提示词手册（本地笔记）

> 来源：B 站三套教程（画风复现 8min / NAI5 教程 17min / 4.5 Full 入门 61min）。
> 由视频内容整理，可直接给 `nai_image` 当参照，也是 `nai_prompt` 工具的知识源。

---

## 一、复现画风（BV1n9MM6mE29 · 8 分钟教程）

### 1. 提示词是一条五段链，顺序即优先级

画师串 → 画风/技法词 → 光线与色调 → 通用质量词 → 人物·动作·场景。
换画风改前两段，换构图改最后一段。

```
[[[artist:bafu]]], [[artist:ritzchrono]], [[artist:wagashi (dagashiya)]],
thick coating, colorful lines,
photorealistic, cinematic lighting, volumetric lighting, orange theme, warm light,
best quality, amazing quality, very aesthetic, highres, incredibly absurdres,
year 2024, location, 1girl, solo, 角色名, bare shoulders, standing, street, depth of field
```

### 2. 复现某种画风的四条抓手

1. **画师串**：堆 `artist:名字`，是控制画风的主力（二次元模型尤其明显）。
2. **作品名 + `official art`**（最省力）：
   - 碧蓝档案：`4::blue archive game cg::` + 角色画师名，**必须写 `no halo`**，否则自带光环；
   - 咒术回战：`official art, 1.4::jujutsu kaisen::, anime illustration`；
   - 同套路：`chainsaw man` / `kimetsu no yaiba` / `sousou no frieren`；
   - 加强公式：`official art, anime illustration, anime screencap, anime coloring, anime drawings` 五件套同写效果更好。
3. **媒介/技法词**：决定"画法"而不是"谁画的"（见第 5 节词表）。
4. **权重补偿**：模型之间差异大，没跑出来就适当加权重；再不行才考虑 Lora。

### 3. 权重写法（三种，片中实测）

- `N::内容::` —— 数字夹在内容两侧：`4::blue archive game cg::`（强押作品名，全片最大）、`1.4::jujutsu kaisen::`、`1.5::amazing quality::`、`1.5::masterpiece::`
- `(内容:1.2)` —— 括号内冒号数字，给作品归属加权：`amiya (arknights:1.2)`
- `(1.75::整体..., 1.8::realistic, ...)` —— 一对括号给整组统一加权，组内还能叠 `(medium)` 软强调

规律：画风/画质微调 **1.2–1.8**；要把作品名死死按住才上 **4**。

### 4. 负向 vs 反向写法

片中没有给负向模板，但明确：想要分镜就正向写 `multiple views`，**别写进负面**。
同理 `no halo` / `no text` / `no lineart`：缺什么就用 `no xxx` 在**正向**补。

### 5. 画风词表

| 风格 | 词 |
| --- | --- |
| 平涂 | `flat color`、`clear lines`、`sharp outlines` |
| 线条 | `lineart`、`thick lineart`/`thick lines`、`thin lines`、`colored lineart`/`colorful lines` |
| 厚涂 | `thick coating`、`no lineart`（去掉轮廓线）、`cinematic lighting`、`faux traditional media` |
| 油画 | `oil painting (style)`、`brush strokes`、`palette knife`、`canvas texture`/`traditional media` |
| 素描线稿 | `sketch`、`pencil sketch`、`rough sketch`、`crosshatching`、`greyscale`、`monochrome` |
| 3D/写实 | `3d`、`blender (medium)`、`realistic`、`photorealistic`、`photo (medium)`、`detailed skin`、`detailed texture`、`figure stage`；`nendoroid` 出粘土小人，`photo background` 出真背景 |
| 像素 | `pixel`/`pixel art` + `warm light, bokeh, cozy, nostalgic, fantasy, whimsical, miniature`；`pixel art_minecraft_角色名` = MC 皮肤写法 |
| 漫画 | `sound effect`（音效字）、`multiple views`（分镜） |
| Q版 | `chibi only`，前面照常放 `official art, game cg, anime illustration` 与画师词 |

### 6. 三个坑

1. 像素风尽量别用画师串（除非那位画师本来就画像素），否则是"高分辨率的假像素"。
2. 碧蓝档案角色不写 `no halo` 会带光环。
3. 模型不对权重白搭：同一串词换 SDXL / anima 表现完全不同。

### 7. 可直接用的模板

**厚涂二次元（V4.5）**

```
[[[artist:画师1]]], [[[artist:画师2]]], thick coating, colorful lines,
photorealistic, cinematic lighting, volumetric lighting, warm light, orange theme,
best quality, amazing quality, very aesthetic, highres, incredibly absurdres,
year 2024, location, 1girl, solo, 角色名, upper body, standing, street, depth of field
```

**作品名复现（碧蓝档案）**

```
official art, 4::blue archive game cg::, 画师名, anime illustration, anime coloring,
best quality, amazing quality, very aesthetic, highres, incredibly absurdres,
1girl, solo, 角色名, no halo, standing, depth of field
```

**像素风**

```
1girl, solo, 1.5::masterpiece::, 1.5::amazing quality::, year 2025,
pixel art, warm light, depth of field, bokeh, cozy, nostalgic, fantasy, whimsical,
miniature, detailed, no text, 角色名 (作品名:1.2), upper body, best quality, highres
```

**3D 手办/真实感**

```
[[[artist:画师1]]], [[[artist:画师2]]],
(1.75::3d, blender (medium), 1.8::realistic, photorealistic, cartoon rendering,
photo (medium), detailed skin, detailed texture, figure stage, nendoroid),
solo, full body, white background, simple background,
(best quality, amazing quality, very aesthetic, highres, incredibly absurdres)
```

**素描线稿**

```
sketch, pencil sketch, rough sketch, crosshatching, greyscale, monochrome,
lineart, thick lineart, best quality, highres, 1girl, solo, 角色名, upper body
```

---

## 二、V5 要点（BV1zi8R6wES1 · 17 分钟教程）

### 1. V5 和 V4.5 的差别

- 数据集到 2026-07（4.5 停在 25-06），版权角色与画风更多。
- **提示词上限 750 token**（约 1220 汉字 / 1090 日文汉字 / 6000 英文字符），约 4.5 的 3 倍。
- **自然语言是最大变化**：长句能还原互动与氛围；tag 只擅长静态属性（角色、服装、构图）。
  "A 蹭掉嘴角的西瓜汁、转头接过 B 递来的西瓜" 这种，用 tag 画不出互动，必须写成句子。
- Full 与 Curated 差异比以往更大，先定版本再调词。

### 2. 语言与画面内文字

- 效果排序：English ≈ 日本語 > 中文 ≈ 其他。
- 要让文字出现在画面里：用**英文半角双引号**把文字括住（日文可用「」），中文生成效果差。
- 中英混合完全可行。

### 3. 权重

- 写法 `权重:词条`，如 `1.5:full body`。
- **非线性**：1.1→1.3 几乎无感，1.5–1.8 才明显，极端 2.0–4.0。
- **混合风格反过来压**：`0.8:风格A, 0.2:风格B, 0.3:风格C`，让总权重收敛。
- 对照：V4.5 的等价写法是 `1.5::full body::` 或 `(full body:1.5)`。

### 4. 参数与 V5 新词条

- 全片参数：**Steps 28 / Guidance 5.6 / Sampler Euler**。
- 大图预设 `42 steps | Wallpaper`，一张 62 点；先 28 步调词，满意再上 42 步。
- 年代感：`year 2026`、`retro`、`meta: novel era`、`meta: golden era`。
- 立绘/背景：`visual novel sprite`、`visual novel background`。
- 透明底：`transparent background` + `has alpha` + `alpha transparency`（配 RemoveBG）。
- 画面复杂度（加在最后）：`low / medium / high / ultra complexity`，一般用 **high**；low/ultra 会改画风。

### 5. 多角色

- Character Prompts 每个角色一条，角色名带系列名（`aria (series, ...)`）。
- 位置从 4.5 的 5×5 网格升级为**自由拖动**，拖完必须点 Finish Editing Positions。
- 角色别贴太近，否则特征互相污染。

### 6. 七个坑

1. tag 硬堆多角色互动 → 没有互动与氛围，改写句子。
2. 想生成中文文字 → 改用英文/日文并加引号。
3. 权重卡在 1.1–1.3 反复微调 → 白费，直接 1.5+。
4. 混合风格每个词都加权 → 画面糊，压到 0.1–1.0 并控总和。
5. 多角色位置太近 → 特征污染。
6. 复杂度词当画质开关 → 只有特殊风格化才用。
7. 没定 Full/Curated 就调词 → 差异比以往大。

### 7. 模板

**单人静态（tag 为主）**

```
1girl, solo, silver hair, blue eyes, black school uniform, standing, looking at viewer, 1.5:detailed eyes, depth of field, high complexity
```

**双人互动（自然语言为主）**

```
1girl, 1boy, indoors, kitchen. She wipes the watermelon juice from the corner of her mouth with the back of her hand, then turns her head to take the slice of watermelon he is holding out to her. Warm afternoon light, medium shot.
```

**画面内出文字**

```
1girl, holding a sign, text "SALE 50%", white speech bubble with black clean text, 1.3:text
```

**风格混合**

```
0.8:<风格A>, 0.2:<风格B>, 0.3:<风格C>, 1girl, full body, outdoors, high complexity
```

**多角色**

```
主体：2girls, indoors, sitting on sofa, looking at viewer, high complexity
Character 1：aria (series, ...), pink hair
Character 2：sunna (series, ...), blonde hair
```

---

## 三、角色参考 Character Reference（V4.5 专用）

> 素材：B 站《一张图训练 LoRA 绘制自己喜欢的角色｜NovelAI 4.5 角色参考》（13 分钟）。

**先破个误会**：它不训练、不出 LoRA 文件、没有触发词。每次生成时由内部模型现场看图 → 抽外观向量 → 注入采样。好处是一张图即改即用，代价是**每次都重新分析**。

**入口**：图片页 → 模型选 `V4.5 Full`（Curated 也行）→ 提示词框下面 `Character Reference` → 拖图进槽位。面板里 `Style Aware` 默认勾选，**导入参考图后关掉它**；不导图时保持默认即可。

**选图规范**（照做成功率最高）

- 单人、无复杂背景（透明 PNG 也行）、别闭眼、人物尽量完整；
- 分辨率落在 **1024×1536 / 1472×1472 / 1536×1024**；
- 构图对齐：要出半身，就只喂半身立绘；
- 想要多层特征可以多槽位：全身锁体型、上半身锁服装、刘海特写锁发型。

**计费（很关键）**

- 一次性导入 **+2 Anlas**；
- **每次生成 +5 Anlas**（基础费另算）；
- 是「每次生成」不是「每次导入」，最高档会员也照扣。

**显性 vs 隐性**

- 参考图只给「看得见」的：发色、发型、瞳孔、服装；
- 表情、年龄、材质、习惯这类看不见的，写进角色提示词；
- 主提示词里的风格词压太重，会把参考图的瞳孔、发丝细节吃掉。

**多角色**

- 右侧 `Character Prompt` → `Add a Character`，每个角色一个槽，槽 1 对应参考图 1；
- 主提示词只写场景和构图，两个角色各写特征，**尽量别写共享词**（`two girls`、同一风格词都会串味）；
- 串了就删共享词；要极致准，先单独生成单人图，再用 inpaint 修。

**五条操作清单**

1. 一张干净图：单人 / 无复杂背景 / 不闭眼 / 尺寸合规 / 构图对齐；
2. 导图前关 `Style Aware`，主提示词别压重风格；
3. 参考图管显性，角色提示词补隐性；
4. 多角色走 Character Prompt，槽位一一对应，串味就拆共享语境；
5. 算钱：17 Anlas 的号，导入 1 张（2）+ 生成 3 次（15）就到顶了。

---

## 四、Anlas 怎么扣（实测速查）

Opus 的「不限量」只覆盖**免费档**：单张、≤28 步、约 1MP 以内。超出就按 Anlas 扣，余额不够直接 402。

| 操作 | 实际情况（2026-11 实测） |
| --- | --- |
| 832×1216 / 28 步 / 1 张 | 免费 |
| 1024×1024 / 28 步 / 1 张 | 免费 |
| 832×1216 / **30 步** | 402（要额度） |
| 1216×1216（1.48MP） | 402，Required 44 |
| 832×1216 / n=4 | 402，Required 90 |
| V5 标准尺寸 28 步 | **免费**（余额不变） |
| 角色参考 | 导入 +2，之后**每次生成 +5** |
| 氛围迁移 Vibe Transfer | encode-vibe 单独计费，另加每次生成 |

**不花钱看余额**：发一个必然超额的请求（如 1216×1216），402 的 message 里会写 `Required: X, Available: Y`，不扣钱。

**并发**：同一账号同时只能跑一个任务，再发就是 429 `Concurrent generation is locked`，等 15 秒自动解锁。

---

## 五、V4.5 全套参数（BV1TeMbzwExw · 61 分钟课）

> 无字幕轨，本地 whisper 转写 + 画面核对，数字都带时间戳可复核。

**预算**：正面 Base + 角色提示词合计 **512 token（≈380 英文词）**，负面另算 512。V4.5 知识库到 2025 年 6 月。Quality tags 勾上会自动补 16 token 质量词（`quality, very aesthetic, absurdres, masterpiece`）。

**九段式顺序**（非强制，但好用）：①画师与风格 ②人数与性别 ③角色名（作品名）④外观 ⑤服装 ⑥动作表情 ⑦环境 ⑧光影视角 ⑨整体风格。角色名写对后，4–6 段能省一大半。
角色写法：`角色名 (作品名)`，只认 ASCII、大小写不敏感，多词用空格或下划线；带变音符号要改写。

**权重**：`{tag}`×1.1、`[tag]`×0.9、数字 `1.2::tag::`（前后各两个半角冒号，全角无效）。不写结尾 `::` 会一路作用到后面所有词条；批量同权重 `1.4::tagA, tagB::`；以数字结尾的 tag 要补 `_` 或逗号避免误读。实战区间 1.0–2.0；等价：正面 `-8::colorful::` ≡ 负面 `8::colorful::`。

**Power / Frequency**：Power 是模型自己学到的默认强度，随 Danbooru 作品数增长（初音 87k 引用→封顶，白上吹雪 ~5200，2025 年新角色 ~200），大致对数，~3000 引用触顶。新角色强度低 → 五官易漂，多角色容易串。

**画面内文字**：写完 Base 空一行（Shift+Enter），大写 `Text:` 开头跟内容，再补 `text, english text`。多句用自然语言说清谁说哪句，只有第一段前写 `Text:`。

**多角色**：Character Prompts 最多 **6** 个，与基础提示词共享 512 token。基础词只写风格/人数/环境/光影，性别身份服装动作写角色栏。位置默认交 AI；关掉 Character Positions Global 后用 **5×5=25 格**（A–E × 1–5，原点左上）。周围 8 格别放人，边缘易裁。互动标签：`source:动作` / `target:同一动作` / `mutual:动作`；肢体接触放相邻或同格。

**参数**：Steps 默认 23，推荐 23–28（29+ 只涨点数）；Guidance 默认 5（调高到 10 会崩，低了整体变弱）；Sampler/Noise Schedule 影响小，保持 Euler Ancestral；同提示词同 seed ≈ 同图；尺寸档 Normal 20 点 / Large 30 / Wallpaper 40 / Small 8，长宽乘积 < 约 108 万像素落在免费档。

---

## 附录：参考图在 API 上怎么传（2026-11 反向核对）

两种完全不同的机制，别混：

| | 精准参考 / 角色参考 | 氛围迁移 Vibe Transfer |
| --- | --- | --- |
| 支持模型 | **仅 V4.5**（`nai-diffusion-4-5-full/curated`） | V4 / V4.5（**V5 不支持**） |
| 端点 | `POST /ai/generate-image` 走 multipart | 先 `POST /ai/encode-vibe` 拿 1.4MB 级编码，再 `POST /ai/generate-image` JSON |
| 字段 | `director_reference_*` 一组 | `reference_image_multiple` / `reference_information_extracted_multiple` / `reference_strength_multiple` |
| 计费 | 生成费 | encode-vibe 单独计费（同图同模型可缓存复用） |

**精准参考的字段形状（逆向自官方客户端 HAR）**

- JSON 里 `director_reference_images_cached = [{ cache_secret_key: <sha256(图片字节)hex>, data: "director_ref_0" }]`
- 图片本体是 multipart 的二进制部件，字段名 `director_ref_0`、`director_ref_1`…
- `director_reference_descriptions = [{ caption: { base_caption: "character" | "style" | "character&style", char_captions: [] }, legacy_uc: false }]`
- `director_reference_strength_values` = 强度（0–1，UI 的 Fidelity 取反后进 `director_reference_secondary_strength_values = 1 - fidelity`）
- `director_reference_information_extracted = 1`，`normalize_reference_strength_multiple = true`
- 图片要先预处理成官方三种尺寸之一（1024×1536 / 1472×1472 / 1536×1024）：等比缩放后**白底补边**，不裁切。

⚠️ 只在 JSON 里塞 `director_reference_images: [base64]` 会被服务端**静默忽略**（不报错也不生效），这是很多第三方工具"开了参考却没效果"的原因。

**本插件的现状**：`nai_image` 暂不支持参考图；需要角色一致性时，走本地参考图 + 官方网页，或后续再给插件加 multipart 上传。
