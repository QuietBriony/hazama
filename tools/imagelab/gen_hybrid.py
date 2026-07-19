# hz_hybrid.py — Blender 竪坑 greybox の depth を ControlNet に渡し、SDXL で painterly 化。
# = 「構図=Blender で固定 / 質感=SDXL で生成」の併用パイプラインの実証。
# 保留にした抽象 Blender render(hz_descent_final.png)を"構図の足場"に再利用する。
import os, torch
from PIL import Image
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, DPMSolverMultistepScheduler

MODEL  = os.environ.get("HZ_MODEL", "Lykon/dreamshaper-xl-1-0")
CN     = os.environ.get("HZ_CN", "diffusers/controlnet-depth-sdxl-1.0")
CTRL   = os.environ.get("HZ_CONTROL_IMG", os.path.join(os.environ.get("USERPROFILE", "."), "hz_descent_final.png"))
STEPS  = int(os.environ.get("HZ_STEPS", "30"))
CFG    = float(os.environ.get("HZ_CFG", "6.0"))
CSCALE = float(os.environ.get("HZ_CSCALE", "0.65"))
SEED   = int(os.environ.get("HZ_SEED", "7"))
W      = int(os.environ.get("HZ_W", "1216"))
H      = int(os.environ.get("HZ_H", "832"))
OUT    = os.environ.get("HZ_OUT", os.path.join(os.environ.get("USERPROFILE", "."), "hz_hybrid_out.png"))
DOUT   = os.path.join(os.path.dirname(OUT), "hz_hybrid_depth.png")

PROMPT = os.environ.get("HZ_PROMPT",
    "dark cinematic concept art, looking down into a vast vertical abyss, colossal rusted iron lattice "
    "shaft descending into darkness, hanging cables, a faint cold light far below, volumetric haze, "
    "muted teal and rust palette, painterly brushwork, atmospheric, awe and dread, matte painting")
NEG = os.environ.get("HZ_NEG",
    "bright, cheerful, colorful, daylight, clean, modern, text, watermark, signature, logo, "
    "lowres, blurry, deformed, cartoon, anime, 3d render, cgi")

print("[hybrid] model=%s cn=%s ctrl=%s cscale=%.2f seed=%d %dx%d" % (MODEL, CN, CTRL, CSCALE, SEED, W, H))
print("[hybrid] cuda=%s" % torch.cuda.is_available())

# 1) Blender greybox から depth を推定（Midas）
ctrl_src = Image.open(CTRL).convert("RGB").resize((W, H))
from controlnet_aux import MidasDetector
midas = MidasDetector.from_pretrained("lllyasviel/Annotators")
depth = midas(ctrl_src).resize((W, H))
depth.save(DOUT)
print("[hybrid] depth saved:", DOUT)

# 2) ControlNet(depth) -> SDXL(暗黒 checkpoint)
cn = ControlNetModel.from_pretrained(CN, torch_dtype=torch.float16, use_safetensors=True)
def load(model):
    for kw in ({"variant": "fp16", "use_safetensors": True}, {"use_safetensors": True}, {}):
        try:
            return StableDiffusionXLControlNetPipeline.from_pretrained(
                model, controlnet=cn, torch_dtype=torch.float16, **kw)
        except Exception as e:
            print("[hybrid] load attempt failed:", repr(e)[:150])
    raise RuntimeError("could not load %s" % model)
pipe = load(MODEL)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True)
pipe.enable_model_cpu_offload()
try: pipe.enable_vae_tiling()
except Exception: pass
try: pipe.enable_vae_slicing()
except Exception: pass

g = torch.Generator(device="cpu").manual_seed(SEED)
print("[hybrid] generating...")
img = pipe(prompt=PROMPT, negative_prompt=NEG, image=depth,
           num_inference_steps=STEPS, guidance_scale=CFG,
           controlnet_conditioning_scale=CSCALE, width=W, height=H, generator=g).images[0]
img.save(OUT)
print("[hybrid] SAVED exists=%s bytes=%d path=%s" % (
    os.path.exists(OUT), os.path.getsize(OUT) if os.path.exists(OUT) else 0, OUT))
