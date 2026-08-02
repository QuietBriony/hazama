# Hazama Sensory Response candidate

Status: **E31 governor production採用 / Sensory Frame・labはtools-only**  
Audit date: 2026-08-02  
Human gate: **2026-08-02 production merge承認済み（mobile実機試聴済みとの記録ではない）**

## 結論

Hazamaが外部Three.jsデモやMusic Stackから取り入れる最小単位は、3D engineや
音楽runtimeではなく、ゲーム状態を音・視覚・操作反応へ一度だけ翻訳する
**Sensory Frame**と、その出力を端末負荷とheadroomの範囲へ収める
**production governor**である。

Sensory Frameと試聴labは次を提供するが、本番ゲームには読み込まれない。
E31では、このうち負荷tierとAudio lifecycleの安全策だけを既存`Audio`へ直接統合した。

- 決定論的で境界値を持つSensory Frame純粋モデル
- native Web Audioだけの試聴lab
- full / balanced / light / staticの負荷tier
- master compressor guardrail、明示的な停止・破棄、非表示時suspend
- 「沈み始める／降下／抗う／認識／呼気／忘却」の小さい音の動詞
- dependency、通信、保存、音源ファイルを追加しないことを確認するsmoke

`tools/sensory/`のSensory Frameと試聴lab自体は、本番からimport／fetchしない。
E31 narrow integrationだけが`slice.js`、`index.html`、`sw.js`とversion/PWAを同期変更し、
`slice.css`、本番asset、public route、storage/schemaは変更しない。

## 現行Hazamaの強み

Hazamaは既に`applyAtmosphere()`で深度、圧、多声、幹、world seedを共有し、
Audio / Mandala / Glitch / Gardenへ配っている。内製Audioも次を持つ。

- 深度に応じた基音、low-pass、倍音、残響
- 圧に応じた不協和と鼓動間隔
- 幹ごとのdetune / cutoff / wobble
- グリッジと音の破断、終端の呼気、選択時の短音
- 同一documentの実手勢でAudioContextを解禁

したがって全面的な作り直しは不要。弱点は、共有信号が暗黙の引数列であり、
音響出力のguardrail、端末tier、lifecycle、観測可能なtraceが一つの契約になって
いない点である。

## Candidate構成

```text
tools/sensory/
├─ hazama-sensory-frame.mjs  # browser非依存の純粋モデル
├─ sensory-audio-lab.html    # 人間が聴く静的試聴面
└─ sensory-audio-lab.mjs     # native Web Audio candidate

scripts/
└─ sensory-frame-smoke.mjs   # 決定論・境界・dependency不在
```

ローカルHTTPサーバをrepo rootで起動し、次を開く。

```text
http://127.0.0.1:8000/tools/sensory/sensory-audio-lab.html
```

音量を下げて「試聴を始める」を押す。ブラウザの自動再生制限を回避するため、
AudioContextはその実手勢の中でだけ作る。ページ非表示時はsuspendし、自動で
再開しない。再開にはもう一度ボタンを押す。

### スマホでのレビュー

試聴labはスマホを先に考えた2段階表示にする。

1. 「浅部／深部／浮上／Ω」から場面を一つ選ぶ
2. 端末音量を小さくして「試聴を始める」を押す
3. 6つの音の動詞から気になるものだけを聴く
4. 数値を比べる時だけ「詳細調整」「Sensory Frame trace」を開く

coarse pointer端末では、試聴labに限り初期tierを`light`へ下げる。これは本番の
自動端末判定ではなく、スマホ試聴の安全側の初期値であり、詳細調整から変更できる。
`prefers-reduced-motion`が有効なら従来どおり`static`が常に優先される。

WorkerPCとスマホを同じWi-Fiへ接続し、レビュー中だけrepo rootをLANへbindした
ローカル静的HTTPサーバから、次の形で開く。

```powershell
cd C:\workspace\hazama
python -m http.server 8000 --bind 0.0.0.0
```

