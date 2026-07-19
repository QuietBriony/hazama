# tools/imagelab — Hazama キービジュアルのローカル AI 生成工房（build-time・runtime 非依存）

Hazama は静的・依存ゼロ。ここは **worker PC でオフラインにキービジュアル画像を作る**ためのツール置き場で、
ゲームの runtime には何も足さない（出力は静的画像1枚だけ）。tools/blender と同じ build-time 枠。

## なぜローカル AI か（2026 リサーチ結論）
現行 hero（`assets/hazama-descent-key.webp`＝フード人物＋ランタン＋産業奈落の painterly 概念画）は
hosted AI 画像生成らしき絵。これを **$0・無人・on-brand に量産する capability** をローカルに持つのが本工房。
- **質を最速で** → Midjourney（hosted・あなたのアカウント・手作業）。ここでは扱わない。
- **掌握・無人量産・$0** → 本工房（worker RTX2070 の SDXL）。Blender pipeline と同じ SSH 駆動。
- Flux 系は 8GB / Turing(fp8 加速無し)で遅く、SDXL が 8GB のスイートスポット。

## 構成（worker: tailnet `gpu` = cta88@100.66.136.89）
- venv: `C:\workspace\hazama-imagelab\venv`（torch 2.6.0+cu124 / diffusers 0.39 / CUDA True・RTX2070 認識）
- checkpoint: **DreamShaper XL**（`Lykon/dreamshaper-xl-1-0`・暗い concept-art 寄り SDXL）
- ControlNet: `diffusers/controlnet-depth-sdxl-1.0` ＋ Midas(`lllyasviel/Annotators`) で depth 前処理
- モデルは HF cache（`C:\Users\cta88\.cache\huggingface`）に初回 DL 済み

## 使い方（このリポの Git Bash から SSH 駆動＝Blender と同じ手順）
scp で `%USERPROFILE%` に配置 → `powershell -File` で実行 → 出力 PNG を scp 回収 → **Fable が Read で採否**。
鍵と SSH オプションは memory [[hazama-worker-render]] 参照（日本語 HOME 化けで明示 `-i` 必須）。

1. **初回セットアップ**（venv＋torch CUDA＋diffusers）: `setup.ps1`（~数分・torch 2.5GB DL）
2. **txt2img**（速い・構図はガチャ）: `run_txt2img.ps1`（`gen_txt2img.py`）
   - **30步 ≈ 23秒**/枚（1216×832・model_cpu_offload）。当たり探索・変種量産の主力。
   - env: `HZ_PROMPT/HZ_NEG/HZ_STEPS/HZ_CFG/HZ_W/HZ_H/HZ_SEED/HZ_MODEL/HZ_OUT`。プロンプトは CLIP 77 tokens で truncate されるので簡潔に。
3. **hybrid**（構図固定・遅い）: `run_hybrid.ps1`（`gen_hybrid.py`）
   - Blender 竪坑 render（`tools/blender/hazama_descent_key.py` の出力）を **構図の足場**にし、
     Midas で depth 化 → ControlNet-depth → SDXL で painterly 化。**Blender で設計した構図を狙って**描ける。
   - **30步 ≈ 11.7分**/枚（ControlNet が 8GB 超で cpu_offload thrash）。決め絵の構図固定用。
     速度最適化の余地: 解像度↓（896×640）／offload 方式変更／最終稿のみ hosted Flux に depth を渡す。
   - env: 上記＋`HZ_CN/HZ_CONTROL_IMG/HZ_CSCALE`（conditioning 0.6〜0.7 が構図×自由度の膝点）。

## 仕上げ（決め絵が出たら）
1500×900 に upscale（Ultimate SD Upscale 等）→ `cwebp -q80`（現行 131KB が予算の目安）→
`assets/hazama-descent-key.webp` を **同寸 drop-in 置換**（`?v=` 四点同期・smoke・deploy は Fable が E系で巻き取る）。
OG は 1200×630 JPG 別出し＋`og:image:width/height` 宣言が安全（LP の og-card.jpg 方式）。

## 役割分担・最終採否
Codex 不要（worker GPU compute のみ）。**レンダの見えは Fable/人間の目が最終採否**（human-gate）。
関連: [[hazama-worker-render]]（SSH の勘所）・`tools/blender/`（構図足場の生成器）。
