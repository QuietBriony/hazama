# hazama_descent_key.py
# Hazama「奈落のドーム背景」(assets/hazama-descent-key.webp) の手続き生成＋ヘッドレス render。
#
# 何を描くか（アートディレクション）:
#   世界の表皮が剥がれ、鉄錆の構造＝配線の編み目が露れる「竪坑(shaft)」を上から覗く。
#   坑は暗闇へ沈み、底の中央から冷たい「核の気配」だけが霧に滲む。核そのものは決して描かない
#   （常に構造とヘイズに遮られ、光の滲みだけ）。硬い・乾いた・冷たい・威圧。
#   モバイルは cover で中央縦帯だけ映る＝主役(坑＋核の滲み)を必ず中央に置く。
#
# STATUS（2026-07-19）: この抽象幾何アセットは **保留候補**。本番 hero/OG は現行の figurative
#   概念画（フード姿＋ランタン＋巨大産業奈落）を維持中＝別種のため drop-in 置換は見送り。
#   本スクリプトは CFG 駆動化＋局所霧 bloom(core_fog) まで作り込み済みで、抽象アセットが要る時に
#   即レンダできる状態（採択値の探索結果 w2_broad は CFG 既定に反映）。実証済み無人 SSH レンダ
#   pipeline は memory: hazama-worker-render を参照。
#
# 使い方（worker/Codex 側で）:
#   blender --background --python tools/blender/hazama_descent_key.py
#   → カレントに hazama_descent_key.png を出力（環境変数 HZ_OUT で上書き可）。
#   → webp 化して置換:  cwebp -q 82 -resize 1500 900 hazama_descent_key.png -o assets/hazama-descent-key.webp
#      （元と同じ 1500x900・drop-in。私(Fable)が E29 で version 同期・smoke・目視配線まで巻き取る）
#
# 前提: Blender 4.x / Cycles / 依存アセット無し（完全手続き）。依存ゼロの Hazama を崩さない
#      （これは build-time ツール＝出力は静的画像1枚。runtime には何も足さない）。
#
# blind 反復の要: 下の CONFIG を弄って再 render するだけで画作りを追い込める。まず既定で1枚、
#      画像を Fable に戻して「もっと暗く/錆を強く/核をもっと沈めて/坑を細く」等の言葉で数値化する。

import bpy, bmesh, math, os, random
from mathutils import Vector

# ============================== CONFIG ==============================
CFG = {
    "out":        os.environ.get("HZ_OUT", os.path.join(os.getcwd(), "hazama_descent_key.png")),
    "res_x":      1500, "res_y": 900,       # 元 asset と同寸＝drop-in（CSS/OG 無改変）
    "samples":    200,                       # 上げるほど綺麗・遅い。CPU 既定
    "device":     "CPU",                     # "GPU" に変えると速い（worker の設定次第）
    "seed":       7,
    "view_transform": "Standard",            # "AgX" にすると highlight が柔らかく退色気味

    # --- パレット（Hazama。sRGB 0..1 近似・材質/光で使う）---
    "bg":         (0.006, 0.011, 0.024),     # #04060b 近傍＝奈落の地色
    "iron":       (0.016, 0.017, 0.021),     # 暗鉄（構造の基調）
    "rust":       (0.26, 0.085, 0.055),      # 鉄錆 #c46b5a を暗く
    "cold":       (0.11, 0.34, 0.42),        # 冷青緑 accent (127,182,196)
    "core_glow":  (0.24, 0.55, 0.62),        # 核グロー (159,208,219)

    # --- 効き（blind 反復でここを言葉→数値に）---
    "core_strength": 10.0,   # 遮蔽(iris)前提で強め＝縁からコロナ・上へ淡い光柱（w2_broad 候補・保留）
    "cold_emit":     1.6,    # 冷たい配線グローの強さ
    "rust_amount":   0.6,    # 0..1 鉄錆の量
    "haze":          0.052,  # 薄霧＋底の核光が柔らかい光輪に滲む（w2_broad 候補・保留）
    "key_strength":  4.0,    # 上端の冷たいキー（「上端がわずかに醒め」）＝鉄錆の編み目を少し起こす

    # --- 核の遮蔽と滲み（iris＝直視遮り／core_fog＝局所濃霧で bloom を作る＝compositor 非依存）---
    "core_radius":     0.70,  # 核 emission 球の半径（面光源＝影スパイクを柔らかく。w2_broad 候補・保留）
    "core_z_frac":     0.98,  # 核 z = -depth * これ（大きいほど深く沈む）
    "iris_radius":     0.95,  # 手前の暗円盤の半径（大きいほど直視を遮り放射スパイクを減らす。w2_broad 候補・保留）
    "iris_z_frac":     0.86,  # iris z = -depth * これ
    "core_fog":        0.14,  # 薄い局所霧＝縁光を連続した柔らかい光輪に散らし規則スパイクを崩す（w2_broad 候補・保留）
    "core_fog_radius": 3.6,   # 局所霧の球半径（大きく薄く＝吸収せず散乱で halo に広げる）
    "core_fog_color":  (0.06, 0.16, 0.20),  # 局所濃霧の寒色（冷たい滲み）

    # --- 坑(shaft)の形 ---
    "top_z":        2.4,     # 坑の上端 z
    "depth":        16.0,    # 坑の深さ（下へ暗闇）
    "radius_top":   3.2,     # 上端半径
    "radius_bot":   0.55,    # 底半径（すぼまる＝遠近）
    "girder_rings": 7,       # 水平リング数
    "girder_radials": 18,    # 縦桁の本数
    "cable_count":  22,      # 垂れる配線の本数（冷たく光る）
    "girder_thick": 0.055,   # 桁の太さ
    "cable_thick":  0.02,    # 配線の太さ

    # --- カメラ（上からやや見下ろして坑を覗く。主役は中央）---
    "cam_z_above":  2.1,     # 上端からさらに上の高さ
    "cam_offset":   0.9,     # 中心から少し引く（真俯瞰でなく斜めに）
    "cam_lens":     40,      # mm（広めで坑の奥行き）
    "look_z":       -5.5,    # カメラが向く先（坑の中ほど）
}
# ===================================================================

