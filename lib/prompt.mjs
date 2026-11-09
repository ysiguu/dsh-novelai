// NovelAI 提示词知识库 + 组装/体检。语料来自三套中文教程（见 docs/prompt-guide.md）。
// 零依赖，纯函数。

export const QUALITY = 'best quality, amazing quality, very aesthetic, highres, incredibly absurdres';
export const QUALITY_HI = 'masterpiece, best quality, amazing quality, very aesthetic, highres, incredibly absurdres, year 2025';

export const NEG_V45 = 'lowres, bad anatomy, bad hands, extra digits, fewer digits, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name';
export const NEG_V5 = 'lowres, worst quality, low quality, bad anatomy, bad hands, extra digits, jpeg artifacts, watermark, signature, blurry';

// 画风预设：tags 直接拼进正向；warn 会在结果里提示；artist 表示该风格适合堆画师串
export const STYLE_PRESETS = {
  '厚涂': { tags: ['thick coating', 'colorful lines', 'cinematic lighting', 'volumetric lighting', 'detailed shading'], artist: true, tip: '画师串 + thick coating 是厚涂主力' },
  '平涂': { tags: ['flat color', 'clear lines', 'sharp outlines'], artist: true, tip: '要更"动画感"可加 anime coloring / anime screencap' },
  '水彩': { tags: ['watercolor (medium)', 'soft colors', 'paper texture', 'traditional media'], artist: true, tip: '配 faux traditional media 更像手绘' },
  '油画': { tags: ['oil painting (style)', 'brush strokes', 'palette knife', 'canvas texture'], artist: true, tip: '' },
  '素描': { tags: ['sketch', 'pencil sketch', 'crosshatching', 'greyscale', 'monochrome', 'lineart'], artist: true, tip: '想保持黑白就别写彩色光效词' },
  '线稿': { tags: ['lineart', 'monochrome', 'white background', 'simple background'], artist: true, tip: 'thick lineart 线条更粗、thin lines 更细' },
  '像素': { tags: ['pixel art', 'warm light', 'bokeh', 'cozy', 'nostalgic', 'fantasy', 'whimsical', 'miniature', 'no text'], artist: false, tip: '像素风不要堆画师串，否则是"高分辨率假像素"' },
  '3D': { tags: ['3d', 'blender (medium)', 'realistic', 'photorealistic', 'detailed skin', 'detailed texture'], artist: true, tip: '加 figure stage / nendoroid 可出成手办' },
  'Q版': { tags: ['chibi only', 'official art', 'game cg', 'anime illustration'], artist: true, tip: 'chibi only 放开头更稳' },
  '漫画': { tags: ['multiple views', 'sound effect', 'anime screencap', 'monochrome'], artist: true, tip: '分镜写正向 multiple views，别写进负面' },
  '立绘': { tags: ['visual novel sprite', 'transparent background', 'has alpha', 'alpha transparency', 'full body', 'standing'], artist: true, tip: '这是 V5 词条；配 RemoveBG 更干净' },
};

export const WEIGHT_RULES = {
  v4: '1.2::tag:: 或 (tag:1.2)；1.1–1.3 几乎看不出，明显要 1.5–1.8，极端 2.0–4.0',
  v5: '1.5:tag（单冒号）；同样非线性，1.5–1.8 起效；混合风格反过来压 0.1–1.0',
};

export function isV5(model) {
  return /^nai-diffusion-5(-|$)/.test(String(model || '').trim());
}

// 把 V4 的 1.5::tag:: 与 V5 的 1.5:tag 互转
export function normalizeWeights(text, model) {
  if (isV5(model)) {
    return text.replace(/(\d+(?:\.\d+)?)::(.*?)::/g, '$1:$2');
  }
  return text.replace(/(^|[,，]\s*)(\d+(?:\.\d+)?):([^:\n,，]+)(?=[,，]|$)/g, (m, pre, w, t) => `${pre}${w}::${t.trim()}::`);
}

