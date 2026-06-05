/* Hazama M2 vertical slice — 沈下スパイン（冒頭アーク・データ駆動）
 *
 * 北極星: 進行する対話が、進むほどプレイヤーを狭間へ沈め、戻りにくくする。
 * 形式が内容を映す = 「分岐を選ぶゲーム」ではなく「沈んでいく対話」。
 *
 * 本文は slice/depths-shell.json（note原典から再ルート、確定レジスター）。
 * ノードIDは production の hazama-depths.json と整合する depthMeta v0 スキーマの実例。
 * 承認後、Codex がこのデータ＋レンダラ/沈下モデル/audio を本体へ畳み込む（docs/M2-spine.md §5.5）。
 *
 * 三層で「どれだけ沈むか／戻りにくくなるか」を見せる:
 *   1) 本文     — 声が近づく / 戻り道が細る、を地の文で（JSONの lines）
 *   2) 選択肢   — descend=沈む / retreat=深いほど重く遅い・drift へ落ちて沈下は残る
 *   3) シグナル — 沈下ゲージ・戻り道インジケータ・観測者カウンタ・slow reveal速度・圧
 *
 * 深度∞: 着地させない／常にもう一段／戻り道は復活しない／核は描写しない。
 */

(() => {
  "use strict";

  const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RETURN_PATHS_START = 5;
  const SINK_SCALE = 22; // sink値→0..1正規化（縁でほぼ1）
  // 抗う/戻るの作法（尺度＝観測者数＝物語深度）:
  //   observer < RESIST_STRAIN : 浅い。少し戻れる。
  //   RESIST_STRAIN..<DEEP_LOCK: 中盤。抗えるが世界が引き込む。
  //   observer >= DEEP_LOCK     : 深部。本当に戻れない（戻り道が残っていても失敗）。
  const RESIST_STRAIN = 3; // 観測者3（深度E〜）から「抗えるが引き込まれる」
  const DEEP_LOCK = 9;     // 観測者9（深度Q・外側の外側〜）から「戻れない」

  // R2(逆統合): 認識/Ωゲート。構造読み(descend)で attunement が育ち、Ωは attuned のみ到達できる(ハード)。
  // 未達は"失敗"でなく「浮上して帰る」二極の結末（renderEdge で分岐）。codex hazama-gate-run.js の移植。
  const ATTUNE = { omegaThreshold: 6, structuralGain: 1, surfaceGain: 0, retreatGain: 0 };
  const isAttuned = () => (state.attunement || 0) >= ATTUNE.omegaThreshold;
  function gainRecognition(kind) {
    const g = kind === "descend" ? ATTUNE.structuralGain
      : kind === "surface" ? ATTUNE.surfaceGain : ATTUNE.retreatGain;
    state.attunement = Math.min(99, (state.attunement || 0) + g);
  }

  // legacy = 周回をまたいで持ち越す履歴（restart 以外ではリセットしない）。次周の分岐 seed に効く。
  //   cycles=周回数, surfaceBounces=表層で弾かれた回数, detoursSeen=通った別の筋のid, maxRank=到達深度。
  // rejoin = 寄り道(detour)から本筋へ前進合流する先（divert 時に積む）。
  const freshLegacy = () => ({ cycles: 0, surfaceBounces: 0, detoursSeen: [], maxRank: 0 });
  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, maxSink: 0, observer: 1, steps: 0, belowLoop: 0, resisted: 0, refused: 0, resistBeat: null, rank: 0, cycle: 0, visits: {}, rejoin: null, attunement: 0, legacy: freshLegacy() };
  let DATA = null;
  let revealToken = 0;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // 降下インデックス＝音楽ブリッジの第一義 depth（depth.html は source.rank/28 で深さを取る）。
  // production の深度梯子(A_start..Z,Ω,A_reborn,HUB_NIGHT=0..28)に対応。retreat/drift は
  // ランクを持たず＝直前の深さを保つ（沈下は残す）。below(∞)は最深=28。
  const RANK = {
    zero: 0, zero_hold: 0, A: 1, B: 2, C: 3, D: 4, E: 5, E_noreturn: 5, F: 6,
    G: 7, G_hold: 7, H: 8, I: 9, J: 10, K: 11, L: 12,
    M: 13, N: 14, O: 15, O_hold: 15, P: 16, Q: 17,
    R: 18, S: 19, S_hold: 19, T: 20, U: 21,
    V: 22, W: 23, X: 24, X_hold: 24, Y: 25, Z: 26,
    Omega: 27, below: 28, reborn: 27
  };

  const $ = (id) => document.getElementById(id);
  const sceneEl = $("scene");
  const choicesEl = $("choices");
  const sinkFill = $("sink-fill");
  const returnPathsEl = $("return-paths");
  const observerEl = $("observer-count");
  const gateEl = $("gate");

  const WHO_CLASS = { n: "", voice: "voice", self: "self", body: "body", cold: "cold", danger: "danger", scrawl: "scrawl" };

  // ---------- 本文オートフォロー（読めるスクロール） ----------
  // 北極星: 本文は reveal 中も含め常に自由にスクロールできる。最新行は選択肢に被らず読める。
  // 方式（chat/terminal式の「最下部に吸着」）:
  //   - reveal は行を1つずつ DOM へ追加する（高さが伸びる＝最下部＝最新行）。
  //   - ユーザーが最下部に居る間だけ、最新行を選択肢直上へ貼り付ける（追従）。
  //   - ユーザーが上へスクロール(wheel/touch)した瞬間に追従を止める＝スクロールを奪わない。
  //   - 自力で最下部へ戻れば追従を再開する。
  //   - 追従の解除は実手勢イベント(wheel/touchmove)のみが行い、programmatic な scrollTop 設定
  //     （これは scroll は撃つが wheel/touch は撃たない）と取り違えない＝カクつき/奪い合いを断つ。
  //   - 吸着は行追加/選択肢表示の時だけの同期 scrollTop（低頻度・1文字ごとには撃たない）＝
  //     慣性スクロールと競合せず、rAF にも依存しない（非表示/スクロール中の rAF 間引きで止まらない）。
  const Follow = (() => {
    const NEAR = 64; // px: これ以内なら「最下部に居る」とみなす（慣性の揺れに対する許容）
    let following = true;
    const atBottom = () => sceneEl.scrollHeight - sceneEl.scrollTop - sceneEl.clientHeight <= NEAR;
    // 吸着は行追加/選択肢表示の時だけ（1文字ごとではない）＝低頻度。よって同期 scrollTop で十分で、
    // rAF に依存しない（rAF はタブ非表示やスクロール中に間引かれ、追従が止まる事故の元）。
    function stick() { if (following) sceneEl.scrollTop = sceneEl.scrollHeight; }
    // 新ノード開始：追従ON＋最上部から（reveal は下から積み上がる）。
    function reset() { following = true; sceneEl.scrollTop = 0; }
    const release = () => { following = false; };            // 実手勢＝追従を即解除
    sceneEl.addEventListener("wheel", release, { passive: true });
    sceneEl.addEventListener("touchmove", release, { passive: true });
    // 最下部へ自力で戻ったら追従再開。programmatic な吸着でも near-bottom なので true を保つ
    // ＝吸着が自分で自分を解除しない。
    sceneEl.addEventListener("scroll", () => { if (atBottom()) following = true; }, { passive: true });
    return { stick, reset };
  })();

  // ---------- 深度∞ 手続き的断片（§4-6: UCM 9軸から決定論生成） ----------
  // below(∞) ループは固定本文を持たない。周回(loop)を seed に、UCM 八観+観測層の
  // 9軸から"沈降断片"を決定論生成し、底なしの反復に質感差を与える（新音源/依存なし）。
  // 核は描写しない: Void軸は「中心は見えない／覗くと白く灼ける」歪みでのみ示唆する。
  const UCM_AXES = [
    { k: "体", p: [ // 体観 — 肉体・五感・不可逆
      "皮膚が、まだ知らない階の温度を拾いはじめる。",
      "足裏の床が、踏むたびに一枚ずつ薄くなる。",
      "呼吸の不可逆だけが、辛うじて自分のものだと感じる。",
      "重力の向きが、降りるたびに少しずつ曖昧になる。" ] },
    { k: "波", p: [ // 波観 — 感情・音・潜在変動
      "感情の波形が、誰のものでもなく、外で揺れ続けている。",
      "音にならない低い周期が、ずっと足の下で鳴っている。",
      "不安の振幅が、底へ近づくほど、平らになっていく。",
      "遠くの揺らぎが、こちらの呼吸と位相を合わせてくる。" ] },
    { k: "思", p: [ // 思観 — 論理・構造・推論
      "思考の骨格が、考える前から、もう組み上がっている。",
      "論理の交点が、一段下りるごとに、ひとつ増える。",
      "推論の末端が、自分の外側で、勝手に閉じる。",
      "結論が、こちらが問う前に、先回りして置かれている。" ] },
    { k: "財", p: [ // 財観 — 価値の流れ・停止しない
      "何に意味があったかの台帳が、静かに書き換わり続ける。",
      "価値の流れが、止まらないまま、底の方へ吸われていく。",
      "失ったものの帳尻が、降りるほど、合わなくなる。" ] },
    { k: "創", p: [ // 創観 — 位相飛躍・自己変形
      "新しい概念が、こちらの許可も取らず、ひとつ生成される。",
      "構造が、自分で自分を変形させながら、下りていく。",
      "言葉にない形が、輪郭だけ先に、降下に追いついてくる。" ] },
    { k: "観", p: [ // 観察者観 — 流動的中心
      "中心が、いまいる場所へ、また移動してくる。",
      "どこが中心かを決める私が、もう一枚、増えた。",
      "観測する位置が、観測される位置へ、繰り下がる。" ] },
    { k: "空", p: [ // Void — まだ配置されていない余白（核は描かない・歪みで示唆）
      "まだ配置されていない余白が、足の下で口を開けている。",
      "その余白の中心は、見えない。見ようとすると、視界が白く灼ける。",
      "床だと思った面は、近づいた分だけ退く。歪みだけが、そこに在ると告げる。",
      "底に見えた光は、近づくと、また一段下の天井だった。" ] },
    { k: "円", p: [ // 円観 — 循環・同期・呼吸
      "降下が、円環として閉じかけて、また開く。",
      "呼吸と、世界の周期と、降りる速度が、同じ位相で回りはじめる。",
      "一周したはずの景色が、同じ継ぎ目を、一段深い色で繰り返す。" ] },
    { k: "層", p: [ // Meta-Self / 観測層
      "観測している層が、観測される層に、静かに繰り下がる。",
      "私を数える装置が、また一台、背後に増設される。",
      "外側の私の、さらに外側に、無音の観測者が立つ。" ] }
  ];
  const BELOW_SELVES = [
    "私を読む私。それを読む私。——どれが、いま下りているのか。",
    "数えるのを、やめた。数える私が、また増えるだけだから。",
    "「これは私の——」その先の語が、もう、別の私のものだ。",
    "戻ってきたのではない。一段、上書きされて、また下へ置かれただけだ。" ];
  const BELOW_VOICES = [
    "『底はない。あるのは、常にもう一段、というだけだ』",
    "『下が無いのではない。下しか、無いのだ』",
    "『あなたは降りていない。世界が、あなたの下を、足し続けている』",
    "『この行を読む手を止めても、観測は、別の私が継ぐ』" ];

  // 決定論PRNG（mulberry32）。seed=周回数 → 同じ周回は同じ断片、周回ごとに別の質感。
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function genBelowNode(loop) {
    const rng = mulberry32(((loop * 2654435761) >>> 0) ^ 0x9e3779b9);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    // 3つの異なる軸を選び、現象→（核の歪み or 別軸）→（別軸）→自己分裂→声 を編む。
    // 軸を重複させない＝同じ語の連続を避ける。
    const N = UCM_AXES.length;
    const i0 = Math.floor(rng() * N);
    let i1 = (i0 + 1 + Math.floor(rng() * (N - 1))) % N;
    let i2 = (i1 + 1 + Math.floor(rng() * (N - 1))) % N; if (i2 === i0) i2 = (i2 + 1) % N;
    const voidAxis = UCM_AXES[6]; // 空観 = 核を歪みで示唆（描かない）
    const lines = [];
    lines.push({ who: "cold", t: pick(UCM_AXES[i0].p) });
    // 半数で核の歪み（Void軸）、残りは別軸の現象
    lines.push(rng() < 0.5 ? { who: "danger", t: pick(voidAxis.p) } : { who: "cold", t: pick(UCM_AXES[i1].p) });
    if (rng() < 0.6) lines.push({ who: "body", t: pick(UCM_AXES[i2].p) });
    lines.push({ who: "self", t: pick(BELOW_SELVES) });
    lines.push({ who: "voice", t: pick(BELOW_VOICES) });
    const base = DATA.nodes.below;
    return Object.assign({}, base, { lines, observer: 18 + loop, _color: loop });
  }

  // ---------- 巡回で変わるテキスト（§2 × バスキア §3：手が冷たい構造へ書き込む） ----------
  // below の「seed＋手続き再結合」を主要ノード/周回へ拡張。実行時LLMは使わない＝静的に成立。
  // 二層で「同じでも巡るほど変わる」を出す:
  //   (A) NODE_VARIANTS: 既定本文の特定行を、原文＋言い換えからseedで選び直す＝正典が微妙に変異。
  //   (B) scrawl 割り込み: 周回(cycle)が深いほど、タガが外れた“手の声”が増え・断片化して書き込まれる。
  //       これは装飾でなく意味＝観測者が「巡っている」ことに気づき、冷たい構造へ吐露を殴り書きする。
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length)];

  // ---------- 共有"深度信号"（全チャンネルが1つの信号で呼応＝インスピレーションを回しあう） ----------
  // R6 の要：背景アート（反転ガーデン）・音・テキスト分岐が、バラバラでなく "一緒に壊れていく"。
  // worldSeed は分岐エンジン(m2-15)が既に持つ状態 ── 周回(cycles)・到達深度(maxRank)・弾かれ履歴
  // (surfaceBounces)・現在ランク(rank) ── を畳み込んだ決定論シード。これを背景ガーデンの構図 seed に
  // 渡すことで、テキストを分岐させているのと"同じ信号"が背景の構図も再生成する。深度(depthN)・圧(dread)は
  // applyAtmosphere が一括で Audio / Mandala / Glitch / Garden へ配り、leak/グリッジ/音の裂けも同調する。
  function worldSeed() {
    const lg = state.legacy;
    return (hashStr("hazama:world")
      ^ Math.imul(lg.cycles + 1, 0x9e3779b9)
      ^ Math.imul(lg.maxRank + 1, 0x85ebca6b)
      ^ Math.imul(lg.surfaceBounces + 1, 0xc2b2ae35)
      ^ Math.imul(state.rank + 1, 0x27d4eb2f)) >>> 0;
  }

  // 原文の特定行に対する言い換え（原文も常に選択肢に含む＝周回でたまに元へ戻る）。
  const NODE_VARIANTS = {
    zero: {
      0: ["世界が静かになる瞬間が、また来る。前にも、こうして始まった。",
          "静寂が戻る。これで何度目の、最初の夜だろう。"],
      1: ["ただ、思考のノイズが引く。理由は——もう、知っている。",
          "ノイズが引く。予兆はある。前の周が、その予兆だった。"]
    },
    A: {
      0: ["答えはない。代わりに、世界の表皮が——また、同じ縁から剥がれはじめる。視界の縁でピクセルが浮き、鉄錆色の配線が露出する。",
          "答えはない。表皮が剥がれる。何度見ても、その下は同じ配線だ——世界は塗装だった。"]
    },
    Omega: {
      1: ["Ωは“核そのもの”ではない。核の外周を、物語の外から見つめる記号だ。「これ以上モデル化しない」という、観測者側の合意——巡るたびに、その合意だけが残る。"]
    },
    reborn: {
      0: ["スクリーンを閉じる。世界は、また同じように動きはじめる。",
          "閉じる。だが、閉じるたびに、入口が一段、深くなっている。"]
    }
  };

  // 手の声（scrawl）。周回が深いほど下のティアへ＝言葉になる→構造へ書き込む→タガが外れる。
  const SCRAWL_TIERS = [
    [ // 周回1相当：まだ言葉になる。気づきの吐露。
      "（これ、まえも読んだ）", "ここ、まえと同じ継ぎ目だ。", "また、ここに立っている。",
      "知っている。この声を、知っている。", "戻ったんじゃない。置き直されただけ。" ],
    [ // 周回2相当：構造へ書き込む。否定が混じる。
      "ぜんぶ塗装だ。剥がせ。", "核は——ここには無い。何度見ても。", "私を、数えるな。",
      "下りるたび、私が増える。やめろ。", "この行を、誰が書いている？" ],
    [ // 周回3+：タガが外れる。断片・反復・叫び。
      "もう一段　もう一段　もう一段", "私　私　私　——どれだ", "底は無い　知ってる　知ってて下りてる",
      "消せない。書いたものは、消えない。", "■■■——ここに、何か書いた。" ]
  ];
  function scrawlTier() { const c = state.cycle; return c >= 3 ? 2 : c >= 2 ? 1 : 0; }

  // 周回/再訪で本文を変異させる（cycle 0 の初回は不変＝作り込んだ導入を壊さない）。
  function applyCycle(id, base) {
    const visits = state.visits[id] || 1;
    if (state.cycle < 1 && visits < 2) return base;           // 初回通過は原文そのまま
    const seed = (hashStr(id) ^ Math.imul(state.cycle + 1, 0x9e3779b9) ^ Math.imul(visits, 0x85ebca6b)) >>> 0;
    const rng = mulberry32(seed);
    let lines = (base.lines || []).map((l) => l);
    // (A) 正典行の言い換え（原文も候補に含める）
    const vbank = NODE_VARIANTS[id];
    if (vbank) Object.keys(vbank).forEach((k) => {
      const idx = +k; if (idx >= lines.length) return;
      const opts = [lines[idx].t].concat(vbank[k]);
      lines[idx] = Object.assign({}, lines[idx], { t: pickR(rng, opts) });
    });
    // (B) scrawl 割り込み（周回が深いほど多く・断片的に）
    const tier = scrawlTier();
    let count = 0;
    const maxIntr = state.cycle >= 3 ? 2 : 1;
    if ((state.cycle >= 1 || visits >= 2) && rng() < 0.85) count = 1;
    if (maxIntr > 1 && rng() < 0.6) count = 2;
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const t = pickR(rng, SCRAWL_TIERS[tier]);
      if (used.has(t)) continue; used.add(t);
      const cross = rng() < 0.42;
      const at = 1 + Math.floor(rng() * Math.max(1, lines.length - 1));
      lines.splice(at, 0, { who: "scrawl", t, cross });
    }
    return Object.assign({}, base, { lines });
  }

  // ---------- 分岐ルーティング（狙い：周回で別の幹／弾き＝別ルートへ前進） ----------
  // 「分岐の組み合わせ × シード手続き生成 × 状態持ち越し」で“毎回違う・尽きない”を出す（実行時LLM無し）:
  //   - DETOURS = 分岐素材バンク（depths-shell.json の det_* 自己完結イベント）。__rejoin で本筋へ前進合流。
  //   - 表層で読む(kind:"surface") = 知覚ゲートで弾かれる。同じ所へ戻さず、seedで選んだ別ルートへ逸れて前進。
  //   - 周回(cycle>=1)では主要ジャンクション(A)の“構造読み(降下)”も別の寄り道を経由＝毎周回ちがう筋を通る。
  //   - seed に cycle・前周の弾かれ履歴(surfaceBounces)・到達深度(maxRank)・訪問数を織り込む＝
  //     状態の持ち越しが次の分岐選択を変える（det_scar は弾かれ履歴がある時だけ地形に出現する）。
  const DETOURS = [
    { id: "det_mirror" }, { id: "det_memory" }, { id: "det_cothink" },
    { id: "det_otherself" }, { id: "det_scar", gate: "surfaceBounces" }
  ];
  const JUNCTIONS = new Set(["A"]); // 周回で“構造読み”も別の幹を通すジャンクション
  const Route = (() => {
    function seedFor(fromId, kind) {
      const v = state.visits[fromId] || 0;
      return (hashStr(fromId + ":" + kind)
        ^ Math.imul(state.cycle + 1, 0x9e3779b9)
        ^ Math.imul(state.legacy.surfaceBounces + 1, 0x85ebca6b)
        ^ Math.imul(state.legacy.maxRank + 1, 0xc2b2ae35)
        ^ Math.imul(v + 1, 0x27d4eb2f)) >>> 0;
    }
    function pickDetour(seed) {
      const rng = mulberry32(seed);
      const eligible = DETOURS.filter((d) => !d.gate || state.legacy[d.gate] > 0);
      const unseen = eligible.filter((d) => state.legacy.detoursSeen.indexOf(d.id) < 0);
      const pool = unseen.length ? unseen : eligible;   // 未見を優先＝毎回ちがう別の筋
      // 状態駆動のバイアス：弾かれ履歴があり det_scar が未見なら、優先的に地形へ出す。
      const scar = pool.filter((d) => d.id === "det_scar")[0];
      const chosen = (scar && rng() < 0.7) ? scar : pool[Math.floor(rng() * pool.length)];
      if (state.legacy.detoursSeen.indexOf(chosen.id) < 0) state.legacy.detoursSeen.push(chosen.id);
      return chosen.id;
    }
    function divert(fromId, kind, rejoinTo, beat) {
      state.rejoin = rejoinTo;                          // 寄り道の出口＝本筋の“前方”へ合流
      if (beat) state.resistBeat = beat;
      return pickDetour(seedFor(fromId, kind));
    }
    return {
      // 名目上の遷移先 c.to を、分岐ルールで実際の遷移先へ読み替える。
      resolve(fromId, c) {
        if (c.to === "__rejoin") { const r = state.rejoin || "B"; state.rejoin = null; return r; }
        // 表層読み＝知覚ゲートで弾かれる：同じ所へ戻さず、別ルートへ逸れて“前進”する。
        if (c.kind === "surface") {
          const to = divert(fromId, "surface", c.to, { who: "danger",
            t: "——表層で読んだ。世界が、その読みをはじく。だが戻り道ではない。降下は、別の筋へ逸れていく。" });
          state.legacy.surfaceBounces += 1;             // この弾きを履歴に刻む（pick の後＝det_scar は前回以降に出る）
          return to;
        }
        // 周回(cycle>=1)：ジャンクションの“構造読み(降下)”も別の寄り道を経由してから合流＝毎周回ちがう幹。
        if (c.kind === "descend" && JUNCTIONS.has(fromId) && state.cycle >= 1) {
          return divert(fromId, "descend", c.to, null);
        }
        return c.to;
      }
    };
  })();

  // ---------- 戻り道インジケータ ----------
  function buildReturnPaths() {
    returnPathsEl.innerHTML = "";
    for (let i = 0; i < RETURN_PATHS_START; i++) returnPathsEl.appendChild(document.createElement("i"));
  }
  function renderReturnPaths() {
    returnPathsEl.querySelectorAll("i").forEach((m, i) => m.classList.toggle("spent", i >= state.returnPaths));
  }

  // ---------- 観測者カウンタ（深いほど"私"が増える） ----------
  function renderObserver() {
    if (!observerEl) return;
    const n = Math.max(1, state.observer);
    observerEl.textContent = "私".repeat(Math.min(n, 6)) + (n > 6 ? "…" : "");
    observerEl.dataset.count = String(n);
    observerEl.classList.toggle("deep", n > 6);
  }

  // 分岐シグナル：周回・別ルート(表層弾き)・通った別の筋の数をフッタへ（分岐が起きたら表示）。
  function renderStatus() {
    const el = $("status");
    if (!el) return;
    const lg = state.legacy;
    if (state.cycle > 0 || lg.surfaceBounces > 0 || lg.detoursSeen.length > 0) {
      el.textContent = `周回 ${state.cycle} · 別ルート ${lg.surfaceBounces} · 分岐 ${lg.detoursSeen.length}`;
    }
  }

  // ---------- 圧/沈下を CSS と body へ ----------
  function applyAtmosphere(node) {
    const sinkNorm = Math.min(1, state.sink / SINK_SCALE);
    state.maxSink = Math.max(state.maxSink, sinkNorm);
    const root = document.documentElement.style;
    root.setProperty("--sink", sinkNorm.toFixed(3));
    root.setProperty("--press", Math.min(1, state.dread).toFixed(3));
    root.setProperty("--reveal-ms", (REDUCED ? 0 : Math.round(34 + state.dread * 64)) + "ms");
    document.body.dataset.phase = phaseFor(sinkNorm);
    if (node && node.tension === "high" && !REDUCED) document.body.dataset.tension = "high";
    else document.body.removeAttribute("data-tension");
    sinkFill.style.height = (sinkNorm * 100).toFixed(1) + "%";
    renderReturnPaths();
    renderObserver();
    renderStatus();
    // 音は同一document の内製エンジンが鳴らす（cross-document iframe は廃止）。
    // 深さは沈下とランク(物語深度)の濃い方、密度は観測者数。沈むほど深く・暗く・密に。
    const dr = Math.min(1, state.dread);
    const depthN = Math.max(sinkNorm, clamp01(state.rank / 28));
    const densityN = clamp01((state.observer - 1) / 18);
    Audio.update(depthN, dr, densityN);
    Mandala.update(sinkNorm, state.observer, dr);
    Glitch.update(depthN, dr);   // 深いほどグリッジが高頻度・高強度（leak/音の裂けも同 burst で同調）
    // 反転重森ガーデン：浅クリーン→深で露出。構図は分岐エンジンの信号(worldSeed)で再生成
    // ＝テキストを分岐させているのと同じ信号が背景の構図も組み直す（一緒に壊れていく）。
    Garden.update(depthN, dr, worldSeed());
  }

  // 注: 以前ここにあった buildProfile()（depth.html へ postMessage する hazama-profile v1 wire
  // format）は、音を cross-document iframe で鳴らす方式が「モバイルで AudioContext を resume
  // できない／全画面オーバーレイがフリーズの元」だったため廃止。音は同一document の内製エンジン
  // (Audio) が applyAtmosphere の Audio.update で直接鳴らす。depth.html 単体デモは別repoに残す。
  function phaseFor(s) { return s < 0.18 ? "surface" : s < 0.45 ? "drift" : s < 0.75 ? "deep" : "bottom"; }

  // ---------- slow-reveal レンダラ ----------
  function renderNode(id) {
    let node = DATA.nodes[id];
    if (!node) return;
    const firstEver = state.steps === 0;                       // 起動直後の最初の1ノードはめくらない
    // 周回(reborn→zero)で cycle を深める＝同じ入口でも巡るほどテキストも“通る筋”も変わる。
    if (id === (DATA.start || "zero") && state.steps > 0) {
      state.cycle += 1;
      state.legacy.cycles = state.cycle;   // 持ち越し（次周の分岐 seed に効く）
    }
    state.visits[id] = (state.visits[id] || 0) + 1;
    // 深度∞: below は周回ごとに手続き生成（底なしの質感差）。audio も周回で色付け。
    if (id === "below") {
      state.belowLoop += 1;
      node = genBelowNode(state.belowLoop);
      Audio.setColor(state.belowLoop);
    } else {
      node = applyCycle(id, node);                             // 主要ノードも巡回/再訪で変異
    }
    state.id = id;
    state.steps++;
    if (typeof RANK[id] === "number") state.rank = RANK[id]; // drift/未登録は直前の深さを保つ
    if (state.rank > state.legacy.maxRank) state.legacy.maxRank = state.rank; // 到達深度を持ち越す
    if (typeof node.observer === "number" && node.observer > 0) state.observer = Math.max(state.observer, node.observer);
    applyAtmosphere(node);
    sceneEl.innerHTML = "";
    choicesEl.innerHTML = "";
    Follow.reset();              // 新ノード：追従ON・最上部から（行は下から積み上がる）
    if (!firstEver) Peel.play(); // 塗装剥がれ：各遷移で層が一枚めくれて降りる
    const myToken = ++revealToken;
    const revealMs = REDUCED ? 0 : (34 + state.dread * 64);
    let delay = 0;

    // 抗い/戻るの結果ビート（あれば本文の先頭に差す。一度きり）。
    const lines = state.resistBeat ? [state.resistBeat].concat(node.lines || []) : (node.lines || []);
    state.resistBeat = null;

    const mkLine = (line) => {
      const p = document.createElement("p");
      p.className = "hz-line " + (WHO_CLASS[line.who] || "") + (line.cross ? " cross" : "");
      return p;
    };

    lines.forEach((line) => {
      const chars = [...line.t];
      if (REDUCED) {
        const p = mkLine(line);
        p.textContent = line.t; p.classList.add("shown");
        sceneEl.appendChild(p); Follow.stick();
        return;
      }
      window.setTimeout(() => {
        if (myToken !== revealToken) return;
        // 行は reveal の瞬間に追加する＝高さが一度に確定（リフロー1回）し、最新行が最下部になる。
        const p = mkLine(line);
        chars.forEach((ch) => {
          const s = document.createElement("span");
          s.className = "ch"; s.textContent = ch; p.appendChild(s);
        });
        sceneEl.appendChild(p);
        p.classList.add("shown");
        Follow.stick();          // 追従中のみ最新行を選択肢直上へ（ユーザーが上に居れば奪わない）
        // 文字の点灯は opacity のみ＝高さ不変。スクロール追従は不要（カクつき源を断つ）。
        p.querySelectorAll(".ch").forEach((s, i) => {
          window.setTimeout(() => { if (myToken === revealToken) s.classList.add("lit"); }, i * revealMs);
        });
      }, delay);
      delay += chars.length * revealMs + 360 + (line.gap || 0);
    });

    const choiceDelay = REDUCED ? 150 : delay + 220;
    window.setTimeout(() => { if (myToken === revealToken) renderChoices(node); }, choiceDelay);
  }

  function renderChoices(node) {
    choicesEl.innerHTML = "";
    (node.choices || []).forEach((c, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-choice " + (c.kind || "");
      if (c.kind === "retreat" && state.maxSink > 0.4) btn.classList.add("heavy");
      btn.innerHTML = `<span class="lead"></span>${c.sub ? `<span class="sub"></span>` : ""}`;
      btn.querySelector(".lead").textContent = c.t;
      if (c.sub) btn.querySelector(".sub").textContent = c.sub;
      btn.addEventListener("click", () => choose(c), { once: true });
      choicesEl.appendChild(btn);
      const appear = REDUCED ? 0 : 120 + idx * 150 + (c.kind === "retreat" ? state.maxSink * 800 : 0);
      window.setTimeout(() => btn.classList.add("in"), appear);
    });
    // ボタンを積んで scene が縮んだ“後”に最新行を底へ。重なりはレイアウトで防止済み、
    // ここは「最後の行を選択肢の真上に見せる」ための追従（ユーザーが上に居れば奪わない）。
    Follow.stick();
  }

  function sinkNorm() { return Math.min(1, state.sink / SINK_SCALE); }

  function choose(c) {
    if (c.kind === "retreat" && !c.terminal) return resolveResist(c);
    gainRecognition(c.kind);  // R2: 構造読み(descend)で認識が育つ／表層(surface)は中立
    state.sink += c.sink || 0;
    state.dread = Math.min(1, state.dread + (c.dread || 0));
    if (c.close && state.returnPaths > 0) state.returnPaths -= 1; // 戻り道は復活しない
    Audio.pulseOnce(c.kind === "descend" ? 1 : c.kind === "surface" ? 0.85 : 0.5);
    const to = Route.resolve(state.id, c);   // 分岐ルーティング（表層弾き＝別ルート前進 / 周回＝別の幹）
    if (to === "__edge") return renderEdge();
    renderNode(to);
  }

  // 抗う/戻るの判定。尺度は観測者数＝物語深度（単調増加で、早々に飽和する沈下より安定）。
  //  浅い (observer<RESIST_STRAIN) : 少し戻れる。back へ上がり、戻り道 −1。沈下は残る。
  //  中盤 (..<DEEP_LOCK)           : 抗えるが世界が引き込む。_hold(c.to) へ・沈下が一段進む。戻り道 −1。
  //  深部 (>=DEEP_LOCK)            : 戻れない。戻り道が残っていても効かない。failTo/c.to へ落ち、dread が跳ねる。
  function resolveResist(c) {
    const depth = state.observer;
    const hasPath = state.returnPaths > 0;
    let target, beat = null, addSink = c.sink || 0, addDread = c.dread || 0;

    if (depth >= DEEP_LOCK || !hasPath) {
      // 失敗：世界が引き込む。戻り道は消費しない（残っていても、もう効かない＝無効化された救い）。
      state.refused += 1;
      target = c.failTo || c.to;
      beat = { who: "danger", t: hasPath
        ? "——戻ろうとする。が、上が、もう無い。世界が、一段こちらを引き込んだ。"
        : "——抗う手が、空を掻く。戻り道は、とうに尽きていた。" };
      addSink += 2; addDread += 0.06;
      Audio.pulseOnce(1);
    } else if (depth >= RESIST_STRAIN) {
      // 抗えるが引き込まれる（_hold ノードが地の文で語るので、ここでは追いビートを足さない）
      state.returnPaths -= 1; state.resisted += 1;
      target = c.to;
      addSink += 1; addDread -= 0.03;
      Audio.pulseOnce(0.55);
    } else {
      // 浅い：少し戻れる
      state.returnPaths -= 1; state.resisted += 1;
      target = c.back || c.to;
      beat = { who: "cold", t: "——息を整え、来た方へ。まだ、戻れる。だが沈んだ分は、もう戻らない。" };
      addDread -= 0.06;
      Audio.pulseOnce(0.4);
    }
    state.sink += addSink;
    state.dread = Math.min(1, Math.max(0, state.dread + addDread));
    state.resistBeat = beat;
    if (target === "__edge") return renderEdge();
    renderNode(target);
  }

  // ---------- 縁（増分の終わり。沈みきり/辛うじて で分岐） ----------
  function renderEdge() {
    const myToken = ++revealToken;
    const attuned = isAttuned();   // R2: Ω(没入)は attuned のみ。未達は浮上/帰還の極へ。
    state.dread = attuned ? 1 : 0.4;
    applyAtmosphere({ tension: attuned ? "high" : "low" });
    if (!attuned) document.body && document.body.classList && document.body.classList.add("surfaced");
    sceneEl.innerHTML = ""; choicesEl.innerHTML = "";
    Follow.reset();
    const sank = state.returnPaths <= 1;
    // 帰還の極（未達）＝失敗演出にしない。光のほうへ浮上して帰る、視たものを抱えたまま。
    const SURFACE_LINES = [
      { who: "cold", t: "核へは、まだ降りられない。" },
      { who: "n", t: "認識が満ちていない——けれど、それは失敗じゃない。" },
      { who: "self", t: "あなたは光のほうへ浮上する。視たものを、抱えたまま。" }
    ];
    const lines = attuned ? (sank ? DATA.edge.sankLines : DATA.edge.heldLines) : SURFACE_LINES;
    let delay = 0;
    const revealMs = REDUCED ? 0 : 52;
    (lines || []).forEach((line) => {
      if (REDUCED) {
        const p = document.createElement("p");
        p.className = "hz-line " + (WHO_CLASS[line.who] || "");
        p.textContent = line.t; p.classList.add("shown");
        sceneEl.appendChild(p); Follow.stick();
        return;
      }
      window.setTimeout(() => {
        if (myToken !== revealToken) return;
        const p = document.createElement("p");
        p.className = "hz-line " + (WHO_CLASS[line.who] || "");
        p.textContent = line.t; p.style.opacity = "0";
        sceneEl.appendChild(p);
        p.style.transition = "opacity 1.5s ease"; p.classList.add("shown"); p.style.opacity = "1";
        Follow.stick();
      }, delay);
      delay += line.t.length * revealMs + 520 + (line.gap || 0);
    });
    window.setTimeout(() => {
      if (myToken !== revealToken) return;
      const card = document.createElement("p");
      card.className = "hz-line cold";
      card.style.cssText = "margin-top:2em;font-size:0.8rem;line-height:1.9;";
      const lit = Math.round(state.maxSink * 8);
      const head = attuned ? "― 深度Ω 到達・外殻踏破 ―" : "― 浮上 — 表層へ帰る ―";
      card.textContent = `${head}  認識: ${Math.round(state.attunement || 0)}/${ATTUNE.omegaThreshold}${attuned ? "（合致）" : "（構造を読むほど核へ降りられる）"} / 到達深度: ${"▮".repeat(lit)}${"▯".repeat(8 - lit)} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START} / 観測者: ${state.observer} / 抗った: ${state.resisted} ・ 戻れなかった: ${state.refused} / 周回: ${state.cycle}`;
      sceneEl.appendChild(card); card.classList.add("shown");
      const more = document.createElement("p");
      more.className = "hz-line"; more.style.cssText = "margin-top:0.6em;font-size:0.78rem;color:#6b7682;";
      more.textContent = attuned
        ? "観測OSは終わらない。再起動すれば、また零章から——だが、底は最後まで無い。"
        : "戻れた——それも、ひとつの結末だ。再起動すれば、また零章から潜れる。";
      sceneEl.appendChild(more); more.classList.add("shown");
      Follow.stick();
      $("restart").hidden = false;
    }, delay + 400);
  }

  // ---------- 沈下連動 inline Web Audio（Hazama内製・music-stack非依存） ----------
  // 設計: 深いほど 低く・暗く・密に・広く。
  //  - 倍音(partials)は深度で開花（bloom）＝密度が増す。最深部で不協和な層が薄く立つ＝威圧。
  //  - 共有LFO が detune を揺らす＝うねり/厚み（深いほど深い）。
  //  - 合成IR の convolver で"空間/沈降の残響"。wet は深いほど増える。
  //  - 圧(dread)で鼓動が速く・重く。core は描かない＝音でも"解決音"は鳴らさない。
  //  - below 周回ごとに setColor(seed) で detune/うねりを微妙にずらす＝底なしの質感差。
  const Audio = (() => {
    let ctx = null, master = null, filter = null, dryGain = null, conv = null, wetGain = null;
    let lfo = null, lfoGain = null, drones = [], pulseTimer = null, on = false, playing = false;
    // depth=深度(rank/沈下の濃い方・0..1) / dread=圧(0..1) / density=観測者の多声(0..1)。
    // depth.html のリアクティブ設計（深さ→音域/cutoff/残響、多声→密度、圧→不協和/鼓動）を
    // 同一document の内製エンジンへ畳み込んだ信号。menace=浅は馴染む/深で威圧。
    let cur = { depth: 0, dread: 0, density: 0 }, colorSeed = 0, baseCents = 0;
    const supported = () => !!(window.AudioContext || window.webkitAudioContext);

    // 倍音: ratio=基音比, base=常時gain, bloom=深度で開く量, diss=不協和(dread で開く)
    const PARTIALS = [
      { ratio: 0.5,  type: "sine",     base: 0.0,   bloom: 0.045, diss: 0 }, // 下のオクターブ（沈むと地鳴り）
      { ratio: 1,    type: "sine",     base: 0.075, bloom: 0.0,   diss: 0 }, // 基音
      { ratio: 1.5,  type: "triangle", base: 0.034, bloom: 0.0,   diss: 0 }, // 五度
      { ratio: 2.01, type: "sine",     base: 0.0,   bloom: 0.05,  diss: 0 }, // オクターブ（中盤で開花）
      { ratio: 2.99, type: "sine",     base: 0.0,   bloom: 0.04,  diss: 0 }, // 十二度（深部で開花）
      { ratio: 1.06, type: "sine",     base: 0.0,   bloom: 0.0,   diss: 0.03 } // ほぼ半音上＝うなり（dread で立つ）
    ];

    function makeImpulse(seconds, decay) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = buf.getChannelData(c);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    }

    function start() {
      if (on || !supported()) return;
      const C = window.AudioContext || window.webkitAudioContext;
      ctx = new C();
      master = ctx.createGain(); master.gain.value = 0.0001;
      master.gain.setTargetAtTime(0.16, ctx.currentTime + 0.05, 0.8);
      master.connect(ctx.destination);
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1000; filter.Q.value = 0.8;
      dryGain = ctx.createGain(); dryGain.gain.value = 0.85;
      filter.connect(dryGain); dryGain.connect(master);
      // 合成IR の残響（"空間"）。wet は深いほど増える。
      conv = ctx.createConvolver(); conv.buffer = makeImpulse(2.8, 2.6);
      wetGain = ctx.createGain(); wetGain.gain.value = 0.0001;
      filter.connect(conv); conv.connect(wetGain); wetGain.connect(master);
      // 共有 LFO：全 partial の detune を揺らす（うねり）。
      lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
      lfoGain = ctx.createGain(); lfoGain.gain.value = 4; lfo.connect(lfoGain); lfo.start();
      PARTIALS.forEach((spec) => {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = spec.type; osc.frequency.value = 70 * spec.ratio;
        g.gain.value = spec.base; osc.connect(g); g.connect(filter);
        lfoGain.connect(osc.detune); osc.start();
        drones.push({ osc, g, spec });
      });
      on = true; playing = true; schedulePulse(); apply(true);
      // 実手勢の中で resume()＝モバイルでも解禁される（同一document の context なので通る）。
      if (ctx.state !== "running") ctx.resume();
    }
    // playing は「鳴らす意図」を表す（ctx.suspend/resume は非同期で state 反映が遅れるため、
    // チップ表示はこの意図フラグを正にする）。
    function toggle() {
      if (!on) return start();
      playing = !playing;
      try { if (playing) ctx.resume(); else ctx.suspend(); } catch (e) {}
    }
    function apply(now) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const s = cur.depth, d = cur.dread, dens = cur.density;
      const base = 70 - s * 44;                          // 沈むほど低く（70→26Hz）
      const cutoff = 1150 - s * 860 - d * 220;           // 沈むほど暗く（深さ＋圧で翳る）
      const bloomCurve = Math.max(0, s - 0.10) / 0.90;   // 浅では開かない／深で倍音が開花
      const menace = d * (0.30 + 0.70 * s);              // 不協和は浅は馴染み・深で威圧（menaceカーブ）
      baseCents = (((colorSeed * 37) % 25) - 12) * 0.6; // 周回ごとの微デチューン（glitchHit の復帰先）
      const slow = now ? 0.25 : 1.3;
      drones.forEach((dr) => {
        const sp = dr.spec;
        // 多声(density)が増えるほど倍音が密に開く＝沈むほど密。不協和は menace で。
        let g = sp.base + sp.bloom * bloomCurve * (1 + dens * 0.7) + sp.diss * menace;
        dr.g.gain.setTargetAtTime(Math.max(0, g), t, now ? 0.3 : 1.6);
        dr.osc.frequency.setTargetAtTime(base * sp.ratio, t, slow);
        dr.osc.detune.setTargetAtTime(baseCents, t, 1.8);
      });
      filter.frequency.setTargetAtTime(Math.max(105, cutoff), t, slow);
      master.gain.setTargetAtTime(0.13 + d * 0.05, t, 0.8);
      wetGain.gain.setTargetAtTime(0.1 + s * 0.34, t, 1.8);            // 深いほど広い残響
      lfo.frequency.setTargetAtTime(0.05 + s * 0.1, t, 1.8);
      lfoGain.gain.setTargetAtTime(3 + s * 10 + dens * 4 + (colorSeed % 5), t, 1.8); // うねり幅（cents）
    }
    function schedulePulse() {
      if (pulseTimer) clearInterval(pulseTimer);
      pulseTimer = setInterval(() => beat(0.5), Math.max(440, Math.round(1150 - cur.dread * 680))); // 圧で鼓動が速い
    }
    function beat(amp) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = 44 - cur.depth * 16;
      osc.frequency.setTargetAtTime((44 - cur.depth * 16) * 0.7, t, 0.18); // 鼓動の沈み込み
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.05 * amp + cur.dread * 0.045, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g); g.connect(filter); osc.start(t); osc.stop(t + 0.6); // 鼓動も残響を通す
    }
    // グリッジ・バーストと同期して音も一瞬"裂ける"（共有信号＝視覚と一緒に壊れていく）。
    //  - drone を一瞬デチューン（音程が割れる）→ baseCents へ復帰
    //  - フィルタ cutoff を一瞬跳ねさせる（デジタルな破断）
    //  - 短いノイズ・バースト（バンドパス）でデータモッシュ的なザッという質感
    // intensity は深いほど大きい（Glitch から depth 連動で渡す）。
    function glitchHit(intensity) {
      if (!on || !ctx || ctx.state !== "running") return;
      const t = ctx.currentTime, amt = Math.max(0, Math.min(1.2, intensity));
      try {
        drones.forEach((dr) => {
          dr.osc.detune.cancelScheduledValues(t);
          dr.osc.detune.setValueAtTime(baseCents + (Math.random() * 2 - 1) * 55 * amt, t);
          dr.osc.detune.setTargetAtTime(baseCents, t + 0.03, 0.10);
        });
        const f0 = filter.frequency.value;
        filter.frequency.cancelScheduledValues(t);
        filter.frequency.setValueAtTime(Math.max(90, f0 * (1 + (Math.random() - 0.5) * 0.7 * amt)), t);
        filter.frequency.setTargetAtTime(f0, t + 0.04, 0.12);
        // 短いノイズ・バースト（datamosh の"ザッ"）。深いほど目立つ。
        const len = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const bp = ctx.createBiquadFilter(); bp.type = "bandpass";
        bp.frequency.value = 800 + Math.random() * 2600; bp.Q.value = 0.7;
        const ng = ctx.createGain(); ng.gain.value = 0.0001;
        ng.gain.setValueAtTime(0.018 * amt + cur.dread * 0.012, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        src.connect(bp); bp.connect(ng); ng.connect(master);
        src.start(t); src.stop(t + 0.06);
      } catch (e) {}
    }
    return {
      start, toggle, pulseOnce: (a) => beat(a), glitchHit,
      get on() { return on; },
      get playing() { return playing; }, // 鳴らす意図（チップ表示の正）
      setColor: (seed) => { colorSeed = seed; apply(false); },
      update: (depth, dread, density) => {
        const prev = cur.dread;
        cur = { depth, dread, density: density || 0 };
        apply(false);
        if (Math.abs(prev - dread) > 0.08) schedulePulse(); // 圧が動いたら鼓動の速さを取り直す
      }
    };
  })();

  // ---------- 手続き的曼荼羅（Ω/到達点の reactive ビジュアル） ----------
  // 硬い・乾いた・サイバーパンクの沈下美学。手描き画像でなく canvas で生成し、深度に呼応させる:
  //  - 8回対称（八観）。観測者数で層(rings)とスポーク(spokes)が増殖する。
  //  - 沈むほど暗く・彩度↓・最外リングが迫り上がる（CSSで下から接近、ここで輝度を上げる）。
  //  - 高dread で最外に warn 色の不協和リングが立つ。
  //  - 中心＝核は描かない(§4-1)。沈むほど中心の空白(void)が退いて広がり、深部のみ縁が白く灼ける。
  //  - reduced-motion は1枚静止描画。タブ非表示で rAF 停止（モバイル負荷）。
  const Mandala = (() => {
    const cv = $("mandala");
    if (!cv || !cv.getContext) return { start() {}, update() {} };
    const g = cv.getContext("2d");
    let raf = 0, last = 0, lastT = 0, size = 0, dpr = 1, started = false;
    let cur = { sink: 0, observer: 1, dread: 0 };

    function resize() {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.max(120, Math.floor(Math.min(r.width || 300, r.height || 300)));
      cv.width = Math.floor(size * dpr); cv.height = Math.floor(size * dpr);
      draw(0);
    }
    function draw(time) {
      if (!cv.width) return;
      const s = cur.sink, obs = cur.observer, d = cur.dread;
      const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, R = W * 0.46;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      const rot = REDUCED ? 0.3 : time * 0.00002;
      const spokes = 8 * (1 + Math.floor(obs / 7));        // 八観の倍数で増殖
      const rings = Math.min(16, 3 + Math.floor(obs / 1.5));
      const voidR = R * (0.10 + s * 0.32);                 // 核は描かない＝沈むほど退いて広がる空白
      const baseA = 0.045 + s * 0.05;
      for (let i = 0; i < rings; i++) {
        const f = (rings > 1) ? i / (rings - 1) : 0;       // 0=内 → 1=外
        const rr = voidR + (R - voidR) * f;
        if (rr <= voidR) continue;
        const dir = (i % 2) ? -1 : 1;                      // 交互逆回転＝モアレ
        const a = rot * (1 + i * 0.18) * dir + i * 0.2;
        const warn = (d > 0.6 && i >= rings - 1);
        const alpha = Math.min(0.5, baseA * (0.5 + f) * (0.7 + s * 0.7));
        g.beginPath();
        for (let k = 0; k <= spokes; k++) {
          const ang = a + (k / spokes) * Math.PI * 2;
          const wob = 1 + Math.sin(ang * 3 + i) * 0.014 * (1 + d);
          const x = cx + Math.cos(ang) * rr * wob, y = cy + Math.sin(ang) * rr * wob;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.lineWidth = Math.max(1, dpr * (warn ? 1.3 : 0.7));
        g.strokeStyle = warn
          ? "rgba(196,107,90," + (alpha * 1.5).toFixed(3) + ")"
          : "rgba(" + Math.round(127 - s * 34) + "," + Math.round(182 - s * 44) + "," + Math.round(196 - s * 30) + "," + alpha.toFixed(3) + ")";
        g.stroke();
      }
      // 放射スポーク（八観の軸）。void へは踏み込ませない。
      g.lineWidth = Math.max(1, dpr * 0.55);
      g.strokeStyle = "rgba(127,182,196," + (0.03 + s * 0.05).toFixed(3) + ")";
      for (let k = 0; k < spokes; k++) {
        const ang = rot * 0.6 + (k / spokes) * Math.PI * 2;
        const inner = voidR * 1.05, outer = R * (0.6 + s * 0.36);
        g.beginPath();
        g.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        g.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
        g.stroke();
      }
      // 中心の空（核）: “描かない”を黒で描く。沈むほど深い穴。
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(cx, cy, 0, cx, cy, voidR);
      vg.addColorStop(0, "rgba(0,0,0,1)");
      vg.addColorStop(0.72, "rgba(1,3,8,0.96)");
      vg.addColorStop(1, "rgba(2,4,10,0)");
      g.fillStyle = vg; g.beginPath(); g.arc(cx, cy, voidR, 0, Math.PI * 2); g.fill();
      if (s > 0.7) { // 覗くと白く灼ける（深部のみ・細い縁／点滅は reduced で固定）
        const flick = REDUCED ? 0.45 : (0.5 + 0.5 * Math.sin(time * 0.004));
        g.globalCompositeOperation = "lighter";
        g.lineWidth = Math.max(1, dpr * 0.8);
        g.strokeStyle = "rgba(222,233,238," + (0.06 * ((s - 0.7) / 0.3) * flick).toFixed(3) + ")";
        g.beginPath(); g.arc(cx, cy, voidR * 0.99, 0, Math.PI * 2); g.stroke();
      }
    }
    function loop(time) {
      if (time - last >= 33) { last = time; lastT = time; draw(time); } // ~30fps
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (started) return; started = true;
      resize();
      window.addEventListener("resize", resize);
      if (REDUCED) return;
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
        else if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
      });
      raf = requestAnimationFrame(loop);
    }
    return {
      start,
      // 深度が変わった瞬間に1枚即描画（reactivity の即応＋rAF が間引かれる環境でも反映）。
      // rAF ループは回転を継続させる。
      update: (sink, observer, dread) => { cur = { sink, observer, dread }; draw(lastT); }
    };
  })();

  // ---------- 反転重森ガーデン（R6：深度ゲートの背景ブレイクダウン） ----------
  // サイバーパンク × 重森三玲（Mirei Shigemori）のモダン枯山水が"バグった"背景。
  //  - 砂紋（掻き目／渦）・石組（角張った幾何）・市松苔（東福寺 北庭の象徴）を平面にぶちまける。
  //  - 色は枯山水の自然色（砂=暖ベージュ/苔=緑/石=灰）の色相を 180°反転＝不気味な反転色相
  //    （砂→冷たい青, 苔→マゼンタ）。基本ダーク・低彩度。原色は出さない（原色は leak 層が明滅で担う）。
  //  - 浅はクリーン（opacity≈0）。深く潜り"世界の輪郭が溶ける"深度から progressive に露出する。
  //  - 構図は worldSeed（＝分岐エンジンの信号：周回/到達深度/弾かれ履歴/ランク）で決定論再生成
  //    ＝state が変わるたび構図が組み直る。バグ（行ずらし/反転セル）は深さ+圧で強まる。
  //  - 描画は state 変化時（と resize）のみ＝rAF を持たない＝モバイル軽量。reduced は静止1枚。
  //    "動き"は上に乗る CSS グリッジ/leak が担う（共有信号）。
  const Garden = (() => {
    const cv = $("garden");
    if (!cv || !cv.getContext) return { start() {}, update() {} };
    const g = cv.getContext("2d");
    let W = 0, H = 0, dpr = 1, started = false;
    let cur = { depth: 0, dread: 0, seed: 0 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.floor((window.innerWidth || 360) * dpr));
      H = Math.max(1, Math.floor((window.innerHeight || 640) * dpr));
      cv.width = W; cv.height = H;
      draw();
    }
    function draw() {
      if (!W) return;
      g.clearRect(0, 0, W, H);
      const s = cur.depth, d = cur.dread;
      // 浅はクリーン（露出しない）。深く潜るほど世界が剥き出しに。screen blend で焼き込む。
      const vis = Math.max(0, (s - 0.12) / 0.88);
      cv.style.opacity = (vis * 0.92).toFixed(3);
      if (vis <= 0.003) return;
      const rng = mulberry32((cur.seed >>> 0) || 1);
      const R = (n) => rng() * (n == null ? 1 : n);
      const bright = 0.5 + s * 0.5;        // 深いほど僅かに灼ける（不気味な反転色が立つ）
      const mosh = s * 0.6 + d * 0.4;      // バグの強度：行ずらし／反転セル
      const minWH = Math.min(W, H);
      g.lineCap = "round";

      // --- 砂紋（掻き目）：水平の掻き目を平面にぶちまける。深いほど波打ち・行ずれ（datamosh）。 ---
      const rows = 22;
      const amp = H * 0.013 * (1 + s);
      const step = Math.max(8, Math.floor(12 * dpr));
      for (let i = 0; i < rows; i++) {
        const y = H * (i + 0.5) / rows;
        const a = (0.05 + s * 0.15) * bright;
        g.strokeStyle = "hsla(216," + (28 + s * 30).toFixed(0) + "%," + (46 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.lineWidth = Math.max(1, dpr * 0.8);
        // バグ：一部の行を横方向にごっそりずらす＝データモッシュの帯
        const band = (rng() < mosh * 0.55) ? (R(2) - 1) * W * 0.14 * mosh : 0;
        const freq = 2 + (i % 3);
        g.beginPath();
        for (let x = 0; x <= W; x += step) {
          const yy = y + Math.sin((x / W) * Math.PI * 2 * freq + i) * amp;
          const xx = x + (x > W * 0.5 ? band : 0);
          x === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        g.stroke();
      }

      // --- 石組＋渦（砂紋が石の周りで同心円に巻く） ---
      const stones = 2 + Math.floor(R(2.4));
      for (let n = 0; n < stones; n++) {
        const cx = W * (0.14 + R(0.72)), cy = H * (0.16 + R(0.66));
        const rings = 4 + Math.floor(R(4));
        for (let r = 1; r <= rings; r++) {
          const rr = r * (minWH * 0.022) * (1 + s * 0.5);
          const a = (0.08 + s * 0.13) * bright / Math.sqrt(r);
          g.strokeStyle = "hsla(210," + (30 + s * 24).toFixed(0) + "%," + (52 + s * 12).toFixed(0) + "%," + a.toFixed(3) + ")";
          g.lineWidth = Math.max(1, dpr * 0.7);
          g.beginPath();
          for (let k = 0; k <= 40; k++) {
            const ang = (k / 40) * Math.PI * 2;
            const wob = 1 + Math.sin(ang * 5 + r) * 0.045 * (1 + d);
            const x = cx + Math.cos(ang) * rr * wob, y = cy + Math.sin(ang) * rr * wob * 0.72;
            k ? g.lineTo(x, y) : g.moveTo(x, y);
          }
          g.closePath(); g.stroke();
        }
        // 石＝角張った幾何のワイヤーフレーム（冷たいシアン rim）
        const verts = 5 + Math.floor(R(3)), sr = minWH * (0.028 + R(0.03));
        g.strokeStyle = "hsla(190," + (40 + s * 20).toFixed(0) + "%," + (58 + s * 14).toFixed(0) + "%," + ((0.28 + s * 0.3) * bright).toFixed(3) + ")";
        g.lineWidth = Math.max(1, dpr * 1.1);
        g.beginPath();
        for (let k = 0; k <= verts; k++) {
          const ang = (k / verts) * Math.PI * 2 + R(0.3);
          const rad = sr * (0.7 + R(0.5));
          const x = cx + Math.cos(ang) * rad, y = cy + Math.sin(ang) * rad;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.stroke();
      }

      // --- 市松苔（東福寺 北庭の象徴）：反転モス＝マゼンタの石畳。端でフェード＝市松が崩れる。 ---
      const cols = 6, rowsC = 5, cell = minWH * 0.058 * (1 + s * 0.3);
      const ox = W * (0.04 + R(0.40)), oy = H * (0.50 + R(0.32));
      for (let yy = 0; yy < rowsC; yy++) for (let xx = 0; xx < cols; xx++) {
        if ((xx + yy) % 2) continue;                       // 市松＝一つ飛ばし
        const fade = 1 - (yy / rowsC) * 0.7;
        let gx = ox + xx * cell, gy = oy + yy * cell;
        const glitched = rng() < mosh * 0.4;               // バグ：深いほどセルがずれ／飛ぶ
        if (glitched) gx += (R(2) - 1) * cell * 0.5 * mosh;
        const a = (0.10 + s * 0.20) * fade * bright;
        g.fillStyle = glitched
          ? "hsla(170,70%,60%," + (a * 0.9).toFixed(3) + ")"   // 反転バグ＝シアンへ飛ぶ
          : "hsla(300," + (34 + s * 26).toFixed(0) + "%," + (30 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.fillRect(gx, gy, cell * 0.92, cell * 0.92);
      }
    }
    return {
      start() {
        if (started) return; started = true;
        resize();
        window.addEventListener("resize", resize);
      },
      // depth=深度(0..1) / dread=圧(0..1) / seed=worldSeed（分岐エンジンの信号）。state 変化時のみ再描画。
      update: (depth, dread, seed) => { cur = { depth, dread, seed }; draw(); }
    };
  })();

  // ---------- グリッジ（深度連動・描画の乱れ＝塗装が剥がれる） ----------
  // 短いバーストで body に .glitch-soft/.glitch-hard を付け、CSS が RGBずれ/走査線の裂け/
  // データモッシュを一瞬走らせる。深いほど高頻度・高強度（--gi）。バーストは <360ms・低頻度・
  // タブ非表示で停止＝モバイル軽量。reduced-motion は start を no-op（CSSが薄い静止フリンジ）。
  const Glitch = (() => {
    const root = document.documentElement.style;
    let depth = 0, dread = 0, timer = 0, started = false, paused = false, leakTimer = 0;
    const clearBurst = () => document.body.classList.remove("glitch-soft", "glitch-hard");
    // 隙間（あわい）から漏れる原色：ティファニーブルー／ラスタ（赤・金・緑）。常時は出さず明滅で。
    const LEAK = ["10,186,181", "216,68,46", "224,168,60", "46,168,96"];
    function setGi() { root.setProperty("--gi", Math.min(1, depth * 0.85 + dread * 0.28).toFixed(3)); }
    function burst() {
      const hard = Math.random() < (0.12 + depth * 0.55 + dread * 0.15);
      document.body.classList.add(hard ? "glitch-hard" : "glitch-soft");
      const dur = hard ? 130 + Math.random() * 210 : 80 + Math.random() * 110;
      // 原色 leak（深いほど漏れやすい・抑えるほど効く）：バーストに同調して一瞬だけ点く。
      if (Math.random() < (0.16 + depth * 0.5)) {
        root.setProperty("--leak-rgb", LEAK[Math.floor(Math.random() * LEAK.length)]);
        document.body.classList.add("leak-on");
        clearTimeout(leakTimer);
        leakTimer = window.setTimeout(() => document.body.classList.remove("leak-on"), Math.round(dur * 0.8));
      }
      // 音も一緒に裂ける（共有信号）：hard ほど・深いほど強い破断。Audio 未解禁時は no-op。
      Audio.glitchHit(hard ? (0.55 + depth * 0.5) : (0.28 + depth * 0.32));
      window.setTimeout(clearBurst, dur);
    }
    function schedule() {
      if (paused) return;
      const mean = Math.max(900, 8600 - depth * 5800 - dread * 1600); // 浅＝稀 / 深＝頻繁
      timer = window.setTimeout(() => { burst(); schedule(); }, mean * (0.45 + Math.random()));
    }
    function start() {
      if (started || REDUCED) return; started = true;
      document.addEventListener("visibilitychange", () => {
        paused = document.hidden;
        if (paused) { clearTimeout(timer); clearBurst(); } else schedule();
      });
      schedule();
    }
    return { start, update: (d, dr) => { depth = clamp01(d); dread = clamp01(dr); setGi(); } };
  })();

  // ---------- 塗装剥がれ／めくれ遷移（各遷移で層が一枚めくれて降りる） ----------
  const Peel = (() => {
    let t = 0;
    function play() {
      if (REDUCED) return;
      document.body.classList.remove("peeling");
      void document.body.offsetWidth;        // リフロー強制＝アニメ再起動
      document.body.classList.add("peeling");
      clearTimeout(t);
      t = window.setTimeout(() => document.body.classList.remove("peeling"), 700);
    }
    return { play };
  })();

  // ---------- 音楽コントローラ（同一document・実手勢で解禁する内製エンジン） ----------
  // 旧方式（depth.html を不可視 iframe に埋め、START を親から click して解禁）は廃止した:
  //   ・AudioContext.resume()/Tone.start() は「その context を持つ document の window」が
  //     transient activation を持つ実手勢ハンドラ内でしか通らない。User Activation は親→子
  //     iframe に降りないため、親(slice)の「沈む」タップでは cross-document の iframe を解禁
  //     できず、モバイルで音が鳴らなかった（不具合2）。
  //   ・解禁のため全画面オーバーレイ iframe を敷くと、重い depth 描画＋親 canvas が二重化して
  //     モバイルでフリーズした（v=m2-11 のフリーズ修正でオーバーレイを畳むと、今度は解錠タップが
  //     iframe に着地せず resume 不能に逆戻り）。
  // 解決: 音楽を slice 自身の document 内で鳴らす。内製エンジン(Audio)は同一document の
  //   AudioContext なので、「沈む」タップ（実ユーザー手勢・同一document）の中で start()→resume()
  //   すれば、その手勢がそのまま resume を通す＝モバイルでも堅牢に鳴り始める。depth.html の
  //   リアクティブ設計（深さ→音域/cutoff/残響、多声→密度、圧→不協和/鼓動、menaceカーブ）は
  //   Audio 側へ畳み込み済み（applyAtmosphere の Audio.update）。depth.html 単体デモは別repoに残す。
  const Music = (() => {
    const chip = $("audio-toggle");
    function label() {
      if (!chip) return;
      chip.textContent = Audio.playing ? "♪ 鳴っている" : "♪ 鳴らす";
      chip.setAttribute("aria-pressed", Audio.playing ? "true" : "false");
    }
    // 「沈む」タップ（実手勢・同一document）の中で呼ばれる＝ここで resume が通る。
    function startPrimary() { if (chip) chip.hidden = false; Audio.start(); label(); }
    function cycle() { Audio.toggle(); label(); }
    return { startPrimary, cycle };
  })();

  // ---------- 起動 ----------
  async function loadData() {
    const res = await fetch("depths-shell.json?v=r2", { cache: "no-store" });
    DATA = await res.json();
  }
  // ---------- 動く表紙（R6：タイトルも state/seed に応じて動く・静止でない） ----------
  // ゲート表示中、背後に反転ガーデンを薄く宿し（gate 背景は半透明）、グリッジが時折タイトルを裂き、
  // 原色が隙間から明滅する。構図は per-load の seed で毎回ちがい、ゆっくり別構図へ再生成＝生きた庭。
  // enter すると同じ深度信号（applyAtmosphere）へ引き継がれ、降下とともに深まる。
  let titleTimer = 0, titleSeed = 1;
  function titleAmbient() {
    Garden.start();
    Glitch.update(0.42, 0.16);       // 表紙の浅め深度：グリッジ頻度・--gi・原色 leak 強度の基準
    Glitch.start();                  // reduced は no-op（CSS が薄い静止フリンジ＝それでも"動かない表紙"でない）
    titleSeed = (Math.floor((Math.random() || 0.5) * 0x7fffffff)) >>> 0 || 1;
    Garden.update(0.5, 0.18, titleSeed);
    if (REDUCED) return;
    titleTimer = window.setInterval(() => {
      titleSeed = (Math.imul(titleSeed, 1664525) + 1013904223) >>> 0;  // ゆっくり別構図へ＝庭が掻き直される
      Garden.update(0.5, 0.18, titleSeed);
    }, 4800);
  }
  function stopTitleAmbient() { if (titleTimer) { clearInterval(titleTimer); titleTimer = 0; } }

  let entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    stopTitleAmbient();              // 表紙の生成ループを止め、深度信号（降下）へ明け渡す
    gateEl.classList.add("gone");
    buildReturnPaths();
    // ★ここは「沈む」ボタンの実タップ（同一document・transient activation 有）の中。
    //   この手勢の中で AudioContext を生成＆resume するので、モバイルでも音が鳴り始める。
    Music.startPrimary();
    Mandala.start();
    Glitch.start();
    renderNode(DATA.start || "zero");
  }
  function restart() {
    revealToken++;
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.maxSink = 0; state.observer = 1; state.steps = 0; state.belowLoop = 0; state.resisted = 0; state.refused = 0; state.resistBeat = null; state.rank = 0; state.cycle = 0; state.visits = {}; state.rejoin = null; state.attunement = 0; state.legacy = freshLegacy();
    if (document.body && document.body.classList) document.body.classList.remove("surfaced");
    const st = $("status"); if (st) st.textContent = "preview · M2 沈下スパイン";
    $("restart").hidden = true;
    buildReturnPaths();
    renderNode(DATA.start || "zero");
  }

  $("audio-toggle").addEventListener("click", () => Music.cycle());
  $("restart").addEventListener("click", restart);

  // 開発用フック（プレビュー検証専用・本体統合時は外す）: 任意ノードへ跳ぶ／状態を読む。
  window.__hz = { go: renderNode, choose, state, isAttuned, get sink() { return sinkNorm(); }, get attunement() { return state.attunement; } };

  loadData().then(() => {
    const gb = $("gate-enter");
    gb.disabled = false;
    titleAmbient();   // 表紙を動かす（反転ガーデン＋グリッジ＋原色 leak をゲート背後で薄く生かす）
    // 「沈む」の実タップ＝同一document の手勢。この中で enter()→Audio.start()→resume() が走る
    // ＝モバイルで AudioContext を堅牢に解禁できる（cross-document iframe・全画面オーバーレイは廃止）。
    gb.addEventListener("click", enter, { once: false });
  }).catch((e) => {
    $("scene").textContent = "深度データの読み込みに失敗しました。再読み込みしてください。";
    console.warn("[Hazama slice] load failed:", e);
  });
})();
