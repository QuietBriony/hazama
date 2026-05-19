# Collab: Claude Code と Codex の Hazama 共同開発

Hazama を Claude Code と Codex の両方で継続開発するためのガイド。
先に [../AGENTS.md](../AGENTS.md) と [autonomy/AUTONOMOUS-RUN.md](autonomy/AUTONOMOUS-RUN.md) を読む。

## 目的

- 片方の context が詰まったら、もう片方へ引き継げるようにする。
- BACKLOG と SESSION-LEDGER を共有し、同じ作業を二重にしない。
- `node scripts/hazama-check.mjs` を単一の整合性ガードにする。

## 役割分担

### Claude Code が得意なこと

- UX / playtest notes の統合
- BACKLOG / SESSION-LEDGER 整理
- 大きめの設計判断と task 分解
- Codex へ渡す narrow prompt 作成

### Codex が得意なこと

- 既存 JS の narrow bug fix
- `hazama-gate-run.js` と smoke の同時更新
- browser / localStorage regression の再現
- PWA static checks と script hardening

### どちらでもよいこと

- docs polish
- README link 整理
- small UI copy polish
- playtest checklist の更新

## 並列衝突回避

作業前:

```bash
git status --short --branch
node scripts/hazama-check.mjs
```

並列時:

1. `docs/autonomy/BACKLOG.md` の item に `status: wip — <agent> <date>` を付ける。
2. 同じファイルを同時に触らない。
3. `BACKLOG.md` と `SESSION-LEDGER.md` は作業前後に最新を読む。
4. runtime と docs を分ける。runtime を触る agent は 1 人にする。

作業後:

```bash
node scripts/hazama-check.mjs
git status --short
```

## Trust Boundary

- 両 agent は同じローカル repo を触る前提。
- git diff と `hazama-check` を信頼境界にする。
- 無人 merge / push / release はしない。
- raw player input、音源、サンプル、歌詞、依存、workflow は追加しない。

## Handoff Prompt

```text
Hazama の続き。起点は C:\workspace\hazama

AGENTS.md と docs/autonomy/AUTONOMOUS-RUN.md に従って。
まず STACK-INDEX / SESSION-LEDGER 最新 / BACKLOG を読んで、
node scripts/hazama-check.mjs を確認。
BACKLOG の open item を 1 つだけ選び、小さく完了させて。

制約:
- static Web app のまま
- Music は optional companion
- raw input 保存なし
- 音源/依存/GitHub Actions 追加なし
- runtime を触ったら index/hazama-index/sw/startup smoke の version 整合を見る
```

## Merge / Closeout

ユーザーが明示的に git 操作を頼んだ場合だけ commit / push / PR を行う。
final では必ず以下を短く報告する:

- 変更したファイル
- 通した check
- SKIP があれば理由
- 次の BACKLOG item
