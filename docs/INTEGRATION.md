# INTEGRATION.md — Hazama 統合プラン（slice → 本体エンジン畳み込み）

Claude のプレビュー成果（`slice/`）を、Codex が作った本番ゲームエンジン
（`hazama-main.js` / `hazama-depths.json` / PWA / smoke / autonomy）へ畳み込み、
**本番候補**を作るための実行設計。M2-spine §5.5「コアへ畳み込む手順」を、実コードの
制約に当てて具体化したもの。

> 上位文脈: [M2-spine.md](M2-spine.md)（背骨・棚卸し・maps_to）／[../AGENTS.md](../AGENTS.md)（技術契約）。

---

## 0. 最重要の安全制約（絶対）

- **`master` へ push / merge しない。** 本番 GitHub Pages（現 Codex 版公開）を一切変更しない。
- 本番入れ替えは **ユーザーの明示の号令があるまで絶対にやらない**。
- 作業は統合用ブランチ **`claude/integration`**（`claude/m2-spine` から分岐）で行う。
- 確認は **別プレビュー**（`hazama-preview` 系 or 新規 integration プレビュー。本番 Pages とは別）に出す。
- 旧版は git 履歴で保全。置き換え＝削除はしない。判断・要確認は **メッセージで**（AskUserQuestion 不可）。

---

## 1. ゴールと完成条件

**ゴール**: Codex のゲーム機構（HUB_NIGHT ハブ・Gate Run ループ・PWA/オフライン・HUD・smoke・autonomy）を
**残した上に**、Claude の体験（37ノード降下・分岐エンジン m2-15・認識ゲート・R5/R6/R7 アート・
内製 depth リアクティブ音・動く表紙・peel タイトル）を融合する。

**完成条件（統合版＝本番候補）**:
1. 1本の **深度/state 信号**で、絵・音・テキストが一緒に駆動する（slice の `applyAtmosphere` 構造を本体側でも維持）。
2. **Gate Run = 認識ゲート（資格ゲート）** に作り替え：反射でなく構造/認識を読めるかで通す。表層・字義読み＝
   弾かれて**別ルートへ分岐して前進**（同じ所へ戻すループにしない）。構造読み＝降下。深層は **attuned のみ可視**。
3. **周回で物語が分岐・状態持ち越し**（Route / legacy / det_* を本体ノード体系 `A_start…Z, Ω, A_reborn` へ統合）。
4. **タイトル**：赤線をやめ、かすれた・構造的な文字タイトル＋ peel（捲れ）演出。
5. 本文の可読性（R4 方式）維持。
6. `node scripts/hazama-check.mjs` 全 PASS 維持（smoke 契約は本統合に合わせて拡張。§8）。version 整合維持。
7. 統合版が別プレビューでスマホ確認できる。

---

## 2. 資産インベントリ（残す / 拡張 / 差し替え）

M2-spine §5.5 を実コードで確定:

| 資産 | 判断 | 統合での扱い |
|---|---|---|
| `hazama-main.js`（v2.39, 3,649行：renderDepth / Gate Run / Breath / Music / PWA） | **残す＋畳み込み** | 描画層に slice の沈下レンダラ・Audio・Garden・Mandala・Glitch・Peel・Route を移植。state を拡張 |
| `hazama-depths.json`（29ノード A_start…Z,Ω,A_reborn,HUB_NIGHT） | **拡張** | ID 温存。`depthMeta`/option 拡張を後方互換で追加。det_*/holds を新ノードとして反映（§4） |
| `hazama-gate-run.js`（決定論モデル） | **残す→再解釈** | 数値を「沈下/戻りやすさ/attunement」へ読み替え。below(∞) 断片生成器に転用（§5） |
| ローグライク HUD（FLOOR/CALM/SYNC…） | **作り替え（意図的変更）** | 常時計器を沈下ゲージ＋戻り道＋観測者カウンタへ。**stale な markup を隠して残すのでなく、HUD を実態に作り替え、smoke を新サーフェスへ移行して緑維持**（§8。ユーザー方針：変更を諦めない） |
| inline Web Audio（`startInlineBgm` 等） | **拡張** | slice `Audio`（6倍音＋LFO＋convolver＋鼓動・depth 連動）へ拡張。music-stack 非依存維持 |
| Music companion（postMessage / depth.html ブリッジ） | **残す（任意）** | 既存の別タブ/別 iframe 連動は温存。内製音が主、companion は併存（R5 以降 iframe 連動は slice 側で廃止済み＝内製音が既定） |
| PWA（manifest/sw/icons） | **残す** | install/offline 不変。cache 名は version bump のみ |
| smoke 群 / `hazama-check.mjs` / `AGENTS.md` / autonomy | **残す＋拡張** | 既存緑を保ちつつ、新スキーマ・認識ゲート・Route 用アサーションを追加（§8） |
| `index.html` / `hazama-index.html`（identical 必須） | **残す** | SVG タイトル・canvas 要素を追加。両者 identical を維持（smoke 必須） |