export function buildPrompt(opts = {}) {
  const { subject = '', style = '', model = 'nai-diffusion-4-5-full', artist = '', scene = '', complexity = '', year = '', quality = 'auto' } = opts;
  const v5 = isV5(model);
  const pre = STYLE_PRESETS[style];
  const parts = [];

  if (artist) {
    const names = String(artist).split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    parts.push(names.map((n) => `[[[artist:${n}]]]`).join(', '));
  }
  if (pre && pre.artist === false && artist) parts.push('（注意：这个风格不建议堆画师串）');
  if (pre) parts.push(pre.tags.join(', '));
  if (complexity) parts.push(`${complexity} complexity`);
  if (year) parts.push(`year ${year}`);
  if (quality !== 'none') parts.push(quality === 'hi' ? QUALITY_HI : QUALITY);
  parts.push(subject.trim());
  if (scene) parts.push(scene.trim());

  const prompt = parts.filter(Boolean).join(', ');
  const count = prompt.split(/[,，]/).filter(Boolean).length;
  return {
    prompt,
    negative: v5 ? NEG_V5 : NEG_V45,
    model,
    notes: [
      pre ? `画风「${style}」：${pre.tip}`.trim() : '',
      `权重写法（${v5 ? 'V5' : 'V4.5'}）：${v5 ? WEIGHT_RULES.v5 : WEIGHT_RULES.v4}`,
      count > 75 ? `提示词约 ${count} 个词条，注意 V4.5 上限远小于 V5（V5 Full 约 750 token）` : '',
      v5 ? 'V5 擅长整句：人物互动/氛围用英文句子写，静态属性才用 tag' : 'V4.5 只吃 tag 短句，别写长句',
    ].filter(Boolean),
  };
}

// 体检：语法、权重、长度、模型适配
export function checkPrompt(prompt, model = 'nai-diffusion-4-5-full') {
  const text = String(prompt || '');
  const v5 = isV5(model);
  const issues = [];
  const suggest = [];

  const bal = (o, c, name) => {
    const a = (text.match(new RegExp('\\' + o, 'g')) || []).length;
    const b = (text.match(new RegExp('\\' + c, 'g')) || []).length;
    if (a !== b) issues.push(`${name}数量不匹配：${a} 个 ${o}、${b} 个 ${c}`);
  };
  bal('{', '}', '花括号');
  bal('[', ']', '方括号');
  if (!v5) bal('(', ')', '圆括号');

  if (!v5 && /(^|[,，]\s*)\d+(?:\.\d+)?:[^:\n,，]+(?=[,，]|$)/.test(text)) {
    issues.push('检测到 V5 的「1.5:tag」权重写法，V4.5 应为「1.5::tag::」');
    suggest.push('自动转换后：' + normalizeWeights(text, model));
  }
  if (v5 && /::/.test(text)) {
    issues.push('检测到 V4 的「1.5::tag::」写法，V5 应写成「1.5:tag」');
    suggest.push('自动转换后：' + normalizeWeights(text, model));
  }

  const weights = [...text.matchAll(/(\d+(?:\.\d+)?)\s*::|(?:^|[,，]\s*)(\d+(?:\.\d+)?):/g)].map((m) => parseFloat(m[1] || m[2]));
  if (weights.some((w) => w > 1.3 && w < 1.5)) issues.push('权重落在 1.3–1.5 之间（非线性区间，效果不明显），建议直接 1.5 以上或 1.2 以下');
  if (weights.some((w) => w > 4)) issues.push('权重超过 4，画面容易崩坏');
  if (weights.filter((w) => w > 1).length > 6) suggest.push('高权重词条偏多，容易互相打架，建议保留 2–3 个主力权重');
  if (!v5) {
    const dbl = (text.match(/::/g) || []).length;
    if (dbl % 2 === 1) issues.push('「::」不成对：数字权重不写结尾 :: 会一路作用到后面所有词条');
  }
  const estTokens = Math.round(text.split(/[\s,，]+/).filter(Boolean).length * 1.35);
  if (!v5 && estTokens > 512) suggest.push(`提示词约 ${estTokens} token，超过 V4.5 的 512 上限（正面 Base+角色合计），后面会被稀释`);
  if (v5 && estTokens > 750) suggest.push(`提示词约 ${estTokens} token，超过 V5 的 750 上限`);
  if (/\btext\s*:/i.test(text) && !/english text|\btext\b/i.test(text.replace(/text\s*:/ig, ''))) suggest.push('写了 Text: 之后，最好再加 text / english text 词条，成功率更高');
  if (/text\s*:/i.test(text) && !/^\s*Text\s*:/m.test(text)) suggest.push('画面内文字建议单独空一行、以大写 Text: 开头，避免和普通词条混在一起');

  const tags = text.split(/[,，]/).filter((s) => s.trim().length > 0);
  if (tags.length < 4) issues.push('词条太少（<' + 4 + '），画面会空');
  if (!/1girl|1boy|2girls|2boys|no humans|scenery/i.test(text)) suggest.push('缺少主体词（1girl / 1boy / 2girls / scenery）');
  if (!v5 && text.length > 400) suggest.push('V4.5 提示词偏长，超过 400 字符的部分往往被稀释');
  if (v5 && /[\u4e00-\u9fa5]/.test(text)) suggest.push('V5 用中文也能跑，但英文/日文效果更好；长句建议英文');
  if (/"[^"]*[\u4e00-\u9fa5][^"]*"/.test(text)) suggest.push('画面内要出现中文文字时效果差，建议改成英文/日文并用半角双引号括住');

  if (tags.length < 30) suggest.push(`标签只有 ${tags.length} 个，规矩是正负各 ≥30；nai_image 会自动补齐，但自己写满更可控`);
  return { ok: issues.length === 0, issues, suggest, tags: tags.length, v5 };
}

