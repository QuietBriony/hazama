# Backlog — Hazama

Hazama 自律開発の作業待ち行列。
新しい session はここから次の仕事を 1 つ取る。

## 使い方

- **取る**: priority 上位で、この session で完了できる item を選ぶ。
- **claim**: 並列時は `status: wip — <agent> <date>` を足して衝突を避ける。
- **閉じる**: 完了したら `Done` へ移し、[SESSION-LEDGER.md](SESSION-LEDGER.md) に記録する。

## Item Schema

```text
### HZ-BL-00X — Title
- priority : P0 | P1 | P2 | icebox
- scope    : docs | smoke | runtime | balance | verify | research
- agent    : codex | claude | either | human
- human-gate: yes | no
- status   : open | wip — <agent> <date> | done
- source   : origin
- detail   : acceptance criteria
```

---

## P1

### HZ-BL-001 — PWA install / offline human pass
- priority : P1
- scope    : verify
- agent    : human
- human-gate: yes
- status   : open
- source   : v2.34 PWA shell（対象は現行の没入版単一ビルド）
- detail   : 実機ブラウザで install prompt、standalone 起動、初回 visit 後の offline reload、
  「沈む」→ 零章 → 数手の降下、リロード後の spiral 記憶（表紙が応え、次の「沈む」で
  周回が深まる）を確認する。agent は手順整理と結果記録まで。
  現在の実施対象は最新の Pages 没入版（version は README 沿革を参照＝ここに固定値を書かない）。
  手順書は `docs/autonomy/pwa-install-offline-checklist.md`、結果テンプレートは
  `docs/autonomy/pwa-install-offline-result-template.md` に準備済み。

### HZ-BL-002 — Immersive build manual play notes
- priority : P1
- scope    : verify
- agent    : either
- human-gate: yes
- status   : open
- source   : `docs/hazama-playtest-slices-v0.md`（対象は現行の没入版）
- detail   : 5〜8分の通しプレイで、没入読書の手触り、認識◆が「構造で読む」に応えて
  育つ伝わり方、二極終端（深度Ω 到達 ⇄ 浮上）の納得感、縁の二択
  （もう一度沈む / すべて忘れる）、縁カードの体感を記録する。
  数値調整（`slice.js` の ATTUNE / RESIST_STRAIN / DEEP_LOCK）はメモ後。
  人間記録テンプレートは `docs/playtest/human-playtest-template.md`。

### HZ-BL-003 — Gate Run balance evaluation after notes
- priority : P1
- scope    : balance
- agent    : either
- human-gate: no
- status   : retired — 2026-06-12 逆統合で Gate Run 資源ゲームを撤去、対象消滅
- source   : `docs/hazama-game-dev-plan.md`
- detail   : （歴史）forward 版 Gate Run の数値調整枠。現ビルドの手触り調整は
  `slice.js` の ATTUNE / RESIST_STRAIN / DEEP_LOCK 定数＋manual play note で行う
  （HZ-BL-002 のメモが前提）。

## P2

### HZ-BL-012 — 音の軸色＋浮上/reborn の「呼気」
- priority : P2
- scope    : runtime(audio)
- agent    : either
- human-gate: yes（音はヘッドレス検証不能＝人間の耳が受け入れ条件）
- status   : 実装済（E21 本番 ?v=e21・master af9e9c8）— 耳の採否待ち（human-gate）
- source   : Tier2 構想（E1 最終報告）
- detail   : 軸タグ→スケール/モードの微変調。浮上/reborn に「解決音ではない呼気」だけの
  専用音状態。実装後、実機で人間が聴いてから採否判断。
  E21 で第一版を実装・本番反映済み（?v=e21）。音質の採否は実機で人間が聴いてから＝耳待ち（Done へは移さない）。

## Ready Prompts

次の agent に渡す短い依頼文は `docs/autonomy/next-agent-prompts.md` にまとめています。
handoff 前の確認は `docs/autonomy/closeout-checklist.md` を使います。

## Icebox

### HZ-BL-007 — Route content expansion
- priority : icebox
- scope    : runtime
- agent    : human
- human-gate: yes
- status   : open
- source   : post-first-playable
- detail   : 没入ビルドのまま、NODE_VARIANTS / detour / below 断片バンクへ
  `docs/source/` の原典素材を給餌するかを決める。今は増やさない。
- note     : 形「限界の声が testament を遺して消える」（form 2）は E23 で座席化済み・本番反映済み
  （?v=e23・master 0c31ecd）。既存 Drift seam（authored-only / save-less）に `Drift.TESTAMENT` 8種＋
  `pickTestament`（別ソルト picker）を足し、below(∞) の attuned 単一 seat に半々で漂着する。素材＝
  `docs/research/seven-forms-resonance-v0.md`（韻）＋`docs/research/testament-seed-bank-form2-v0.md`
  （種バンク 18→8 を curate）＋`docs/evolution/E23-SPEC.md`（発注）。残る form（1/3/4/5/6/7 の類）と
  原典本文の大量給餌（NODE_VARIANTS / detour / below バンク増量）は依然 icebox＝今は増やさない。