# env 上書き（テスト/反復用。未設定なら CFG 既定）:
#   HZ_OUT / HZ_SAMPLES / HZ_RES_X / HZ_RES_Y / HZ_DEVICE（CPU|GPU|OPTIX|CUDA）
def _envi(k, d):
    v = os.environ.get(k)
    try: return int(v) if v not in (None, "") else d
    except Exception: return d
CFG["samples"] = _envi("HZ_SAMPLES", CFG["samples"])
CFG["res_x"] = _envi("HZ_RES_X", CFG["res_x"])
CFG["res_y"] = _envi("HZ_RES_Y", CFG["res_y"])
if os.environ.get("HZ_DEVICE"): CFG["device"] = os.environ["HZ_DEVICE"]

random.seed(CFG["seed"])


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def rust_material():
    m = bpy.data.materials.new("hz_rust"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 3.5
    try: noise.inputs["Detail"].default_value = 8.0
    except Exception: pass
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    # 錆パッチ: iron -> rust。rust_amount で分岐位置を動かす。
    ramp.color_ramp.elements[0].position = max(0.0, 0.62 - CFG["rust_amount"] * 0.5)
    ramp.color_ramp.elements[0].color = (*CFG["iron"], 1)
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[1].color = (*CFG["rust"], 1)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    # roughness も錆で荒れる
    rr = nt.nodes.new("ShaderNodeValToRGB")
    rr.color_ramp.elements[0].color = (0.45, 0.45, 0.45, 1)
    rr.color_ramp.elements[1].color = (0.92, 0.92, 0.92, 1)
    nt.links.new(noise.outputs["Fac"], rr.inputs["Fac"])
    nt.links.new(rr.outputs["Color"], bsdf.inputs["Roughness"])
    try: bsdf.inputs["Metallic"].default_value = 0.55
    except Exception: pass
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m


def emit_material(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def skin(obj, radius):
    """edge ネットワーク → Skin+Subsurf で太らせて桁/配線にする。失敗しても render は続行。"""
    try:
        mod = obj.modifiers.new("Skin", 'SKIN')
        me = obj.data
        me.skin_vertices[0].data[0].use_root = True
        for sv in me.skin_vertices[0].data:
            sv.radius = (radius, radius)
        sub = obj.modifiers.new("Subsurf", 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
    except Exception as e:
        print("  [skin fallback: wireframe]", e)
        try:
            wf = obj.modifiers.new("Wire", 'WIREFRAME'); wf.thickness = radius * 2
        except Exception as e2:
            print("  [wireframe failed too]", e2)


def make_cage():
    """竪坑の鉄錆ケージ（縦桁＋水平リング）を1メッシュで。"""
    top, depth = CFG["top_z"], CFG["depth"]
    Rt, Rb = CFG["radius_top"], CFG["radius_bot"]
    nr, nrad = CFG["girder_rings"], CFG["girder_radials"]
    verts, edges, idx = [], [], {}
    for k in range(nr):
        t = k / (nr - 1)
        z = top - (top + depth) * t
        # 半径は下へ非線形にすぼまる＝遠近感
        r = Rt + (Rb - Rt) * (t ** 1.4)
        for a in range(nrad):
            ang = 2 * math.pi * a / nrad
            idx[(k, a)] = len(verts)
            verts.append((r * math.cos(ang), r * math.sin(ang), z))
    for k in range(nr):                      # 水平リング
        for a in range(nrad):
            edges.append((idx[(k, a)], idx[(k, (a + 1) % nrad)]))
    for a in range(nrad):                    # 縦桁（1本おきに間引いて粗さを出す）
        if a % 1 == 0:
            for k in range(nr - 1):
                edges.append((idx[(k, a)], idx[(k + 1, a)]))
    me = bpy.data.meshes.new("hz_cage"); me.from_pydata(verts, edges, [])
    obj = bpy.data.objects.new("hz_cage", me); bpy.context.collection.objects.link(obj)
    skin(obj, CFG["girder_thick"])
    obj.data.materials.append(rust_material())
    return obj


def make_cables():
    """上端から底へ垂れる配線（冷たく光る）。坑の"編み目が露れる"質感。"""
    top, depth = CFG["top_z"], CFG["depth"]
    Rt = CFG["radius_top"]
    verts, edges = [], []
    for _ in range(CFG["cable_count"]):
        ang = random.uniform(0, 2 * math.pi)
        r0 = random.uniform(0.3, Rt * 0.95)
        x0, y0 = r0 * math.cos(ang), r0 * math.sin(ang)
        segs = 6
        base = len(verts)
        for s in range(segs):
            t = s / (segs - 1)
            z = top - (top + depth * random.uniform(0.5, 0.95)) * t
            # 下へ行くほど中心へ寄り、たわむ
            r = r0 * (1 - t) + CFG["radius_bot"] * t
            sway = math.sin(t * math.pi) * random.uniform(-0.25, 0.25)
            verts.append((r * math.cos(ang) + sway, r * math.sin(ang) + sway, z))
            if s > 0:
                edges.append((base + s - 1, base + s))
    me = bpy.data.meshes.new("hz_cables"); me.from_pydata(verts, edges, [])
    obj = bpy.data.objects.new("hz_cables", me); bpy.context.collection.objects.link(obj)
    skin(obj, CFG["cable_thick"])
    obj.data.materials.append(emit_material("hz_cold", CFG["cold"], CFG["cold_emit"]))
    return obj


def make_core_glow():
    """底中央の"核の気配"。小さな emission 球＝ケージ＋霧に遮られ、滲みだけ上る。核は描かない。"""
    depth = CFG["depth"]
    core_z = -depth * CFG["core_z_frac"]
    # 核＝小さく・深く（霧の層を厚く挟む）。見えるのは霧に散った滲みだけ。
    bpy.ops.mesh.primitive_uv_sphere_add(radius=CFG["core_radius"], location=(0, 0, core_z))
    core = bpy.context.active_object; core.name = "hz_core"
    core.data.materials.append(emit_material("hz_core_glow", CFG["core_glow"], CFG["core_strength"]))
    # 核の手前に「暗い虹彩(iris)」の実円盤＝カメラから核の直視を遮る。glow は縁と霧へ漏れるだけ。
    bpy.ops.mesh.primitive_circle_add(vertices=48, radius=CFG["iris_radius"], fill_type='NGON',
                                      location=(0, 0, -depth * CFG["iris_z_frac"]))
    occ = bpy.context.active_object; occ.name = "hz_core_iris"
    dark = bpy.data.materials.new("hz_iris"); dark.use_nodes = True
    nt = dark.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*CFG["iron"], 1)
    try: bsdf.inputs["Roughness"].default_value = 0.9
    except Exception: pass
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    occ.data.materials.append(dark)
    # 局所濃霧（任意）: 核周りだけ濃い Volume を置くと、縁から漏れた光がここで散って
    # 柔らかい blob になる＝compositor(FOG_GLOW)非依存の bloom。放射スパイクの規則性を崩す。
    if CFG.get("core_fog", 0.0) > 0:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=CFG["core_fog_radius"], location=(0, 0, core_z + 0.3))
        fog = bpy.context.active_object; fog.name = "hz_corefog"
        fm = bpy.data.materials.new("hz_corefog_vol"); fm.use_nodes = True
        fnt = fm.node_tree; fnt.nodes.clear()
        fout = fnt.nodes.new("ShaderNodeOutputMaterial")
        fvol = fnt.nodes.new("ShaderNodeVolumePrincipled")
        fvol.inputs["Density"].default_value = CFG["core_fog"]
        fvol.inputs["Color"].default_value = (*CFG["core_fog_color"], 1)
        fnt.links.new(fvol.outputs["Volume"], fout.inputs["Volume"])
        fog.data.materials.append(fm)


def make_haze():
    """沈む大気。大きな domain に薄い Principled Volume＝奥行き＋核の滲みを霧へ。"""
    try:
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -CFG["depth"] * 0.4))
        dom = bpy.context.active_object; dom.name = "hz_haze"
        dom.scale = (CFG["radius_top"] * 2.5, CFG["radius_top"] * 2.5, CFG["depth"] * 1.2)
        m = bpy.data.materials.new("hz_volume"); m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        vol = nt.nodes.new("ShaderNodeVolumePrincipled")
        vol.inputs["Density"].default_value = CFG["haze"]
        vol.inputs["Color"].default_value = (0.05, 0.11, 0.15, 1)   # 暗い寒色＝全面ティール化を避ける
        nt.links.new(vol.outputs["Volume"], out.inputs["Volume"])
        dom.data.materials.append(m)
    except Exception as e:
        print("  [haze skipped]", e)