export const GUIDE = {
  structure: '五段链：画师串 → 画风/技法词 → 光线色调 → 质量词 → 人物·动作·场景；换画风改前两段，换构图改最后一段',
  structure9: 'V4.5 九段式（非强制）：①画师与风格 ②人数性别 ③角色名(作品名) ④外观 ⑤服装 ⑥动作表情 ⑦环境 ⑧光影视角 ⑨整体风格；角色名写对后 4–6 段可省',
  budget: 'V4.5 正面 512 token（≈380 英文词），负面另 512；V5 是 750',
  artists: '堆 artist:名字 是控制画风的主力，写法 [[[artist:name]]]',
  officialArt: '作品名 + official art 最省力：official art, 4::blue archive game cg::, anime illustration, anime coloring（再加 anime screencap / anime drawings 更稳）',
  negative: '想要的东西写正向（multiple views、no halo、no text），别塞进负面；负面只放 lowres / bad anatomy / watermark 这类',
  v5: 'V5 能吃 750 token 长句，人物互动与氛围用英文句子写；步骤 28 / Guidance 5.6 / Euler；混合风格权重压 0.1–1.0',
  anlas: 'Opus 免费档：单张、≤28 步、约 1MP；超出按 Anlas 计费（V5 与 V4.5 同规则）',
};

// ---- 标签数量下限（默认 30）：不够就用中性标签补齐，保证信息密度 ----
export const POS_FILLER = [
  'detailed face', 'detailed eyes', 'detailed hair', 'detailed clothes', 'detailed background',
  'depth of field', 'sharp focus', 'clean lineart', 'vibrant colors', 'soft lighting',
  'intricate details', 'dynamic composition', 'dramatic lighting', 'ambient light',
  'colorful', 'high contrast', 'subtle shadows', 'cinematic', 'atmospheric', 'wide shot',
  'upper body', 'looking at viewer', 'beautiful detailed sky', 'clouds', 'bloom',
  'lens flare', 'film grain', 'rich colors', 'elegant', 'graceful pose',
];

export const NEG_FILLER = [
  'bad anatomy', 'bad proportions', 'bad perspective', 'deformed', 'disfigured', 'mutated',
  'extra fingers', 'missing fingers', 'extra limbs', 'missing limbs', 'fused fingers',
  'malformed hands', 'extra arms', 'extra legs', 'long neck', 'cropped', 'out of frame',
  'duplicate', 'multiple views', 'text', 'signature', 'watermark', 'username', 'logo',
  'jpeg artifacts', 'noise', 'grain', 'blurry', 'oversaturated', 'flat color',
];

export function ensureTags(text, min, pool) {
  const items = String(text || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  const norm = (s) => s.toLowerCase().replace(/[_\s]+/g, ' ').trim();
  const have = new Set(items.map(norm));
  const added = [];
  for (const cand of pool) {
    if (items.length >= min) break;
    if (have.has(norm(cand))) continue;
    items.push(cand);
    have.add(norm(cand));
    added.push(cand);
  }
  return { text: items.join(', '), count: items.length, added };
}
