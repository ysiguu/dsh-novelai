# dsh-novelai

把 NovelAI 生图接进 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)：三个 agent 工具 + 一个画室页面 + 一套从四个中文教程里提炼的提示词知识库。

用自己的 NovelAI token，除了 `image.novelai.net` 之外什么都不往外发。

## 有什么

| | |
| --- | --- |
| `nai_image` | 给提示词出图，PNG 存盘并作为图片附件返回（模型能看见自己画了什么）。支持 `style` 画风预设、`artist` 画师串、`enhance`（按模型自动转权重写法、补质量词、补负面、超预算提醒）。 |
| `nai_status` | 档位、到期时间、用量。 |
| `nai_prompt` | `build` 拼提示词、`check` 体检（权重写法/括号/模型语法/token 预算）、`guide` 出心法。 |
| 画室页面 | `http://127.0.0.1:<端口>/dsh-novelai/`，参数面板、逐帧草稿、历史、下载。 |
| 独立 studio | `node studio.mjs` → `http://127.0.0.1:4173/`，不依赖 DSH。 |

## 安装

```sh
dsh plugin --profile web add dsh-novelai
# 重启 DSH，然后打开 http://127.0.0.1:3080/dsh-novelai/
```

手动装：把 `"dsh-novelai": "^1.0.0"` 同时加进 profile 的 `package.json` 依赖和 `dsh.profile.bundles`，再 `pnpm install`。

## 配置

页面右上角「设置」里粘 token（`pst-` 开头），或直接写 `~/.dsh/novelai.json`：

```json
{
  "apiKey": "pst-...",
  "proxy": "",
  "outDir": "",
  "model": "nai-diffusion-4-5-full",
  "width": 832,
  "height": 1216,
  "steps": 28,
  "scale": 5,
  "sampler": "k_euler_ancestral"
}
```

- `proxy`：直连就留空；墙内填本地代理，如 `http://127.0.0.1:7890`。也可用环境变量 `NAI_API_KEY` / `NAI_PROXY`。
- `outDir`：留空 = `~/nai-output`。
- token 明文存在家目录的 JSON 里（和 DSH 自己的配置同一个地方），别提交进仓库。

## Anlas：什么免费

Opus 的「不限量」只覆盖免费档：单张、≤28 步、约 1MP 以内。

- 832×1216 / 28 步 / 1 张 → 免费
- 30 步、1216×1216、`n=4` → 扣费；402 就是余额不够
- V5 标准尺寸 → 同样免费
- 角色参考 / 氛围迁移 → 另外计费

**不花钱看余额**：发一个必然超额的请求（如 1216×1216），402 的 body 里有 `Required: X, Available: Y`。

## 注意

- 同账号同时只能跑一个任务，第二个会 429，等约 15 秒。
- V4/V4.5 必须带 `v4_prompt` / `v4_negative_prompt`，插件已经替你拼好。
- 提示词手册在 [docs/prompt-guide.md](docs/prompt-guide.md)：画风复现、V5、角色参考、Anlas 账、参考图 API。
- 参考图（Character Reference / Vibe Transfer）**尚未实现**。

## 许可

MIT