```text
http://<WorkerPCのLAN IPv4>:8000/tools/sensory/sensory-audio-lab.html
```

これは制作中の一時レビュー導線で、Hazamaのserver runtime追加ではない。公開Internetへ
露出せず、レビュー後はサーバを停止する。接続できない場合に、このcandidateから
Windows Firewall設定を変更しない。PC上の`127.0.0.1`確認へ戻し、ネットワーク許可は
人間が別途判断する。

## Sensory Frame v1

入力は一時状態だけで、保存しない。

```js
{
  depth: 0..1,
  dread: 0..1,
  density: 0..1,
  axis: "deep" | "soma" | "reso" | "casc" | "other",
  phase: "surface" | "drift" | "deep" | "bottom" | "surfaced" | "omega",
  seed: uint32,
  tier: "full" | "balanced" | "light" | "static",
  reducedMotion: boolean
}
```

出力はimmutableなsnapshotで、同じ入力は同じ値を返す。

- `signals`: 正規化済みstate、menace、phase、tier
- `audio`: baseHz、cutoff、wet、LFO、pulse間隔、voice/IR budget
- `visual`: animation可否、frame間隔、complexity budget

これは分析・smoke・trace用のcandidate正本である。本番採用時は、追加fetchを
増やさないため`slice.js`内部へ同じ契約を狭く統合する。別runtime moduleとして
読み込むかどうかは採用時に改めて判断する。

## Performance tier

| tier | continuous partial | impulse response | visual目標 | 用途 |
|---|---:|---:|---:|---|
| full | 6 | 2.8s | 約30fps | 余力のあるdesktop |
| balanced | 4 | 1.8s | 約20fps | candidate既定 |
| light | 3 | 0.8s | 約15fps | mobile / 負荷低減 |
| static | 0 | 無し | animation無し | reduced-motion / fail-safe |

`reducedMotion=true`は常にstaticへ落とす。staticでも実手勢による短い音の動詞は
試聴できるが、連続droneは作らない。自動tier判定はまだ採用しない。端末名や
UA推測ではなく、将来は実測frame timeと人間の設定を優先する。

## Production governor

試聴labの出力経路は次の一系統だけ。

```text
continuous voices / transient verbs
                ↓
             filter
          ↙ dry   wet(convolver)
                ↓
           master gain
                ↓
  DynamicsCompressorNode (guardrail)
                ↓
           destination
```

compressorは音圧を稼ぐ用途ではなく、不協和層・鼓動・破断音が重なった瞬間の
安全柵とする。本番値はlabの候補値を固定採用せず、headphone、内蔵speaker、
iPhone/Androidで人間が聴いて決める。

## 音の動詞

| verb | 役割 | 採用条件 |
|---|---|---|
| enter | 表紙から沈み始める | 現行drone開始を邪魔しない |
| descend | 選択が世界を下げた | 毎択でも疲れず、既存pulseより識別可能 |
| resist | 上がろうとしたが圧が返る | 成功/失敗を勝利音にしない |
| recognition | 視た分だけ一つ灯る | 明るすぎる解決音にしない |
| breath | Ω/浮上の縁 | E21のhuman-gateと一緒に聴く |
| forget | spiral消去の不可逆性 | 驚かせすぎず、操作確定を伝える |

labの音色は最終案ではない。目的は、語彙の分離、headroom、lifecycle、端末tierを
同じ場所で比較できるようにすること。

## Music Stackとの境界

取り入れるのは設計知だけ。

- headroomを残しcompressor/limiterをguardrailとして使う
- layerをcrossfade後に確実に停止・切断する
- light runtimeとtraceを明示する
- preset不在でもdefaultへ戻る

取り入れないもの:

- Tone.js、Music `engine.js`、Hazama FM runtime
- CDN、外部repo fetch、別tab/iframe、cross-document AudioContext
- sample、録音、音源ファイル、歌詞
- Music Stackの再生状態をゲーム進行条件にすること

