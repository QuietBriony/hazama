# hz_imggen.py — Hazama descent キーアートの diffusers 生成（SDXL / RTX2070 8GB 向け）。
# Blender pipeline と同じ「script→scp→実行→回収→Read」に乗る headless one-shot 生成。
# env: HZ_MODEL HZ_PROMPT HZ_NEG HZ_STEPS HZ_CFG HZ_W HZ_H HZ_SEED HZ_OUT
import os, torch
from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler

MODEL  = os.environ.get("HZ_MODEL", "Lykon/dreamshaper-xl-1-0")  # 暗い concept-art 寄り SDXL
STEPS  = int(os.environ.get("HZ_STEPS", "30"))
CFG    = float(os.environ.get("HZ_CFG", "6.0"))
W      = int(os.environ.get("HZ_W", "1216"))
H      = int(os.environ.get("HZ_H", "832"))
SEED   = int(os.environ.get("HZ_SEED", "7"))
OUT    = os.environ.get("HZ_OUT", os.path.join(os.environ.get("USERPROFILE", "."), "hz_img_test.png"))

PROMPT = os.environ.get("HZ_PROMPT",
    "dark cinematic concept art, a lone hooded figure standing at the crumbling edge of an immense "
    "vertical abyss, a colossal derelict industrial megastructure descending into darkness far below, "
    "rusted iron lattice and hanging cables, one small cold lantern light, volumetric haze, "
    "muted teal and rust palette, deep shadow, painterly brushwork, atmospheric, awe and dread, "
    "matte painting, highly detailed, ArtStation")
NEG = os.environ.get("HZ_NEG",
    "bright, cheerful, colorful, oversaturated, daylight, clean, modern city, sunny, "
    "text, watermark, signature, logo, ui, frame, lowres, blurry, deformed, extra limbs, "
    "cartoon, anime, 3d render, cgi")

print("[img] model=%s  %dx%d  steps=%d cfg=%.1f seed=%d" % (MODEL, W, H, STEPS, CFG, SEED))
print("[img] cuda=%s dev=%s" % (torch.cuda.is_available(),
      torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"))

def load(model):
    for kw in ({"variant": "fp16", "use_safetensors": True}, {"use_safetensors": True}, {}):
        try:
            print("[img] loading %s kw=%s" % (model, kw))
            return StableDiffusionXLPipeline.from_pretrained(model, torch_dtype=torch.float16, **kw)
        except Exception as e:
            print("[img] load attempt failed:", repr(e)[:160])
    raise RuntimeError("could not load model %s" % model)

pipe = load(MODEL)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True)
# 8GB 対策: model を段階的に CPU offload＋VAE を tiling/slicing（OOM 回避優先・多少遅い）
pipe.enable_model_cpu_offload()
try: pipe.enable_vae_slicing()
except Exception: pass
try: pipe.enable_vae_tiling()
except Exception: pass

g = torch.Generator(device="cpu").manual_seed(SEED)
print("[img] generating...")
img = pipe(prompt=PROMPT, negative_prompt=NEG, num_inference_steps=STEPS,
           guidance_scale=CFG, width=W, height=H, generator=g).images[0]
img.save(OUT)
sz = os.path.getsize(OUT) if os.path.exists(OUT) else 0
print("[img] SAVED exists=%s bytes=%d path=%s" % (os.path.exists(OUT), sz, OUT))
