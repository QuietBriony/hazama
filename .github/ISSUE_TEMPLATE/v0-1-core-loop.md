---
name: "v0.1 core loop"
about: "Hazama Codex v0.1 の最小コアループ実装用"
title: "feat: hazama codex v0.1 core loop"
labels: ["enhancement"]
assignees: []
---

## 目的
Hazama Codex v0.1 の最小コアループを、既存UIを崩さずに実装する。

## DoD（受け入れ条件）
- [ ] 問い表示 → ユーザー入力 → 入力を少しズラして返答 → 3〜5秒の無音/停止 → 次深度へ、の順で進行する
- [ ] 深度データは `hazama-depths.json` に集約し、UIロジックと分離されている
- [ ] ユーザーがいつでも停止できる
- [ ] ユーザーが1ステップ戻れる
- [ ] 変更は最小差分で、PRは1目的に限定されている

## 動作確認
- [ ] `python -m http.server 8000` でローカル起動できる
- [ ] `http://127.0.0.1:8000/` で表示できる
- [ ] 1サイクル（問い→入力→返答→無音→次深度）を確認できる

## メモ
- 仕様追加は本Issueには混ぜず、別Issueに分離する。
