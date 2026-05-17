# AGENTS.md — Hazama repo operating contract

この repo を触る agent (Codex / Claude Code / 他) が最初に読む共通ルール。
Hazama を静的 Web first playable として壊さず、計算資源を小さな session 単位で
順番に投入するための契約です。

詳しい共同開発ガイドは [docs/COLLAB-CLAUDE-AND-CODEX.md](docs/COLLAB-CLAUDE-AND-CODEX.md) を参照。

---

## Autonomous Development Engine

Hazama の自走開発は [docs/autonomy/](docs/autonomy/) の薄いエンジンで運用する。
新しい session はまず [docs/autonomy/STACK-INDEX.md](docs/autonomy/STACK-INDEX.md) を読む。

- 作業フロー: [docs/autonomy/AUTONOMOUS-RUN.md](docs/autonomy/AUTONOMOUS-RUN.md)
- 作業待ち行列: [docs/autonomy/BACKLOG.md](docs/autonomy/BACKLOG.md)
- セッション記録: [docs/autonomy/SESSION-LEDGER.md](docs/autonomy/SESSION-LEDGER.md)
- 単一チェック入口: `node scripts/hazama-check.mjs`

`hazama-check` は既存の balance / first playable / startup / optional browser smoke を集約する。
`0 FAIL` が commit 前提です。

---

## Hard Rules

1. **Hazama は静的 Web アプリのまま保つ。** build step、server runtime、database、
   GitHub Actions は追加しない。
2. **ゲーム進行の public contract を不用意に変えない。**
   public route、storage key、`hazama-depths.json` schema、Music payload shape は
   明示スコープなしに変更しない。
3. **raw Breath Gate 入力を保存しない、Music に送らない。**
   保存してよいのは seed、進行位置、集計済み run state だけ。
4. **Music は companion。** Hazama の進行を Music 起動、音声再生、外部 tab に依存させない。
5. **音源 / サンプル / 歌詞 / 外部依存を repo に追加しない。**
6. **PWA cache は Hazama 名前空間だけを触る。**
   same-origin の Music 系 cache を消さない。
7. **無人 merge / push / release はしない。**
   ユーザーが明示した時だけ git 操作を進める。

---

## Integrity Gate

commit 前、または他 agent へ引き継ぐ前に repo root から実行:

```bash
node scripts/hazama-check.mjs
```

個別に見る場合:

```bash
node scripts/balance-smoke.mjs
node scripts/first-playable-smoke.mjs
bash scripts/startup-smoke.sh 8765
node scripts/browser-first-playable-smoke.mjs
```

`browser-first-playable-smoke.mjs` は Playwright が無ければ `SKIP` で 0 終了する。
実ブラウザで確認できる session は、DOM loop と mobile width の手動メモを
`docs/autonomy/SESSION-LEDGER.md` に残す。

---

## Version / Cache Discipline

runtime asset を変える時は同期を忘れない。

- `index.html` と `hazama-index.html` の `?v=...` を揃える
- `sw.js` の `hazama-pwa-v...` と `PRECACHE_URLS` を必要に応じて更新する
- `scripts/startup-smoke.sh` の期待値も同じ version に揃える
- README の構成説明を更新する

docs-only / autonomy-only 変更では app version と PWA cache は bump しない。

---

## Branch / PR Convention

| 状況 | 推奨 |
|---|---|
| docs / autonomy 整備 | 小さな直 commit 可 |
| test / smoke / script の追加 | 小 branch か直 commit。必ず `hazama-check` |
| runtime JS / CSS / PWA shell | feature branch + review |
| balance 数値変更 | manual play note + balance smoke 更新 |
| public contract / storage / Music payload | 事前にユーザー確認 |

Claude と Codex が同時に動く時は、BACKLOG item を claim してから作業する。
同じファイルを同時に触らない。

---

## Agent Notes

### Codex

- 向いている範囲: 既存 JS の narrow bug fix、smoke 強化、balance model の検証、
  localStorage / browser regression の再現。
- 迷ったら runtime より docs/autonomy の BACKLOG と smoke を先に整える。

### Claude Code

- 向いている範囲: UX 俯瞰、playtest notes の統合、BACKLOG 整理、
  Codex への task 分解、文書化。

### Human

- 実機 PWA install / offline / mobile feel / Music START.HZM の体感判断を持つ。
  human-gate item は agent が勝手に done にしない。