---

## 3. ノードID対応の調整（maps_to の衝突解消）— **要設計判断**

slice 42ノード → production 29ノードの `maps_to` を実測した結果、**零章ぶんの1段オフセット**があり、
**衝突**が起きている:

```
slice   zero  A   B   C   D   E   E_noreturn  F   G…Z   Omega below reborn drift/det_*
prod    A_start B  C   D   E   F   F           F   G…Z   Ω     Ω    A_reborn HUB_NIGHT
                                   └─────────┴── 3つが production F に衝突
```

- `zero`(零章) と `A`(深度A) を slice は分離。production は `A_start`(=深度A) のみ＝零章ノードが無い。
- そのため slice `A→B, B→C … E→F` と1段ずれ、`E / E_noreturn / F` の3つが production `F` に潰れる。
- **`G` 以降は 1:1**（`G→G … Z→Z, Omega→Ω, reborn→A_reborn`）で衝突なし。

### 推奨：**方針β（production 29ノード骨格を維持し、編集的に解消）**

理由：`A_start` は `DEFAULT_START` としてコードと smoke にハードコード
（`reachable from A_start` / `A_start must route to HUB_NIGHT`）。renaming はリスク。骨格 ID は温存し、
オフセット region（zero…F）だけ**人手の対応表**で衝突を解く。

| slice ノード | production ノード | 統合方針 |
|---|---|---|
| `zero` ＋ `A` | `A_start` | 零章の助走＋深度A導入を `A_start` の `depthMeta`（2ビート／多声 voice）へ統合。八観導入はここ |
| `B`〜`E` | `B`〜`E` | 1:1。slice の本文/options を `depthMeta` で転記 |
| `F` | `F` | slice `E→F` と `F→F` を **F に集約**（編集的にマージ） |
| `G`〜`Z` | `G`〜`Z` | 1:1。機械的転記 |
| `Omega` | `Ω` | 1:1 |
| `below`(∞) | （新規 or `Ω` 内 procedural） | §5。`Ω` の下方フックとして engine 側 procedural state。固定ノード化しない |
| `reborn` | `A_reborn` | 1:1。state 持ち越しで周回 |
| `zero_hold / E_noreturn / G_hold / O_hold / S_hold / X_hold` | （新規 hold ノード or overlay state） | §4。退避の落とし先。engine 側 transient でも、reachable な新ノードでも可 |
| `det_mirror / memory / cothink / otherself / scar` | （新規 det ノード） | §4。寄り道イベント。`__rejoin` で本筋前方へ合流 |
| `drift` | `HUB_NIGHT` or 新規 drift | 退避の落とし先。沈下は残す |

> 代替（方針α：production に零章ノードを増設して 1:1 化）は ID 体系が綺麗になるが、`A_start` 周りの
> ハードコード・smoke を広範に触る。**デフォルト＝β**。αへ切替可能な形で進める。

**この対応表は実装時にユーザーへメッセージ報告し、衝突マージ（特に F の集約と zero/A 統合）の編集判断を確認する。**

---

## 4. データスキーマ拡張（後方互換）と det_*/holds の反映

既存ノード（`id/title/story[]/options[]/theme/color`）に**任意フィールドを追加**するだけ（無ければ従来挙動）:

