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

`hazama-check` は `autonomy-docs`（docs 接続）と `build-consistency`（単一ビルド実体検証）の
2本を実行する。`0 FAIL` が commit 前提です。
（旧 forward 専用 smoke — balance / first playable / startup / browser — は forward 撤去に伴い退役済み。）

---

## Hard Rules

1. **Hazama は静的 Web アプリのまま保つ。** build step、server runtime、database、
   GitHub Actions は追加しない。
2. **ゲーム進行の public contract を不用意に変えない。**
   public route、storage key（`hazama_spiral_v1`）、`depths-shell.json` schema は
   明示スコープなしに変更しない。
3. **raw のユーザー入力を保存しない。**（現ビルドに自由入力は無い。）
   保存してよいのは集計済みの spiral 層（周回/認識/痕跡）だけ。transient
   （沈下/圧/戻り道/観測者）は保存しない。
4. **音は内製 Web Audio（`slice.js` 内）。** 進行を外部 Music repo / 別タブ / 音声再生に
   依存させない（旧 Music ブリッジは撤去済み）。
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
node scripts/autonomy-docs-smoke.mjs
node scripts/build-consistency-smoke.mjs
```

実ブラウザで確認できる session は、降下ループと mobile width の手動メモを
`docs/autonomy/SESSION-LEDGER.md` に残す。

---

## Version / Cache Discipline

runtime asset を変える時は同期を忘れない。

- `index.html` の `?v=...`（css/js）と `slice.js` の depths fetch `?v=...` を揃える
- `sw.js` の `VERSION`（`hazama-pwa-...`）も同じ version に揃える（`build-consistency` が検証する）
- README の構成説明を更新する

docs-only / autonomy-only 変更では app version と PWA cache は bump しない。

---

## Branch / PR Convention

| 状況 | 推奨 |
|---|---|
| docs / autonomy 整備 | 小さな直 commit 可 |
| test / smoke / script の追加 | 小 branch か直 commit。必ず `hazama-check` |
| runtime JS / CSS / PWA shell | feature branch + review |
| 手触り/数値変更（認識・resist 等） | manual play note を ledger に残す |
| public contract / storage key / depths schema | 事前にユーザー確認 |

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

- 実機 PWA install / offline / mobile feel / 音の体感判断を持つ。
  human-gate item は agent が勝手に done にしない。
