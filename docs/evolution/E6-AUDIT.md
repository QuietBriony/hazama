# E6 — E1〜E5 本番コード 敵対的監査と修正

> **Status: 完了（2026-06-13）** — branch `claude/evolve-e6-polish`。本番反映は号令待ち。
> 現行の構成・検証は `README.md` と `scripts/hazama-check.mjs` が正。

## 監査の方式

E1〜E5 の多くは委任エージェント（sonnet/opus）が実装し、Fable は diff レビューと
ブラウザ抜き取り検証で受領していた。本番反映後、**多エージェント敵対的監査**で本番コードを
全数走査した（review→verify パイプライン・cheap-tier・agent 52体）。

- **Review（7次元）**: 永続化 / 認識・エコー門 / 視覚JS / CSS・reduced-motion / a11y・perf /
  smoke契約 / データ整合 — 各次元が本番ファイルを実読し構造化 finding を報告。
- **Verify（各 finding に2レンズの懐疑者）**: レンズA=実在トレース、レンズB=設計意図/ガード照合。
  「迷ったら反証」で偽陽性を排除。
- **Critic**: 機構の相互作用（エコー門×spiral×周回、phase-break×glitch schedule 等）の見落とし指摘。

結果: 22 findings → 15 確定。**核心ロジック（spiral 永続化・認識・エコー門・ガーデン構図・
phase-break）にクラッシュ/ロジックバグはゼロ**＝委任実装の健全性が裏取りされた。
確定はすべて a11y / reduced-motion / perf / 契約カバレッジ / 死蔵データの周辺品質。

## 修正した確定 finding（E6）

| # | 重大度 | 内容 | 修正 |
|---|---|---|---|
| reduced-motion leak | high/med/low | `.hz-gauge-fill`(1.4s伸縮)・`body`(2.6s 地色)・`.hz-return-paths i`(.8s) が reduced-motion で抑制されていなかった | reduced-motion ブロックへ `transition:none` 追加 |
| gate-enter focus 迷子 | high | enter 後も不可視の「沈む」ボタンがタブ順に残り、Tab が最初の選択肢へ届かない | enter() で `geBtn.disabled = true` |
| aria-live 過多読み上げ | high | reveal の行ごと非同期 append が aria-live(polite) を断片的に何度も発火 | `setBusy()` で reveal 中 `aria-busy=true`→確定で false（1ノード一括読み上げ） |
| drift 死蔵ノード | med | `drift` ノードと `returnDrift` キーが到達不能（どの choice も指さず未消費） | JSON から削除＋`_meta`/コメントを実挙動へ整合（履歴は git） |
| 残留 glitch クラス | low | 縁で発火した `glitch-hard`/`leak-on` が再降下直後の零章に焼き付く可能性 | descendAgain/restart の classList.remove を拡張 |
| 表紙 interval | low | titleAmbient の setInterval がタブ非表示でも Garden を再描画（Mandala/Glitch は停止済み） | コールバック先頭で `if (document.hidden) return;` |
| smoke 契約穴 | low | transient 検査に `sink` 欠落・`deep:true` が descend 限定の不変条件未検証・ECHO_GATES 実在未検証 | build-consistency に3アサーション追加 |

## 棄却した finding（第2懐疑者が by-design と反証・修正せず）

- **`.hz-chip` 23px タップ標的**: ソースコメント「物語の選択ではないので chip として小さく」＝意図。WCAG 2.5.5 は AAA 助言。
- **Garden seed=0 → `||1` 置換**: 同一 state は常に同一 seed へ写像＝決定論は保たれる。titleAmbient と同じ防御パターン。
- **reduced-motion 内 `.hz-bg-descent` 重複宣言**: 同値の無害な重複（R6 コメント付き再掲）。
- **cycle cap が mutation サイトに無い**: 9999 到達は単一セッションで実質不能、下流は剰余/Math.imul で安全。
- **SESSION-LEDGER smoke が E4/E5 を列挙しない**: spot-check 設計＝進化ごとに needle を足す契約ではない。

## 検証

- `node scripts/hazama-check.mjs` → 2 PASS / 0 FAIL
- ブラウザ（localhost:8740・SW/storage クリーン）: reduced-motion 3規則の実在・gate-enter
  disable・aria-busy ライフサイクル（reveal=true→choices=false→echo=false）・エコー門 真+2・
  Ω縁・**再降下で glitch-hard/leak-on/phase-break/surfaced 残留が全 false**・console error 0。