def make_world():
    w = bpy.data.worlds.new("hz_world"); bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (*CFG["bg"], 1)
        bg.inputs["Strength"].default_value = 0.08


def make_key_light():
    # 上端の冷たいキー（世界の表皮が剥がれた縁）
    bpy.ops.object.light_add(type='AREA', location=(2.5, -2.0, CFG["top_z"] + 3.5))
    L = bpy.context.active_object.data
    L.energy = CFG["key_strength"] * 120
    L.color = (0.6, 0.85, 1.0)
    L.size = 6.0
    bpy.context.active_object.rotation_euler = (math.radians(35), 0, math.radians(30))


def make_camera():
    top = CFG["top_z"]
    cam_data = bpy.data.cameras.new("hz_cam"); cam_data.lens = CFG["cam_lens"]
    cam = bpy.data.objects.new("hz_cam", cam_data); bpy.context.collection.objects.link(cam)
    cam.location = (CFG["cam_offset"], -CFG["cam_offset"], top + CFG["cam_z_above"])
    # 坑の中ほどを向く（Track-To empty）＝斜め俯瞰
    tgt = bpy.data.objects.new("hz_target", None); bpy.context.collection.objects.link(tgt)
    tgt.location = (0, 0, CFG["look_z"])
    con = cam.constraints.new('TRACK_TO'); con.target = tgt
    con.track_axis = 'TRACK_NEGATIVE_Z'; con.up_axis = 'UP_Y'
    bpy.context.scene.camera = cam


