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
  現在の実施対象は最新の Pages 没入版（`?v=e1`）。
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

No open P2 items after the 2026-05-16 multi-agent sprint.

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

---

## Done

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