```jsonc
{
  "B": {
    "id": "B", "title": "...", "story": ["..."], "color": "#66bbff",
    "options": [ /* 既存 first-playable 用は温存 */ ],
    "depthMeta": {                  // ← 追加。無ければ従来描画
      "register": "descent",
      "maps_from": "B",             // slice 由来トレース（監査用）
      "voice": [ {"who":"voice","text":"..."}, {"who":"self","text":"..."} ],
      "observer": 2,                // 観測者枚数（深いほど増・多声化）
      "sinkFloor": 0,               // この深度の最低沈下（戻っても残す）
      "deep": ["..."],             // attuned のみ可視の深層行（§5。surface 読者には出ない）
      "core": false,                // 核は描写しない（true は禁止に近い）
      "choices": [                  // 認識ゲート用拡張 option（descend/surface/retreat）
        {"text":"構造として指でなぞる","next":"C","kind":"descend","sink":2,"dread":0.2,"close":1},
        {"text":"ただの風景として眺める","next":"__divert","kind":"surface"},
        {"text":"息を整え戻る","next":"HUB_NIGHT","kind":"retreat","sink":0}
      ]
    }
  }
}
```

- **det_* / holds / drift**：原則 **`hazama-depths.json` に新ノードとして追加**（`id/story/options` を満たせば
  consistency smoke の reachability・no-missing-edge を通る）。`__rejoin`/`__divert`/`__edge` のような
  仮想ターゲットは engine 側で本筋前方ノードへ解決（実 `next` は常に実在 ID へ正規化して JSON に書く）。
- `slice/depths-shell.json` が拡張スキーマの**動く実例**。`maps_to` を逆引きして production 同ID へ転記。
- **後方互換が肝**：`depthMeta` 不在ノードは現行 renderDepth 挙動のまま。first-playable ルートを壊さない。

---

## 5. Gate Run → 認識ゲート（資格ゲート）への作り替え

**現状（Codex）**：`dive/observe/tune/sync/retreat` の資源ミニゲーム。`gateRunCharge>=100` で勝利＝Ω解放。
反射・資源管理。`stability/resonance/marks` を消費。

**目標（融合）**：「**構造/認識を読めるか**」で通す資格ゲート。表層読み＝弾かれ別ルートへ前進。構造読み＝降下。
深層は **attuned のみ可視**＝「認識が合う人だけ見える世界」。ハード難易度可。

### 設計

1. **認識（attunement）スカラの導入**：構造読み（`kind:"descend"` の八観系選択）で `recognition` を加算、
   表層読み（`kind:"surface"`）で伸びを止め deflection を消費。`recognition` が閾値を超えると **attuned**＝
   `depthMeta.deep` 行と Ω 進入が解禁。これが「認識が合う人だけ見える世界」の機構。
2. **hazama-gate-run.js は残して再解釈**：既存の決定論モデル（stability/resonance/charge）を捨てず、
   - `gateRunCharge` → **「扉＝認識の合致度」**（attunement の可視量）として読み替え。
   - `stability/resonance` → **「沈下/戻りやすさ」**（深いほど戻りにくい）として読み替え。
   - below(∞) の手続き的断片生成器（UCM 9軸由来）にも引き続き転用（§6・M2-spine §4-6）。
   - balance smoke が参照する定数・不変条件は**壊さず**、ラベル/解釈をゲートの意味へ寄せる。
3. **認識ゲートの本体**：Ω 直前（および主要ジャンクション A/J）で、構造を提示し「構造を engage する読み」を
   選べたかで通す。slice の `Route.resolve` / `resolveResist` / perception-gate（`kind:"surface"`）を本体へ移植し、
   既存 `applyGateRunAction` の resource UI と**二層**で共存（資源ミニゲームは縮小、認識ゲートが前面）。
4. **表層読み＝前進する deflection**：`kind:"surface"` → `Route` が seed で det_* を選び**本筋前方へ合流**
   （戻りループにしない）。`surfaceBounces++` で次周の地形（`det_scar` 出現等）が変わる。
5. **戻れなさの逓増**：観測者数（深度）で retreat 結果が変わる（slice `resolveResist`：浅=少し戻れる／
   中=抗えるが引き込む／深=戻れない）。Ω 進入は attuned 必須でハード化。

> 注：これは Gate Run の**削除でなく再解釈**。M2-spine §5.5「残す→再解釈」に忠実。
> **ユーザー方針：ゲーム性はあった方がいい派＝過度に縮小せず、意味あるゲーム手応え（資源/扉/勝敗の緊張）を
> 残す**。資源ミニゲームは認識ゲートの下層に手応えとして併存させ、バランスは増分5で立ち止まって確認する。

