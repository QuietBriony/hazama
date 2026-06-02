# INTEGRATION-HANDOFF.md — コア移植の引き継ぎ（次セッション用）

統合フェーズ（slice→本体エンジン畳み込み）の作業引き継ぎ。**データ層＋認識ゲートのモデルまで完了・全 smoke 緑**。
残りは **engine のコア移植（depthMeta 描画／アート・音／認識UI）＋ version bump＋startup smoke 移行＋別プレビュー**。

- 上位: [INTEGRATION.md](INTEGRATION.md)（全体設計・段階）／[M2-spine.md](M2-spine.md) §7（slice 由来の各機能）。
- ブランチ **`claude/integration`**（`claude/m2-spine` 由来）。**master / 本番 / 現Codex公開 / 既存 slice プレビューは無変更**。
- 確定方針（ユーザー）: §3 方針β／§5 認識ゲート（ゲーム性残す・ハード・表層中立）／§8 smoke は実態へ移行／
  プレビュー別口／核=創作B。難易度は **可変パラメータ**（`HazamaGateRun.tuning`）。

## 完了済み（コミット・全 smoke 緑）

| 増分 | 内容 | commit |
|---|---|---|
| 0 | INTEGRATION.md（計画） | 5c78c9b |
| 1 | depthMeta 後方互換スキーマ＋`scripts/depth-meta-smoke.mjs` | 2c3dacc |
| 2 | G〜Z＋Ω＋A_reborn を depthMeta へ 1:1 転記（22ノード） | 5041174 |
| 3 | zero+A→A_start 二段マージ＋B〜F（導入ユーザー承認） | 62e6153 |
| 4 | det_* を八観ルートの環（連環）化＋hold 6ノード＋`scripts/route-smoke.mjs` | bfc8fd2 |
| 5a | 認識(attunement)モデルを `hazama-gate-run.js` へ＋balance-smoke 検証 | 6350784 |

**現状の到達点**:
- `hazama-depths.json` = 43ノード。29本筋（A_start…Z,Ω,A_reborn,HUB_NIGHT）の **options[] は完全不変**（後方互換）。
  全ノード（HUB_NIGHT 除く42）に `depthMeta`（voice[]/choices[]/observer/register/kan 等）。分岐は全て depthMeta.choices に。
- 八観ルート: `det_taikan`体/`det_hakan`波/`det_shikan`思/`det_zaikan`財/`det_sokan`創/`det_kanshasha`観察者/
  `det_kukan`空/`det_enkan`円。A_start の surface 選択→`det_taikan`で環入口。円観→体観で**連環**。各 det は別観ジャンプ＋前方合流(C)。
- hold: `zero_hold/E_noreturn/G_hold/O_hold/S_hold/X_hold`（退避＝抗っても降下して前進）。
- `hazama-gate-run.js`: `tuning`（可変・難易度）/`applyRecognition(state,kind)`/`isAttuned(state)`/`omegaUnlocked(state)`
  /`recognitionGain(kind)` を追加。**charge→won の資源ゲーム（5アクション/崩落）は不変**＝既存 balance 緑のまま。
  Ω解放 = `omegaUnlocked` = won かつ attuned（構造読みで育つ・周回持ち越し）。表層読みは中立(0)。
