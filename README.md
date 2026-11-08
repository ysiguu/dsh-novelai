# dsh-novelai

NovelAI image generation inside [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — three agent tools, a full studio page, and a prompt knowledge base distilled from four Chinese NovelAI tutorials.

Bring your own NovelAI API token. Nothing is sent anywhere except `image.novelai.net`.

## What you get

| | |
| --- | --- |
| `nai_image` | Generate an image from a prompt. The PNG is saved and returned as an image attachment, so the model actually sees what it drew. Supports `style` presets (厚涂/平涂/水彩/油画/素描/线稿/像素/3D/Q版/漫画/立绘), `artist` strings (`[[[artist:name]]]`), and `enhance` (auto weight notation per model, quality tags, default negative, token budget warnings). |
| `nai_status` | Subscription tier, expiry, usage. |
| `nai_prompt` | `build` a prompt from subject/style/artist/scene, `check` an existing one (weight notation, brackets, V4.5 vs V5 syntax, token budget), or `guide` for the cheat sheet. |
| Studio page | `http://127.0.0.1:<port>/dsh-novelai/` — parameters, live draft previews, history, download. |
| Standalone studio | `node studio.mjs` → `http://127.0.0.1:4173/`, no DSH required. |

## Install

```sh
dsh plugin --profile web add dsh-novelai
# restart DSH, then open http://127.0.0.1:3080/dsh-novelai/
```

Or manually: add `"dsh-novelai": "^1.0.0"` to your profile's `package.json` dependencies **and** to `dsh.profile.bundles`, then `pnpm install`.

## Configure

Click **设置** on the studio page and paste your NovelAI token (starts with `pst-`), or write `~/.dsh/novelai.json` yourself:

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

- `proxy` — leave empty for a direct connection. If you are behind the GFW, point it at your local HTTP proxy, e.g. `http://127.0.0.1:7890`. Environment overrides: `NAI_API_KEY`, `NAI_PROXY`.
- `outDir` — empty means `~/nai-output`.
- Tokens are stored in plain JSON under your home directory. That is the same place DSH keeps its own config; do not commit it.

## Anlas: what is free

Opus is unlimited **for the free tier only**: one image, ≤28 steps, up to about 1 MP.

- 832×1216 at 28 steps, 1 image → free
- 30 steps, or 1216×1216, or `n=4` → charged, and a 402 means your balance cannot cover it
- V5 at standard size → also free
- Character Reference / Vibe Transfer → charged separately (reference import + per generation)

You can read your balance for free: send a request that is certain to exceed it (e.g. 1216×1216); the 402 body reports `Required: X, Available: Y`.

## Notes

- One generation at a time per account; a second concurrent request returns 429 for ~15 s.
- V4/V4.5 models require `v4_prompt` / `v4_negative_prompt`; this plugin builds them for you.
- The bundled knowledge base ([docs/prompt-guide.md](docs/prompt-guide.md)) covers style reproduction, V5 specifics, character reference, Anlas accounting, and the precise-reference API shape.
- Reference images (Character Reference / Vibe Transfer) are **not** implemented yet.

## License

MIT
