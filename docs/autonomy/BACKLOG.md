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
- source   : v2.34 PWA shell
- detail   : 実機ブラウザで install prompt、standalone 起動、初回 visit 後の offline reload、
  reset、`A_start -> HUB_NIGHT` を確認する。agent は手順整理と結果記録まで。
  手順書は `docs/autonomy/pwa-install-offline-checklist.md`、結果テンプレートは
  `docs/autonomy/pwa-install-offline-result-template.md` に準備済み。

### HZ-BL-002 — First playable manual play notes
- priority : P1
- scope    : verify
- agent    : either
- human-gate: yes
- status   : open
- source   : `docs/hazama-playtest-slices-v0.md`
- detail   : 5〜8分の通しプレイで、Ω unlock までの迷い、Gate Run の意思決定感、
  Breath Gate の任意感、`A_reborn` の完了感を記録する。数値調整はメモ後。
  agent / in-app browser pass は `docs/playtest/first-playable-agent-pass-2026-05-16.md`
  に記録済みだが、人間の taste pass は未完了。人間記録テンプレートは
  `docs/playtest/human-playtest-template.md`。

### HZ-BL-003 — Gate Run balance evaluation after notes
- priority : P1
- scope    : balance
- agent    : either
- human-gate: no
- status   : open
- source   : `docs/hazama-game-dev-plan.md`
- detail   : manual notes で具体的な違和感が出た場合だけ、
  `hazama-gate-run.js` の deterministic values と `scripts/balance-smoke.mjs` を一緒に調整する。
  判断基準は `docs/playtest/gate-run-balance-decision-rubric.md`。

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
- detail   : first playable が読める状態を保ったまま、追加 depth / second loop の採否を決める。
  今は増やさない。

---

## Done

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