- smoke: `depth-meta`/`route` を `hazama-check.mjs` に追加。consistency 到達性は **options[]∪depthMeta.choices**。
  `below`(手続き的∞)は仮想ターゲット据置。**当環境では node 系7本が実質バー（全PASS）**。
  `startup-smoke.sh` は bash `/tmp`↔python `\tmp\` パス差で FAIL（内容アサーション未実行）＝環境問題。

## 残り作業（次セッション）— engine コア移植

> ここから初めて `hazama-main.js`/`hazama-style.css`/`index.html`/`sw.js` に触れる＝**version bump 必須**（§9）。
> 各段で `node scripts/hazama-check.mjs` の node 系を緑に保ち、ブラウザ観測変更は preview で検証（preview_*）。

### A. depthMeta 駆動の降下描画（キーストーン）
`hazama-main.js`:
- `renderDepth(depthId, opts)` **L3389**。本文描画 **L3434-3443** が `depth.story[]` を平坦に出している。
  → `depth.depthMeta?.voice[]` があれば **who 別クラス**（n/voice/self/cold/danger/body/scrawl）で出す。
  slice の1文字送りリビール（`slice.js renderNode` L388-459 / `--reveal-ms`）を移植。voice 不在は従来 story[] にフォールバック。
- `renderOptions(depth, optionsEl)` **L3319**。`depth.depthMeta?.choices[]` があれば **kind 別**（descend/surface/retreat）で描画。
  surface＝逸れマーク（⤳・点線枠）、descend＝砂紋ビュレット、retreat＝打ち消し。不在は従来 options[]。
- 仮想ターゲット解決: `__rejoin`/`__divert`/`__edge`/`below` を engine 側で実ノードへ。`below`(∞)は
  slice `genBelowNode(loop)`（手続き生成）を移植。

### B. 認識ゲート UI 配線
- 選択時に `HazamaGateRun.applyRecognition(runState, choice.kind)` を呼び `runState.attunement` 更新・保存
  （`saveRunState` L336 / runState は `createRunState` L269）。
- `canEnterOmega(state)` **L352**（現 `return state.gateRunStatus === "won";`）→ `HazamaGateRun.omegaUnlocked(state)` に。
  Ωロック表示（renderDepth L3392 / renderOptions L3350 の「扉100%で解放」）を **「認識が要る／構造を読め」** へ更新。
- `depthMeta.deep[]`（attuned のみ可視）は `HazamaGateRun.isAttuned(runState)` の時だけ描画＝認識が合う人だけ見える世界。
- ジャンクション(A_start/J)の構造/表層で認識が育ち筋が分かれる（A_start surface は既に→det_taikan）。
- **ゲーム性維持**: 既存 Gate Run パネル（dive/observe/tune/sync/retreat・扉charge・崩落）は残し、意味ラベルを
  「認識の合致＝扉の開き」へ。Ωは won＋attuned のハードな最終関門。

### C. 1信号で絵・音・テキスト駆動（アート/音移植）
slice の中心 `applyAtmosphere(node)`（`slice.js` L354-379）を `renderDepth` 末尾フックへ。共有信号
（sink/dread/observer/rank/worldSeed）を CSS 変数（`--sink/--press/--gi/--leak-rgb`）と各モジュールへ一括配布。
既存 `syncVisualMotion` **L555** がその足場。移植モジュール（slice.js → hazama-main.js）:
- `Audio` L587-735（6倍音+LFO+合成IR+鼓動・depth連動・glitchHit）。既存 inline BGM と統合・music-stack 非依存。
- `Mandala` L744-838（八観幾何・観測者で増・核は描かず void 拡大）。既存 `assets/hazama-goal-mandala` を canvas 化。
- `Garden` L850-958（反転重森＝砂紋/石組/市松苔・色相180°反転・**rAFなし**＝state変化時のみ＝モバイル軽量）。
- `Glitch` L964-1000＋CSS（RGBずれ/走査線裂け/datamosh・`--gi`・原色leak）。reduced-motion は静止フリンジのみ。
- `Peel`（遷移の塗装めくれ）/`applyCycle`（NODE_VARIANTS＋scrawl・mulberry32・初回不変）/`Route`（分岐・legacy 持ち越し）。
- CSS は `slice/slice.css`（30KB）から該当規則を `hazama-style.css` へ。`slice/index.html` の SVG タイトル・canvas 要素を `index.html`/`hazama-index.html`（**両者 identical 必須**）へ。

### D. タイトル/HUD
- 赤線廃止→かすれた構造文字タイトル＋**peel（捲れ）**＋動く表紙（`titleAmbient`・per-load seed・reduced-motion 静止）。
- ローグライク HUD を **沈下ゲージ＋戻り道＋観測者カウンタ**へ作り替え（stale markup 温存はしない＝§8）。

### E. version bump（§9 一括）＋ smoke 移行
bump 時に全部同値: `hazama-main.js`(`APP_VERSION`＋`Hazama main.js vX.YZ`)/`sw.js`(`VERSION`)/`index.html`＝`hazama-index.html`(全`?v=`)/
`scripts/pwa-static-contract-smoke.mjs`/`scripts/browser-first-playable-smoke.mjs`/`scripts/startup-smoke.sh`(＋python `?v=`)/
`README.md`(`## vX.YZ`＋`hazama-main.js?v=`)/`docs/hazama-game-dev-plan.md`/`docs/hazama-playtest-slices-v0.md`。
- **startup-smoke.sh python の ~80 文字列**は v2.39 機能サーフェスをハードコード。HUD作り替え・タイトル差替・Gate Run
  ラベル変更で壊れる箇所を**新サーフェスのアサーションへ更新**（削除でなく実態検証へ）。`hz-rogue-hud`/`DEPTH MAP`/
  `RUN LOG`/各Gate Run文言が対象。`hazama-consistency-smoke.mjs` の main/gate/style 文字列照合も同様に更新。
- 当環境では startup は実行されない（/tmp）。**node 等価チェックを足す**と移行が検証しやすい。

### F. 別プレビュー（本番無干渉）
- 既存 `hazama-preview`（slice）は**上書きしない**。統合専用の別口（新規 repo もしくは別パス）へ。
  デプロイ手順は [memory: hazama-preview-deploy] 準拠。cache-bust 実体確認。**master/本番/現Codex公開は無変更**。
- 完成（遊べる統合版が別プレビューに乗る）でユーザーへ URL 報告。

## 次セッションの推奨着手順
1. 本書＋INTEGRATION.md §5/§6/§8/§9 を読む。`hazama-gate-run.js` の新 API（tuning/applyRecognition/omegaUnlocked）確認。
2. **A（depthMeta 描画）→ B（認識UI/Ω）** をまず緑で landing（version bump 同時）。preview で降下を視覚確認。
3. **C（アート/音）** を段階移植（Garden→Glitch→Audio→Mandala→Peel→applyCycle 順が安全）。
4. **D（タイトル/HUD）→ E（smoke 仕上げ）→ F（別プレビュー）**。
5. 各段 node 系 smoke 緑＆コミット。トークン上限が近ければ本書を更新して引き継ぐ。

## 難易度チューニング（実機調整）
`HazamaGateRun.tuning`: `attuneOmegaThreshold`(=6 Ωに要る認識)/`attuneStructuralGain`(=1 構造読み増)/
`attuneSurfaceGain`(=0 表層中立)/`attuneRetreatGain`(=0)/`attuneMax`(=99)。engine 露出して実機で可変に。

