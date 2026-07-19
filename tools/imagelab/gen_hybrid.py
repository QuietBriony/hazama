# gen_hybrid.py — Blender 竪坑 greybox の depth を ControlNet に渡し、SDXL で painterly 化。
# = 「構図=Blender で固定 / 質感=SDXL で生成」の併用パイプラインの実証。
# 保留にした抽象 Blender render(hz_descent_final.png)を"構図の足場"に再利用する。
#
# 速度最適化: 既定で small depth ControlNet を使い offload 無し(cuda 常駐)で走る＝8GB に収まれば
#   full-CN＋offload(≈11.7分)の thrash を回避し大幅高速化。OOM なら offload に自動再構築。
import os, torch
from PIL import Image
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel, DPMSolverMultistepScheduler

MODEL  = os.environ.get("HZ_MODEL", "Lykon/dreamshaper-xl-1-0")
CN     = os.environ.get("HZ_CN", "diffusers/controlnet-depth-sdxl-1.0-small")  # small=8GBに収まりやすい
CTRL   = os.environ.get("HZ_CONTROL_IMG", os.path.join(os.environ.get("USERPROFILE", "."), "hz_descent_final.png"))
STEPS  = int(os.environ.get("HZ_STEPS", "26"))
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

print("[hybrid] model=%s cn=%s ctrl=%s cscale=%.2f seed=%d %dx%d steps=%d" % (MODEL, CN, CTRL, CSCALE, SEED, W, H, STEPS))
print("[hybrid] cuda=%s" % torch.cuda.is_available())

# 1) Blender greybox から depth を推定（Midas）
ctrl_src = Image.open(CTRL).convert("RGB").resize((W, H))
from controlnet_aux import MidasDetector
midas = MidasDetector.from_pretrained("lllyasviel/Annotators")
depth = midas(ctrl_src).resize((W, H))
depth.save(DOUT)
print("[hybrid] depth saved:", DOUT)


def build(offload):
    cn = ControlNetModel.from_pretrained(CN, torch_dtype=torch.float16, use_safetensors=True)
    pipe = None
    for kw in ({"variant": "fp16", "use_safetensors": True}, {"use_safetensors": True}, {}):
        try:
            pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
                MODEL, controlnet=cn, torch_dtype=torch.float16, **kw); break
        except Exception as e:
            print("[hybrid] load attempt failed:", repr(e)[:150])
    if pipe is None:
        raise RuntimeError("could not load %s" % MODEL)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True)
    if offload:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to("cuda")
    pipe.vae.enable_tiling(); pipe.vae.enable_slicing()
    return pipe


def run(pipe):
    g = torch.Generator(device="cpu").manual_seed(SEED)
    return pipe(prompt=PROMPT, negative_prompt=NEG, image=depth,
                num_inference_steps=STEPS, guidance_scale=CFG,
                controlnet_conditioning_scale=CSCALE, width=W, height=H, generator=g).images[0]


try:
    print("[hybrid] trying cuda (no offload)...")
    pipe = build(offload=False)
    img = run(pipe); mode = "cuda"
except torch.cuda.OutOfMemoryError as e:
    print("[hybrid] OOM on cuda -> rebuild with model_cpu_offload:", repr(e)[:100])
    try: del pipe
    except Exception: pass
    torch.cuda.empty_cache()
    pipe = build(offload=True)
    img = run(pipe); mode = "offload"

img.save(OUT)
print("[hybrid] mode=%s SAVED exists=%s bytes=%d path=%s" % (
    mode, os.path.exists(OUT), os.path.getsize(OUT) if os.path.exists(OUT) else 0, OUT))
