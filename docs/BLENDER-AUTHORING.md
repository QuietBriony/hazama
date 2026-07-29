# Blender authoring candidate — Hazama Game

Status: **candidate / authoring-time only**
Audit date: 2026-07-23
Worker: `MyComputer`

## 結論

Hazama Game では Blender をゲーム実行時に使わない。最小推奨は
**「静止画制作だけ」**であり、WorkerPC の Blender 5.2.0 LTS を、
キービジュアル、背景stage、depth/mask、抽象テクスチャを作る
repo外の制作実行器候補とする。

- ゲーム本体は従来どおり静的 Web アプリ
- build step、server runtime、database、GitHub Actions は追加しない
- Blender が無い、壊れた、version不一致でも本編は起動・進行できる
- `.blend`、GLB、PNG原版、render cache、Blender本体はHazama repoへ入れない
- repoへ入れ得るのは、人間が用途・見え・権利・容量をレビューした最終WebP/JPG等だけ
- 現在のキービジュアル、E29「降下の弧」、本番runtimeはこのcandidateでは置換しない

## 価値がある箇所

現在の `assets/` は6ファイル、合計245,139 bytes（約239.4 KiB）。
E29のbase＋4 stageは、深度/終端に合わせて静的WebPをクロスフェードする。
この構成を変えず、Blenderは次の**制作前段**にだけ価値がある。

1. `hazama-descent-{key,drift,bottom,surfaced,omega}.webp` の構図足場
2. SDXL等へ渡すdepth/maskの再現可能なgreybox
3. 鉄錆の編み目、竪坑、霧、曼荼羅外周などの完全手続き背景
4. OGカードやLP背景の候補となる静止画
5. 将来の短い映像を検討する場合のprevisualization

人物・最終的なpainterly表現は現行 `tools/imagelab/` の方が速い場合がある。
Blenderは「構図を固定する足場」として使い、最終画を必ずBlender単独に限定しない。

## 3案比較

| 案 | 長所 | コスト/リスク | 判定 |
|---|---|---|---|
| 使わない | 運用ゼロ、現行静的runtimeに変更なし | depth/maskと構図の再現性を活かせない | fallbackとして維持 |
| 静止画制作だけ | 現行WebP差し替え契約を維持し、構図・質感候補をrepo外で反復できる | 5.2 API互換と人間の目視採否が必要 | **最小推奨** |
| 映像制作にも使う | 降下や二極終端を時間表現できる | 容量、encoding、PWA cache、reduced-motion、再生失敗時fallback、実機QAが増える | 今回は採らない |

短い映像は制作自体を禁止しないが、採用は別candidateとする。採用時も
pre-render済みのWeb向けファイルだけを扱い、Blenderをruntime依存にしない。

## 共通Worker runtime

system `PATH` 上の `blender` は使わない。既存の共通ランチャーを唯一の入口とする。

```powershell
$launcher = 'C:\workspace\blender-worker\bin\invoke-blender.ps1'

# path / signature / version / SHA-256だけを確認
& $launcher -Runtime candidate -Describe
```

2026-07-23の検出値:

| field | value |
|---|---|
| selector | `candidate` |
| version | `5.2.0 LTS` |
| executable | `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe` |
| executable SHA-256 | `e27fbfea8564aa645d4463cb0949695fd85562b9de6df9561b06859a1074adf7` |
| signature | `Valid` / Blender Foundation |
| launcher | `C:\workspace\blender-worker\bin\invoke-blender.ps1` |
| launcher SHA-256 | `5eec74e9fda5bbbf19270cc376f5129da6d9ce00c75c7851ee920a2f6bf826a4` |

ランチャーは起動ごとに絶対パス、reparse point、Blender Foundation署名、
SHA-256、versionを照合する。値が違えば停止し、PATH fallbackはしない。
ランチャー自体の変更はHazama repoから行わない。

## Repo外output構造

Hazama Gameの新規jobは次の名前空間に限定する。

```text
C:\workspace\blender-worker\
└─ renders\
   └─ hazama-game-smoke\
      └─ <UTC timestamp>\
         ├─ smoke_scene.py
         ├─ smoke.png
         ├─ descent-generator-compat.png
         └─ run-report.json
```

