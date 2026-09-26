# Hazama の Steam 版 — Web 本体を共有するデスクトップ包装案

2026-09-27 時点の設計案。実装済みの Steam ビルド、販売可否の判定、発売承認ではない。

## 結論

現行 Hazama は静的 Web / PWA ゲーム。Steam 版は公開 URL を表示するだけでなく、
同じ `index.html`・`slice.js`・`slice.css`・`depths-shell.json`・画像・言語データを
アプリ内に同梱した Windows 実行ファイルとして検証する。Web 本体の分岐を二重開発しない。
包装・署名・Steamworks 用の依存とビルド工程は、この静的 Web repo **の外** に置く。

```text
Hazama の同一リリース内容
  ├─ GitHub Pages / PWA（スマホ・ブラウザで試遊）
  └─ 別の PC 包装プロジェクト → Windows 実行ファイル → SteamPipe の非公開テスト枝 → 審査・公開
```

## 最初の包装案

- まず Electron で Chromium の挙動を揃えた最小 Windows 試作を作る。候補選択であり、
  実機性能・容量・保守性を確認するまで確定技術にはしない。
- `file://` でなく、固定した安全な標準 custom scheme（例 `app://hazama/`）から
  同梱ファイルだけを返す。renderer に Node 権限を渡さず、外部 navigation と任意ファイルの読取を閉じる。
  `fetch` する本文 JSON / 英語 catalog が通ることと、stable origin の `localStorage` を確認する。
- 同梱版はネット接続不要。Web 用 service worker は `app://` で登録しない（E51 の Web 本体側ガード）。
  PC 版の更新は配布された実行ファイル／Steam build で行い、PWA cache と競合させない。
- Web の `hazama_spiral_v1` と同じ保存形式でも、Web の origin と PC 版の origin は別なので
  セーブは自動移行しない。保存・移行・Steam Cloud を商品機能として約束する前に設計と検証が要る。
- Steamworks 実績・Cloud・Overlay は初回包装の必須要件にしない。ゲーム進行はそれらがなくても完結する。

## 販売品質の順序と合格条件

1. **遊びの核** — [初見ラウンド](first-round.md)を 5〜10 人に実施する。入口から数分で
   「読む→選ぶ→世界が応える」が伝わるか、10〜15 分の体験版候補に自分から続けたい理由があるかを記録。
   エージェントの自動操作だけで面白さを合格にしない。
2. **商品範囲** — 有料版が Web 試作の単なる再包装に留まらないよう、体験版の終端、再訪で増える発見、
   全体のボリュームと価格仮説をプレイ結果から定める。英語は現状、初回の身体の道だけの試作。
   全編英語を名乗らず、英語話者に自然さと選択の理解を確認する。
3. **PC ビルド** — 別包装プロジェクトで Windows 実行ファイルを作り、Steam なしで起動／オフライン／
   音の開始・停止／文字・キーボード操作／ウィンドウ縮小・拡大／終了・再起動／保存を実機で確認。
   Web の版更新、PC の版更新、保存の互換を別々にテストする。
4. **Steam テスト** — 人間が Steamworks 登録・費用・公開範囲を決めてから、実行ファイルと depot／
   launch option を登録し、非公開 branch でテスト。ストアの説明・スクリーンショット・言語表示・
   使用素材の権利／AI 利用申告を実際のビルドと一致させ、審査へ進む。

Steam Direct の現行案内では製品ごとに $100、最初の発売まで費用支払後 30 日、公開 Coming Soon
ページを最低 2 週間、ストアとビルドの審査は通常 1〜5 日。いずれも発売時点で再確認する。
このセッションでは登録・支払・Steam 提出・公開を行わない。

## 参考（公式）

- [Steam Direct](https://partner.steamgames.com/steamdirect)
- [SteamPipe / アップロードと branch](https://partner.steamgames.com/doc/sdk/uploading)
- [Steam 審査](https://partner.steamgames.com/doc/store/review_process)
- [Electron custom protocol](https://www.electronjs.org/docs/latest/api/protocol)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)
