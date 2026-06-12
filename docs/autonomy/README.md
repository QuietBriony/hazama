# Hazama Autonomy

Hazama を小さな session 単位で進めるための開発エンジンです。

- [STACK-INDEX.md](STACK-INDEX.md) — repo 構造と境界
- [AUTONOMOUS-RUN.md](AUTONOMOUS-RUN.md) — 1 session の手順
- [BACKLOG.md](BACKLOG.md) — 次にやること
- [SESSION-LEDGER.md](SESSION-LEDGER.md) — 追記専用ログ
- [pwa-install-offline-checklist.md](pwa-install-offline-checklist.md) — HZ-BL-001 実機確認チェックリスト
- [pwa-install-offline-result-template.md](pwa-install-offline-result-template.md) — HZ-BL-001 実機結果テンプレート
- [browser-smoke-fallback.md](browser-smoke-fallback.md) — Playwright skip 時の手動 fallback
- [closeout-checklist.md](closeout-checklist.md) — agent handoff / commit 前の締めチェック
- [harness-quality-checklist-candidate-001.md](harness-quality-checklist-candidate-001.md) — autonomy run / return packet の品質チェック候補
- [next-agent-prompts.md](next-agent-prompts.md) — 次 agent へ渡すコピペ用プロンプト

単一チェック入口:

```bash
node scripts/hazama-check.mjs
```

このエンジンは作業の順番を揃えるためのものです。自動 merge、自動 release、
外部依存の追加はしません。

自律開発 docs 自体の接続は `node scripts/autonomy-docs-smoke.mjs`、
ビルドの実体（version 同期・spiral 契約・docs 参照整合を含む）は
`node scripts/build-consistency-smoke.mjs` で確認できます。

ブラウザでの手動確認の観点は [browser-smoke-fallback.md](browser-smoke-fallback.md) を使います。