本制作候補は `renders\hazama-game\<job-id>\` へ分けてもよい。
`work\`、`.blend`、中間PNG/EXR、動画連番、cache、ログはすべてrepo外に置く。
job-idは個人名や顧客名を含めず、UTC timestampか匿名の用途名にする。

## Blender 5.2 headless smoke

最初のgateは、外部素材・実在人物・既存Studio/Landscapeデータを使わない
小さい完全合成sceneである。

```powershell
$launcher = 'C:\workspace\blender-worker\bin\invoke-blender.ps1'
$scene = 'C:\workspace\blender-worker\renders\hazama-game-smoke\<UTC>\smoke_scene.py'
$output = 'C:\workspace\blender-worker\renders\hazama-game-smoke\<UTC>\smoke.png'
$args = @(
  '--background', '--factory-startup',
  '--python-exit-code', '1',
  '--python', $scene,
  '--', '--out', $output
)
& $launcher -Runtime candidate -BlenderArgs $args
```

合格条件:

1. launcherのpath/signature/version/hash検証が通る
2. headless processがexit code 0
3. 外部asset 0のsceneから期待寸法のPNGが生成される
4. `run-report.json` にUTC、hostname、repo HEAD、launcher/exeのpathとhash、
   signature、version、出力の寸法/bytes/hashを残す
5. repo、本番asset、Hazama Studio、Landscape-OSを変更しない

### 2026-07-23〜24 実行結果

- neutral synthetic smoke: **PASS**
  Workbench / 256×144 / 外部asset 0
- 初回 `tools/blender/hazama_descent_key.py` low-cost render:
  **出力PASS、compositor未合格**
  Blender 5.2では `Scene.node_tree` が無く、既存 `setup_compositor()` が
  FOG_GLOWをskipすることを検出した。
- 承認後のnarrow compatibility patch:
  **5.2 / 4.5ともPASS**
  5.2は `Scene.compositing_node_group`＋socket式Glare `Bloom`、
  legacy 4.5は従来 `Scene.node_tree`＋`FOG_GLOW` へ分岐する。
  どちらもCycles CPU / 1 sample / 320×180でcompositor適用markerを出し、
  exit code 0とPNG生成を確認した。4.5対5.2の画素比較はPSNR 46.67 dB。
  5.2に残る `Material.use_nodes` / `World.use_nodes` warningは
  Blender 6.0向けdeprecationで、今回の5.2実行を妨げない。

証跡:
`C:\workspace\blender-worker\renders\hazama-game-smoke\20260723T150518Z\run-report.json`

Hazama固有生成器の5.2 API互換は低コストsmoke合格。最終1500×900候補の
採否は引き続き人間の目と別のasset採用gateで判断する。
warningだけを理由に5.1.2を変更・削除しない。

## Hazama Studio / Landscape-OSとの境界

### Hazama Studio

- Studioは独自の `blender/garden_528.py` と互換smokeを所有する
- 2026-07-23時点で5.2互換作業に未commit変更があるため、Hazama Gameから編集しない
- Studioのscene、render、進行中ファイルをimport/上書きしない
- 共有するのはlauncher selectorとrepo外worker rootの規約だけ

### Landscape-OS

- Landscape-OSはplan/perspective/SVG/GLB/BLEND、再import/reopen、
  protected task bundleの正本を所有する
- `landscape-protected` selectorの5.1.2はrollback用。Hazamaから変更・削除・昇格しない
- HazamaはLandscapeのprotected taskや`detect-blender.ps1`を呼ばない
- Landscapeの5.2移行可否はLandscape自身のcandidate branchとsmokeで判断する

### 共通境界

- 共通: `C:\workspace\blender-worker` と
  `bin\invoke-blender.ps1 -Runtime candidate`
- repo固有: scene生成script、docs、test、採用基準
- repo外: Blender本体、`.blend`、GLB、render、cache、大容量素材
- repo内: 人間レビュー済みの最終用途向け軽量assetだけ
- cross-repoの相対path import、Studio/Landscapeの作業tree参照、暗黙PATH解決は禁止

## 採用gate

Blender出力をHazama本編へ入れる作業は、このcandidateと別に扱う。

1. repo外で候補を生成
2. 人間が画像を実見し、用途、核を直接描いていないこと、匿名性、権利、容量を確認
3. WebP/JPGへ最終寸法・品質で最適化
4. 採用候補のpath/bytes/hashと、置換対象を提示
5. 明示承認後だけ専用runtime candidate branchでassetを置換
6. version四点同期、`node scripts/hazama-check.mjs`、実ブラウザ、mobile幅、
   PWA cacheを検証

この文書の作成とsmokeは、画像採用や本番置換の承認を意味しない。
