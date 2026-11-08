# 上架清单（awesome-dsh-plugin）

## 1. 发布 npm

```sh
cd C:/Users/wxwwx/plugins/dsh-novelai
npm login          # 一次性，浏览器授权
npm publish        # 包名 dsh-novelai，已确认未被占用
```

## 2. 建 GitHub 仓库并推

```sh
gh repo create dsh-novelai --public --source=. --push
# 或手动建空仓库后：
git init && git add -A && git commit -m "dsh-novelai 1.0.0"
git remote add origin https://github.com/ysiguu/dsh-novelai.git
git push -u origin main
```

若用户名不是 `wxwwx`，同步改 `package.json` 的 `homepage` / `repository` 两处。

## 3. 给 awesome-dsh-plugin 提 PR

Fork `https://github.com/awesome-dsh-plugin/awesome-dsh-plugin`，改两个文件，各加一行（放在 `### Vision & Multimodal` 小节末尾，已按字母序对齐）：

**README.md**
```md
- [ysiguu/dsh-novelai](https://github.com/ysiguu/dsh-novelai) - NovelAI image generation for DSH: `nai_image` (style presets, artist strings, per-model weight rewriting, token budget warnings; results render inline), `nai_status`, and `nai_prompt` (build / check / guide), plus a studio page with live draft previews, a standalone studio server, and a prompt guide distilled from four tutorials. Bring your own `pst-` token.
```

**README.zh.md**
```md
- [ysiguu/dsh-novelai](https://github.com/ysiguu/dsh-novelai) - 把 NovelAI 生图接进 DSH：`nai_image`（画风预设、画师串、按模型自动转权重、token 预算提醒，出图直接内联显示）、`nai_status`、`nai_prompt`（build / check / guide 三个动作），外加带逐帧草稿预览的画室页面、独立 studio 和一个从四份教程里提炼的提示词手册。用自己的 `pst-` token。
```

**PR 标题**：`Add dsh-novelai — NovelAI image generation (tools + studio)`
**PR 正文**：

```md
Adds `dsh-novelai`, a plugin that brings NovelAI image generation into DSH.

- Tools: `nai_image` (generates and returns the PNG as an attachment so the model sees the result), `nai_status`, `nai_prompt` (prompt builder / linter / cheat sheet).
- UI: a studio page at `/dsh-novelai/` with parameter controls, live draft previews and history, plus a standalone `studio.mjs` server for use without DSH.
- Zero runtime dependencies; Node 20+; requires the user's own NovelAI `pst-` token. Nothing is sent anywhere except `image.novelai.net`.
- Installs with `dsh plugin --profile web add dsh-novelai`.

The repo also ships `docs/prompt-guide.md`, a prompt reference distilled from four Chinese NovelAI tutorials (style reproduction, V5 specifics, character reference, Anlas accounting).
```