---

## 6. アート・音の移植（1信号で絵・音・テキストを駆動）

slice の中心構造 `applyAtmosphere(node)` を本体 `renderDepth` の描画後フックへ移植する。共有信号:

```
sinkNorm = sink / SINK_SCALE          // 沈下（描画速度）
depthN   = max(sinkNorm, rank / 28)   // 最大深度
densityN = (observer - 1) / 18        // 観測者（多声）
dr       = dread                       // 圧（不協和・鼓動）
worldSeed = hash(world) ^ cycles ^ maxRank ^ surfaceBounces ^ rank  // 分岐と同じ信号
```

これを CSS 変数 `--sink/--press/--gi/--leak-rgb` と、`Audio.update / Mandala.update / Glitch / Garden.update`
へ一括配布＝**テキストを分岐させているのと同じ信号が背景構図・音も組み直す**（R7 の核）。

移植モジュール（slice.js → hazama-main.js 内モジュール化）:

| モジュール | 内容 | 注意 |
|---|---|---|
| `Audio`（R1/R7） | 6倍音＋LFO＋合成IR残響＋鼓動。depth で開花・沈むほど暗低密広。glitchHit で音も裂ける | music-stack 非依存。AudioContext 解禁はユーザー手勢内。既存 inline BGM と統合 |
| `Mandala`（八観幾何） | 8回対称・観測者で層/スポーク増・沈むほど暗彩度↓・高dread 不協和リング。中心核は描かず void 拡大 | 既存 `assets/hazama-goal-mandala` を canvas へ置換。reduced-motion 静止 |
| `Garden`（R7 反転重森） | 砂紋/石組/市松苔を色相180°反転（砂→青/苔→マゼンタ）。深いほど opacity↑で descent 写真と入替 | **rAF なし**＝state 変化時のみ描画＝モバイル軽量。screen blend |
| `Glitch`（R5/R7） | バーストで RGBずれ＋走査線裂け＋datamosh。`--gi=depth*0.85+圧*0.28`。原色 leak 同調 | reduced-motion は薄い静止フリンジのみ。タブ非表示で停止 |
| `Peel`（R5） | 遷移でぎざ縁の層が一枚めくれて降りる | 本文可読性は不変 |
| `applyCycle`（R5） | NODE_VARIANTS＋scrawl 割り込み。cycle/visits を mulberry32 seed に。初回は不変 | 実行時LLM無し |
| `Route`（m2-15） | 分岐・det_*・surface deflection・周回別ルート・legacy 持ち越し | §3/§5 と接続 |

- **本文可読性（R4）は無改変**。荒々しさは枠/タイトル/差し色/背景/遷移/scrawl で出す。
- 二重鳴り回避・reduced-motion 尊重・タブ非表示で rAF 停止、を本体側でも維持。

---

## 7. タイトル（赤線廃止 → かすれ構造文字 ＋ peel）

- R7 で王冠は削除済み・砂紋3本へ置換済み。本統合では **赤線（旧 production タイトル装飾）をやめ**、
  かすれた・構造的な文字タイトル（inline SVG、骨白＋微傾き＋荒い下線、核は打ち消し線で「描かれない否定」）にする。
- **動く表紙**（`titleAmbient`）：ゲート背景に反転ガーデンを薄く宿し per-load seed で毎回別構図。グリッジが時折裂き、
  原色明滅。enter で深度信号へ明け渡す。reduced-motion は静止1枚・明滅なし。
- **peel 遷移**：捲れていく演出。タイトル→本編、各深度遷移で `Peel.play()`。
- production の旧タイトル markup を差し替えるが、smoke が文字列を要求する場合は §8 で同期。

---

## 8. smoke 契約の移行（**最大のリスク管理ポイント**）

`scripts/hazama-consistency-smoke.mjs` と `startup-smoke.sh` 内 python は、**v2.39 の機能サーフェスを
リテラル文字列でハードコード**している（`hz-rogue-hud` / `DEPTH MAP` / `RUN LOG` / Gate Run 各文言 /
Music / BGM / `hz-loop-priority` など多数）。HUD 縮小・タイトル差し替え・Gate Run 再解釈は
**これらのアサーションを壊す**。よって smoke は本統合と**同時に移行**する。