def setup_render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    try: sc.cycles.device = CFG["device"]
    except Exception: pass
    sc.cycles.samples = CFG["samples"]
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.resolution_x = CFG["res_x"]; sc.render.resolution_y = CFG["res_y"]
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    sc.render.filepath = CFG["out"]
    try: sc.view_settings.view_transform = CFG["view_transform"]
    except Exception: pass


def setup_compositor():
    """核の滲みを霧グロー(Glare)で膨らませ、周辺を沈める(vignette)。失敗しても render は続行。"""
    try:
        sc = bpy.context.scene; sc.use_nodes = True
        nt = sc.node_tree; nt.nodes.clear()
        rl = nt.nodes.new("CompositorNodeRLayers")
        glare = nt.nodes.new("CompositorNodeGlare")
        glare.glare_type = 'FOG_GLOW'; glare.quality = 'HIGH'; glare.threshold = 0.4
        try: glare.size = 8
        except Exception: pass
        # vignette: 楕円マスク→ぼかし→乗算で周辺減光
        comp = nt.nodes.new("CompositorNodeComposite")
        nt.links.new(rl.outputs["Image"], glare.inputs["Image"])
        nt.links.new(glare.outputs["Image"], comp.inputs["Image"])
    except Exception as e:
        print("  [compositor skipped]", e)


def main():
    print("[hazama] reset"); reset()
    print("[hazama] world"); make_world()
    print("[hazama] cage"); make_cage()
    print("[hazama] cables"); make_cables()
    print("[hazama] core glow"); make_core_glow()
    print("[hazama] haze"); make_haze()
    print("[hazama] key light"); make_key_light()
    print("[hazama] camera"); make_camera()
    print("[hazama] render setup"); setup_render()
    print("[hazama] compositor"); setup_compositor()
    print("[hazama] rendering -> %s" % CFG["out"])
    bpy.ops.render.render(write_still=True)
    print("[hazama] DONE. next: cwebp -q 82 -resize 1500 900 '%s' -o assets/hazama-descent-key.webp" % CFG["out"])


if __name__ == "__main__":
    main()
