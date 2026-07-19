# hz_stages.py — 「降下の弧」の各 stage を一貫生成。JSON で stage 群を受け取る。
# 一貫性: 既定は固定 seed の txt2img。HZ_CHAIN=1 で img2img チェーン（各 stage を前 stage から派生＝連続的に世界が深まる）。
import os, json, torch
from PIL import Image
from diffusers import (StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline,
                       DPMSolverMultistepScheduler)

MODEL = os.environ.get("HZ_MODEL", "Lykon/dreamshaper-xl-1-0")
SEED  = int(os.environ.get("HZ_SEED", "123"))
W     = int(os.environ.get("HZ_W", "1280")); H = int(os.environ.get("HZ_H", "768"))
STEPS = int(os.environ.get("HZ_STEPS", "30"))
CFG   = float(os.environ.get("HZ_CFG", "6.0"))
CHAIN = os.environ.get("HZ_CHAIN", "0") == "1"
STR   = float(os.environ.get("HZ_STRENGTH", "0.55"))   # chain 時の img2img denoise
HOME  = os.environ.get("USERPROFILE", ".")
STAGES = json.load(open(os.environ["HZ_STAGES"], encoding="utf-8"))
NEG = os.environ.get("HZ_NEG",
    "bright, cheerful, colorful, oversaturated, daylight, clean, modern city, sunny, text, watermark, "
    "signature, logo, ui, frame, lowres, blurry, deformed, extra limbs, cartoon, anime, 3d render, cgi, multiple faces")

print("[stages] n=%d seed=%d %dx%d chain=%s" % (len(STAGES), SEED, W, H, CHAIN))
t2i = StableDiffusionXLPipeline.from_pretrained(MODEL, torch_dtype=torch.float16, use_safetensors=True)
t2i.scheduler = DPMSolverMultistepScheduler.from_config(t2i.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True)
t2i.enable_model_cpu_offload(); t2i.vae.enable_tiling(); t2i.vae.enable_slicing()
i2i = StableDiffusionXLImg2ImgPipeline(**t2i.components)
i2i.enable_model_cpu_offload(); i2i.vae.enable_tiling(); i2i.vae.enable_slicing()

prev = None
init = os.environ.get("HZ_INIT")
if init and os.path.exists(init):
    prev = Image.open(init).convert("RGB").resize((W, H))

for st in STAGES:
    key, prompt = st["key"], st["prompt"]
    g = torch.Generator(device="cpu").manual_seed(SEED)
    if CHAIN and prev is not None:
        print("[stages] %s (img2img chain, str=%.2f)" % (key, STR))
        img = i2i(prompt=prompt, negative_prompt=NEG, image=prev.resize((W, H)), strength=STR,
                  num_inference_steps=STEPS, guidance_scale=CFG, generator=g).images[0]
    else:
        print("[stages] %s (txt2img)" % key)
        img = t2i(prompt=prompt, negative_prompt=NEG, num_inference_steps=STEPS,
                  guidance_scale=CFG, width=W, height=H, generator=g).images[0]
    out = os.path.join(HOME, "hz_stage_%s.png" % key)
    img.save(out); prev = img
    print("[stages] SAVED %s -> %s (%d bytes)" % (key, out, os.path.getsize(out)))
print("[stages] ALL DONE")