将来パラメータをharvestする場合も、metadataを人間がレビューしてHazama内の
定数へ翻訳する。runtime間を直接接続しない。

## Three.js / Blenderとの境界

Three.jsはこのcandidateへ追加しない。2.5D/WebGLの価値は別のvisual labで測り、
本編へ入れる場合もprogressive enhancement、静止fallback、描画buffer上限、
reduced-motion、mobile実機QAを必須にする。

Blender 5.2は引き続きrepo外のauthoring runtimeだけ。depth/mask/normal等を作れても、
repoへ採用できるのは人間レビュー済みの最終軽量assetだけで、BLEND/GLB/cacheを
ゲームruntimeへ持ち込まない。

## 検証

```bash
node scripts/sensory-frame-smoke.mjs
node scripts/hazama-check.mjs
git diff --check
```

`sensory-frame-smoke`は次を確認する。

- clampと未知値fallback
- 同じstate/seedから同じframe
- 深度と基音/cutoff/wet、圧とpulse間隔の単調関係
- tierごとのvoice/IR budget
- reduced-motionのstatic強制
- native compressorの存在
- Tone、fetch、storage、音声拡張子の不在
- mock AudioContextでfull→lightのvoice teardown、visibility suspend、実手勢相当の再開、context close

## Production採用gate

1. 専用runtime branchを作成
2. `slice.js`内の既存Audioへ負荷tierとmaster guardrailだけをnarrow実装
3. public route、storage key、depths schemaを変えない
4. `?v=`とPWA cacheを同期bump
5. 自動smoke後、labをheadphone / laptop speaker / mobileで人間試聴
6. 実ブラウザ降下、audio off/on、非表示復帰、mobile幅を確認
7. 新verbを追加する場合は採用／不採用を別途明記
8. 本番反映は人間が耳で承認してから

このcandidate作成は、本番audio変更やThree.js導入の承認を意味しない。

## E31 narrow integration（production採用）

2026-08-02にproduction governorへ進む承認を得た。最初のruntime sliceは音色追加ではなく、
既存`slice.js`の単一`Audio`を安全・軽量にする次の4点へ限定する。

1. `prefers-reduced-motion`は`static`、coarse pointerは`light`、通常desktopは現行互換の
   `full`を選び、continuous partialと合成IRだけをbudget内に収める
2. 現行dry gain `0.85`とmasterカーブを維持したまま、
   `master → DynamicsCompressorNode → destination`をguardrailとして追加する
3. 非表示時はpulse timerを止めてAudioContextをsuspendし、visible復帰で自動resumeせず、
   既存の音chipによる実手勢でだけ再開する
4. `pagehide`で単一contextを冪等にdisposeし、次回の実手勢で再生成できるようにする

初回統合では次を行わない。

- candidate engineのimport、iframe、2つ目のAudioContext
- enter / descend / resist / recognition等の新verb追加
- desktop既定の音色・dry gain・master gainの意図的な変更
- `tools/sensory/`のPWA precache、runtime fetch、storage
- Three.js、Blender、外部音源、dependency追加

runtime変更は専用candidate branch必須。ユーザーがprimary repoに
`codex/hazama-sensory-governor`を作成し、隔離candidateでレビュー済みの実装を適用した。
2026-08-02にユーザーがproduction mergeを明示承認し、E31としてmasterへ反映する。

candidateは`slice.js`、`index.html`、`sw.js`、README、build consistency smoke、新規
`scripts/audio-governor-smoke.mjs`を含む。e30→e31の4点version同期、full/light/staticの
AudioContext mock、compressor、hide/suspend、明示resume、dispose後再生成を検証し、
branch上で`node --check slice.js`、`audio-governor-smoke`、`sensory-frame-smoke`、
`hazama-check` 2 PASS / 0 FAIL / 0 SKIP、`git diff --check`を再実行済み。
production採用判断は完了。mobile実機で端末固有の音量、疲労感、hide→明示再開に問題が
見つかった場合だけ、別itemとしてnarrow tuneする。