**方針（ユーザー確定）：smoke を新サーフェスへ移行する。stale な markup を隠して古い文字列を温存する
延命はしない。タイトル差替・HUD 作り替え・Gate Run 再解釈は"意図的変更"であり、テストを実態に合わせて
更新し、hazama-check は意味のある形で緑を保つ。変更を諦めない。**

1. 廃止する旧サーフェス（例：ローグライク HUD の `DEPTH MAP`/`RUN LOG` 等）に対応する smoke アサーションは
   **新サーフェスのアサーションへ置換**（その機能が新 UI で何に化けたかを検証する形に書き換え）。
2. 残すが再解釈する機能（Gate Run の手応え／Ω 解放／周回）は、**新しい意味のラベル・導線を検証する
   アサーションに更新**。形骸の文字列照合でなく、実際に機能が在ることを確かめるチェックにする。
3. **新アサーションを足す**：depthMeta スキーマ（`depthMeta`/`deep`/`kind:"surface"`）、Route/legacy
   持ち越し、認識ゲート（attunement/Ω は attuned 必須）、Audio/Garden/Glitch の depth 連動フック、
   peel タイトル。新規 `scripts/depth-meta-smoke.mjs` / `route-smoke.mjs` を追加。
4. **version 同期**：`hazama-consistency` は version をハードコード照合する。bump は §9 の全ファイルを一括更新。
5. **環境メモ**：当環境では `startup-smoke.sh` が bash `/tmp` と node/python のパス差で FAIL する
   （`\tmp\hz_root.html` 読めず＝内容アサーション未実行）。**実質バーは node 系5本**
   （autonomy-docs / pwa-static-contract / hazama-consistency / balance / first-playable）の全 PASS。
   startup の python アサーションは内容確認用に別途手動実行（同等チェックを node で代替する補助も検討）。

---

## 9. version bump チェックリスト（一括更新）

`APP_VERSION` は多数ファイルに散在。bump 時は**全部**を同値に:

- `hazama-main.js`：`const APP_VERSION = "vX.YZ";` と `Hazama main.js vX.YZ`
- `sw.js`：`const VERSION = "hazama-pwa-vX.YZ";`
- `index.html` / `hazama-index.html`：全 `?v=X.YZ`（両者 **identical** 必須）
- `scripts/pwa-static-contract-smoke.mjs`：`const APP_VERSION = "X.YZ";`
- `scripts/browser-first-playable-smoke.mjs`：`hazama-pwa-vX.YZ`
- `scripts/startup-smoke.sh`：`Hazama main.js vX.YZ` と `hazama-pwa-vX.YZ`（および python の `?v=X.YZ`）
- `README.md`：`## vX.YZ` と `hazama-main.js?v=X.YZ`
- `docs/hazama-game-dev-plan.md` / `docs/hazama-playtest-slices-v0.md`：`vX.YZ` 言及

> プレビュー実体確認は cache-bust（`?cb=$RANDOM`）必須。

---

## 10. 段階的ロールアウト（増分プラン）

各増分の最後に **node 系 smoke 5本 PASS を確認＆コミット**。要所はメッセージ報告。

- **増分0（本書）**：`docs/INTEGRATION.md` 作成。`claude/integration` ブランチ。**✅完了 5c78c9b**
- **増分1（スキーマ土台）**：`depthMeta` 後方互換導入＋`depth-meta-smoke.mjs`。パイロットG。**✅完了 2c3dacc**
- **増分2（データ転記：G〜Z＋Ω＋reborn の 1:1）**：22ノード転記。**✅完了 5041174**
- **増分3（オフセット解消：zero+A→A_start, B〜F）**：§3 編集マージ。導入可読性ユーザー承認済み。**✅完了 62e6153**
- **増分4（det_*八観ルート化／holds）**：det_* を八観の環(連環)へ。hold 6ノード。route-smoke 追加。
  main の options[] 不変・分岐は depthMeta。**✅完了 bfc8fd2**
- **増分5a（認識モデル）**：`hazama-gate-run.js` に attunement/omegaUnlocked/tuning。balance-smoke 検証。
  charge→won 不変＝version bump 不要。**✅完了 6350784**（バランス方針ユーザー確定：ハード・表層中立・ゲーム性維持）。