### HZ-BL-014 — Runtime hardening seams（guard-if-touched・監査由来）
- priority : icebox
- scope    : runtime(narrow)
- agent    : either
- human-gate: no
- status   : open
- source   : 2026-07-11 E16–E23 統合健全性監査（**バグではない**・将来 edit 時の guard として記録）
- detail   : ①`resolveResist` の `target === "__edge"` 分岐は `state.wagered` を設定しない。現状 `__edge` は
  reborn の terminal:true 2択のみ＝`choose` 経路（wagered 設定あり）を通り当該分岐は到達不能な防御コード。
  将来 non-terminal retreat を `__edge` へ向ける場合は wagered の設定/リセットを要確認（stale で E19 Ω 判定が誤り得る種）。
  ②`legacy.cycles`/`legacy.maxRank` は下限 clamp のみで上限（9999）なし。用途は seed（`Math.imul` で wrap）＝現状無害。
  改竄 payload の上限を揃えるなら load の clamp を legacy にも適用。**どちらも今は修正不要**。

---

## Done

### HZ-BL-011 — spiral 記憶のエッジ堅牢化 ✅ 2026-07-07
- scope: smoke / runtime(narrow)
- E4 で実装済みだった spiral guard（`hazama_spiral_v1`）を Hermes が独立検証。
  Local Chrome headless + CDP で壊しデータ matrix 6/6 PASS: 壊れた JSON、型異常、
  visits 値浄化/上限 clamp、旧 forward keys (`hazama_state_v2` / `hazama_run_v1`) ignore+非削除、
  `getItem` SecurityError boot、`setItem` QuotaExceeded during first descent no-op。
  新規欠陥なし・runtime / PWA version / cache 無変更。

### HZ-BL-013 — E5 視覚の磨きとパターン変化 ✅ 2026-06-13
- scope: runtime(visual) / css
- A=浮上ウォッシュ（body.surfaced 6規則）・below∞ seed 畳み込み（XOR 恒等で後方互換）・
  ガーデン構図モード4種（砂紋主体/石組群/市松崩落/渦中心）・phase 跨ぎ句読点（深化のみ・一度きり）。
  B=hover/focus-visible・peel ぎざ縁3種・タイトル RGB ずれ再接続（dead CSS 回収）・周回スキン。
  レビューで仕様起因バグ1件修正（cycle=0 スキンが -10deg になる剰余式→明示 guard）。`?v=e5`。
  検証メモ: 非表示ドキュメントでは CSSTransition が time0 凍結し !important より優先される＝
  computed 検証は transition 中立化（*, *::before, *::after）で行う。

### HZ-BL-009 — E2 原典給餌 ✅ 2026-06-12 (commit cc89b72)
- scope: runtime / data
- 原典30本→sonnet カタログ→opus 草稿→Fable レビュー→適用。NODE_VARIANTS 19キー・
  detour +5（DETOURS 登録込み）・below 9軸+2/SELVES・VOICES+4/scrawl 各+3・
  ECHO_BANK 24・deep:true 14。surface+__rejoin の罠は descend 化で回避。`?v=e2`。

### HZ-BL-010 — E3 認識2.0 ✅ 2026-06-12 (commit 2a8db3f)
- scope: runtime
- deep gain / 表層侵食(floor0) / エコー門 Q・Z（真+2/偽−1+dread/逸らし0・周回毎一度・
  決定論・echoDone は spiral 非保存）。smoke 契約追加。実ブラウザ全経路検証済み。
  手触りの最終判断は HZ-BL-002 タッチパスへ。`?v=e3`。

### HZ-BL-008 — E1: spiral 記憶・縁カード・docs 逆統合完遂 ✅ 2026-06-12
- scope: runtime / smoke / docs
- spiral 層（周回/認識/痕跡）を `hazama_spiral_v1` へ永続化（transient は保存しない・
  「すべて忘れる」だけが消す・「沈む」の実タップで周回+1）。縁を二択
  （もう一度沈む / すべて忘れる）＋共有カード（1080×1350 PNG・Web Share/保存）に。
  README / AGENTS / autonomy docs を没入版単一ビルドへ現行化し、`build-consistency` に
  version 三点同期・spiral 契約・docs 参照整合を追加（`?v=e1`）。

### HZ-BL-000 — Autonomy engine import ✅ 2026-05-16
- scope: docs / smoke
- `music-stack` の自律開発エンジンを参考に、Hazama 用の `docs/autonomy/`、
  `AGENTS.md`、Codex/Claude 共同開発ガイド、`scripts/hazama-check.mjs` を追加。
  runtime / PWA cache / Music payload は変更しない。

### HZ-BL-004 — Browser smoke availability notes ✅ 2026-05-16
- scope: smoke / docs
- `docs/autonomy/browser-smoke-fallback.md` を追加し、optional Playwright smoke が
  skip した時の意味と in-app browser / mobile-width 手動 fallback を整理。
  README と autonomy index から参照した。

### HZ-BL-005 — Research scout decision pass ✅ 2026-05-16
- scope: research
- `docs/research/github-game-repo-scout-v0.md` に decision pass を追加。
  候補 repo を adopt candidate / reference-only / no-harvest に分類し、
  no dependency / no code copy の方針を明記。

### HZ-BL-006 — LocalStorage migration edge smoke ✅ 2026-05-16
- scope: smoke
- `scripts/localstorage-migration-smoke.mjs` を追加し、古い `hazama_state_v2`、
  部分的な `hazama_run_v1`、壊れた progress、reset、locked Ω の edge を確認。
  `scripts/hazama-check.mjs` へ統合。
