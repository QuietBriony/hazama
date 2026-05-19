# Autonomous Run — Hazama Playbook

Hazama を 1 session 進めるための定型手順。
Claude / Codex / 人間の誰が回しても同じ状態から始め、同じ記録で閉じる。

**手動トリガ自律ラン**: スケジュール自動実行はしない。ユーザー、Codex、Claude が
この手順を起動するたびに BACKLOG を 1 段進める。

## 0. 前提

- 作業 root: `C:\workspace\hazama`
- repo 契約: `AGENTS.md`
- 待ち行列: `docs/autonomy/BACKLOG.md`
- 記録: `docs/autonomy/SESSION-LEDGER.md`

## 1. オリエンテーション

1. [STACK-INDEX.md](STACK-INDEX.md)
2. [SESSION-LEDGER.md](SESSION-LEDGER.md) の最新エントリ
3. [BACKLOG.md](BACKLOG.md) の上位 item
4. `AGENTS.md`

## 2. ベースライン確認

```bash
git status --short --branch
node scripts/hazama-check.mjs
```

`hazama-check` が fail したら、まず原因を切り分ける。
直せない時は `SESSION-LEDGER.md` に blockers として残して止める。

## 3. タスク選択

BACKLOG から、この session で完了できる item を 1 つ選ぶ。

- `human-gate: yes` は agent だけで done にしない。実装、検証準備、メモ作成まで。
- `scope: runtime` は小さく。public contract や storage 変更は事前確認。
- 並列時は write scope が完全に分かれる item だけ。

## 4. Claim

Claude と Codex が同時に動く場合:

1. item に `status: wip — <agent> <date>` を足す。
2. その claim だけを commit できる運用なら commit する。
3. 別 agent は最新状態を確認してから別 item を取る。

単独 session では claim commit は省略してよいが、final で選んだ item を報告する。

## 5. 実行

- docs / autonomy 整備: docs だけを編集し、runtime version は bump しない
- smoke / script: no dependency のまま追加
- runtime UI: `index.html` / `hazama-index.html` / `sw.js` / startup smoke の version 同期を確認
- balance: `hazama-gate-run.js` と `scripts/balance-smoke.mjs` を同じ意図で更新

## 6. 検証

```bash
node scripts/hazama-check.mjs
```

必要に応じて in-app browser か実機で確認:

- fresh start -> HUB
- locked Ω
- Gate Run win
- Ω -> A_reborn
- completion CTA -> HUB
- mobile width overflow
- Music unopened / BGM stop harmless
- PWA install / offline reload when human-gated

## 7. 締め

- 完了 item は `BACKLOG.md` の `Done` へ移す
- 新しく見つけた課題は BACKLOG に追加
- `SESSION-LEDGER.md` に最新エントリを先頭へ追記
- final では変更、検証、残件だけを短く報告

## Copy Prompt

新しい Codex / Claude session へ渡す短いプロンプト:

```text
Hazama の自律ランを 1 回回して。起点は C:\workspace\hazama

手順は docs/autonomy/AUTONOMOUS-RUN.md に従う:
1. STACK-INDEX / SESSION-LEDGER 最新 / BACKLOG / AGENTS.md を読む
2. node scripts/hazama-check.mjs で baseline を確認
3. BACKLOG 上位から、この session で完了できる item を 1 つ選ぶ
4. Hazama の hard rules 内で実行する
5. node scripts/hazama-check.mjs を再確認
6. BACKLOG と SESSION-LEDGER を更新し、変更と次タスクを報告する

Music は任意 companion のまま。raw input、音源、依存、GitHub Actions は追加しない。
```