- **増分5b/6（コア移植）**：engine が depthMeta を読んで降下/分岐/深度信号を描画＋認識UI＋アート/音＋
  タイトル/HUD＋version bump＋startup smoke 移行。**⏭ 次セッション**。詳細手順＝[INTEGRATION-HANDOFF.md](INTEGRATION-HANDOFF.md)。
- **増分6（アート・音移植）**：Audio/Mandala/Garden/Glitch/Peel/applyCycle/applyAtmosphere を本体描画層へ。
  reduced-motion・モバイル軽量・二重鳴り回避。
- **増分7（タイトル/HUD）**：赤線廃止→かすれ構造タイトル＋peel＋動く表紙。HUD 縮小（markup 残し非表示）。
- **増分8（version bump ＋ smoke 仕上げ ＋ プレビュー）**：§9 一括 bump。全 smoke 緑。別プレビューへデプロイ。
  スマホ確認 URL をユーザーへ。

> 増分は分割/前後し得る。各段で「できたこと・確認 URL・残課題」を報告。

---

## 11. リスクと検証

| リスク | 対策 |
|---|---|
| smoke の v2.39 ハードコードを壊す | §8。markup 温存＋smoke 同時移行。各増分で node 系5本確認 |
| maps_to 衝突（F 集約・zero/A 統合）の編集判断 | §3 対応表をユーザー報告し合意してから転記 |
| `A_start`/DEFAULT_START のハードコード破壊 | 方針β で ID 温存。renaming しない |
| モバイル性能（canvas/rAF） | Garden は rAF なし・state 変化時のみ。Glitch バースト式・タブ非表示停止。reduced-motion 尊重 |
| 音の二重鳴り・自動再生制限 | 内製音を既定・companion 併存。AudioContext 解禁はユーザー手勢内（slice 磨き込み5 の堅牢化を踏襲） |
| 本番誤反映 | master 触らない。別プレビューのみ。deploy は hazama-preview 系へ（[memory: hazama-preview-deploy]） |
| 当環境の startup smoke FAIL（/tmp パス） | 既知の環境問題。node 系5本を実質バーに。startup は手動/別経路で内容確認 |

**検証手順（各増分）**:
1. `node scripts/hazama-check.mjs` → node 系5本 PASS（startup は環境 FAIL 許容、内容は別途確認）。
2. ローカルで主要ルート（A_start→…→Ω→A_reborn→HUB）と認識ゲート（surface 弾き→det 前進／構造読み→降下）、
   周回での別ルート、reduced-motion を確認。
3. 別プレビューへデプロイ→ `curl ...?cb=$RANDOM` で実体確認→スマホで視覚/音の最終確認。

---

## 12. プレビュー・デプロイ（本番無干渉）

- 本番 Pages（現 Codex 公開）と **別**の integration プレビューに出す。
- **確定（ユーザー）：別口**。既存 `hazama-preview`（slice プレビュー）は**上書きしない**。統合専用の別プレビューへ
  出す（新規 repo もしくは hazama-preview 内の別パス。増分8 着手時に具体先を確定し URL 報告）。
- 反映確認は cache-bust 実体チェック必須。**master / 本番 hazama / 既存 slice プレビューは無変更**。

---

## 付録：ユーザー確定事項（2026-06-02）

1. **ノードID対応 §3：方針β で確定**（骨格温存・衝突域 zero〜F だけ編集マージ・A_start 温存）。
   ただし**増分3で zero+A→A_start 統合後、零章→A の作り込んだ導入が削れず・ちゃんと読めるかを確認して報告**。
2. **smoke §8：実態へ移行で確定**（stale 文字列の温存延命はしない。テストを新サーフェスに合わせ緑維持。変更を諦めない）。
3. **Gate Run §5：再解釈で確定。ゲーム性は残す**（過度に縮小せず意味あるゲーム手応えを維持）。バランスは増分5で立ち止まり確認。
4. **プレビュー §12：別口で確定**（既存 hazama-preview を上書きしない。統合専用の別プレビューへ）。
5. **核（Ωより深い層）：B＝創作で確定**（M2-spine §5）。

**立ち止まりポイント：増分3（導入の可読性確認）／増分5（Gate Run・認識ゲートのバランス確認）。**
</content>
</invoke>
