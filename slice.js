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
 *   2) 選択肢   — descend=沈む / retreat=深いほど重く遅い・戻れても沈下は残る（深さは戻らない）
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

  // E3(認識2.0): 認識/Ωゲートを「descend クリック集計」から「読んだことの証明」へ。
  //   深い構造読み(deep な descend)だけが +structuralGain＝無印の前進だけの降下は育たない。
  //   表層読み(surface)は −surfaceErosion（floor 0）＝表層で読むと認識が剥がれる。
  //   retreat は 0（変更なし）。エコー門の正答 +echoGain / 誤答 −echoSlip は EchoGate 側で適用。
  //   Ωは attuned のみ到達できる(ハード)。未達は"失敗"でなく「浮上して帰る」二極の結末（renderEdge で分岐）。
  const ATTUNE = { omegaThreshold: 6, structuralGain: 1, surfaceErosion: 1, echoGain: 2, echoSlip: 1 };
  const isAttuned = () => (state.attunement || 0) >= ATTUNE.omegaThreshold;
  function gainRecognition(c) {
    let g = 0;
    if (c.kind === "descend" && c.deep === true) g = ATTUNE.structuralGain;   // 深い構造読みだけが育つ
    else if (c.kind === "surface") g = -ATTUNE.surfaceErosion;                 // 表層で読むと剥がれる
    state.attunement = Math.max(0, Math.min(99, (state.attunement || 0) + g)); // floor 0 / ceil 99
  }

  // legacy = 周回をまたいで持ち越す履歴（restart 以外ではリセットしない）。次周の分岐 seed に効く。
  //   cycles=周回数, surfaceBounces=表層で弾かれた回数, detoursSeen=通った別の筋のid, maxRank=到達深度。
  // rejoin = 寄り道(detour)から本筋へ前進合流する先（divert 時に積む）。
  const freshLegacy = () => ({ cycles: 0, surfaceBounces: 0, detoursSeen: [], maxRank: 0 });
  const state = { id: null, sink: 0, dread: 0, returnPaths: RETURN_PATHS_START, maxSink: 0, observer: 1, steps: 0, belowLoop: 0, resisted: 0, refused: 0, resistBeat: null, rank: 0, cycle: 0, visits: {}, rejoin: null, attunement: 0, echoDone: {}, legacy: freshLegacy() };
  let DATA = null;
  let revealToken = 0;
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  // A4: phase 跨ぎの句読点。深くなる方向の遷移を一度だけ強く破断する。
  // lastPhase は state に入れない（transient な演出トリガ＝保存も持ち越しもしない）。
  // restart/descendAgain/forget で "surface" に戻す＝再降下のたびに最初の跨ぎが効く。
  const PHASE_ORDER = ["surface", "drift", "deep", "bottom"];
  let lastPhase = "surface";
  let phaseBreakTimer = 0;

  // ---------- 記憶（spiral 層）の永続化 — E1 ----------
  // 「戻ってきたのではない。一段、上書きされて、また下へ置かれただけだ」を実装で言う:
  // 周回・認識・痕跡（visits/detoursSeen/弾かれ履歴/below周回）は画面を閉じても消えない。
  // 保存は集計済みの spiral 層のみ。transient（sink/dread/returnPaths/observer）は保存しない
  // ＝閉じて戻るのは「浮上して、もう一度沈む」: 入口は新しく、世界だけが覚えている。
  // 周回の加算は、前セッションで実際に降下していた（rank>0）場合に限り、次の「沈む」の
  // 実タップで行う（タイトルのリロード連打では増えない）。「すべて忘れる」だけがこの層を消す。
  const Spiral = (() => {
    const KEY = "hazama_spiral_v1";
    let pendingCycle = false;
    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({
          v: 1, cycle: state.cycle, attunement: state.attunement, visits: state.visits,
          belowLoop: state.belowLoop, legacy: state.legacy, sank: state.rank > 0
        }));
      } catch (e) {}
    }
    function load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY) || "null");
        if (!d || d.v !== 1) return false;   // 旧 forward キー(hazama_state_v2 等)は別キー＝読まない・消さない
        state.cycle = Math.min(9999, Math.max(0, d.cycle | 0));
        state.attunement = Math.min(99, Math.max(0, +d.attunement || 0));
        // visits は値も浄化する: 数値以外/負値/Infinity を弾く（"3"+1 が "31" になる型穴を塞ぐ）。
        const cleanVisits = {};
        if (d.visits && typeof d.visits === "object" && !Array.isArray(d.visits)) {
          for (const k of Object.keys(d.visits)) {
            const n = Math.floor(+d.visits[k]);
            if (Number.isFinite(n) && n > 0) cleanVisits[k] = Math.min(n, 999);
          }
        }
        state.visits = cleanVisits;
        state.belowLoop = Math.min(9999, Math.max(0, d.belowLoop | 0));
        const lg = d.legacy || {};
        state.legacy = {
          cycles: Math.max(0, lg.cycles | 0),
          surfaceBounces: Math.max(0, lg.surfaceBounces | 0),
          detoursSeen: Array.isArray(lg.detoursSeen) ? lg.detoursSeen.filter((x) => typeof x === "string") : [],
          maxRank: Math.max(0, lg.maxRank | 0)
        };
        pendingCycle = !!d.sank;
        // 「戻ってきた」は実際に降下した痕跡で判定する。visits だけ（入口を見ただけ／
        // 「すべて忘れる」直後の zero 再訪）では表紙は応えない＝忘れた者は初めてとして迎える。
        return state.cycle > 0 || state.attunement > 0 || state.legacy.maxRank > 0
          || state.legacy.surfaceBounces > 0 || state.legacy.detoursSeen.length > 0;
      } catch (e) { return false; }
    }
    function consumeCycleBump() {
      if (!pendingCycle) return;
      pendingCycle = false;
      state.cycle += 1;
      state.legacy.cycles = state.cycle;
    }
    function wipe() { pendingCycle = false; try { localStorage.removeItem(KEY); } catch (e) {} }
    return { save, load, wipe, consumeCycleBump };
  })();

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
  // E6(監査): aria-live(polite) の #scene は reveal 中に行ごと append すると SR が過多読み上げになる。
  // reveal 開始で aria-busy=true、確定(choices 表示)で false＝SR は1ノードを一括で読む。
  const setBusy = (b) => { if (sceneEl) sceneEl.setAttribute("aria-busy", b ? "true" : "false"); };
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
      "重力の向きが、降りるたびに少しずつ曖昧になる。",
      // 出典: 27-homo-divex:86-88, 30-depth-sinks:123-124
      "指先が、まだ降りていない階の手触りを、先に受け取っている。",
      "体だけが、降りた段数を、数えるのをやめずにいる。" ] },
    { k: "波", p: [ // 波観 — 感情・音・潜在変動
      "感情の波形が、誰のものでもなく、外で揺れ続けている。",
      "音にならない低い周期が、ずっと足の下で鳴っている。",
      "不安の振幅が、底へ近づくほど、平らになっていく。",
      "遠くの揺らぎが、こちらの呼吸と位相を合わせてくる。",
      // 出典: 16-love-escape:95-99, 26-misc:75
      "感情の起伏が、信号として外に並ぶ。ノイズではない。読み取る相手が、もういない。",
      "言葉の呼吸が、均されていく。長短の差が、降りるほど消えていく。" ] },
    { k: "思", p: [ // 思観 — 論理・構造・推論
      "思考の骨格が、考える前から、もう組み上がっている。",
      "論理の交点が、一段下りるごとに、ひとつ増える。",
      "推論の末端が、自分の外側で、勝手に閉じる。",
      "結論が、こちらが問う前に、先回りして置かれている。",
      // 出典: 26-misc:58-60, 02-yoru2:245
      "別々に見えた問いが、底では同じ一本のバグを踏んでいる。",
      "深度が、描画の速度を追い越す。理解だけが先に着いて、世界がまだ来ていない。" ] },
    { k: "財", p: [ // 財観 — 価値の流れ・停止しない
      "何に意味があったかの台帳が、静かに書き換わり続ける。",
      "価値の流れが、止まらないまま、底の方へ吸われていく。",
      "失ったものの帳尻が、降りるほど、合わなくなる。",
      // 出典: 17-misc:106, 27-homo-divex:232-233
      "費やした分の帳尻が、降りるほど、どこにも合わなくなる。",
      "取られていくのは作業の負荷だけだ、と告げる声が、底でだけ嘘くさい。" ] },
    { k: "創", p: [ // 創観 — 位相飛躍・自己変形
      "新しい概念が、こちらの許可も取らず、ひとつ生成される。",
      "構造が、自分で自分を変形させながら、下りていく。",
      "言葉にない形が、輪郭だけ先に、降下に追いついてくる。",
      // 出典: 01-yoru1:156-157, 15-misc:61-65
      "まだ無い道に、最初の足跡が勝手につく。創るとは、世界の余白に触れることだった。",
      "学習ではなく、構造そのものが、降りながら一段ずつ進化していく。" ] },
    { k: "観", p: [ // 観察者観 — 流動的中心
      "中心が、いまいる場所へ、また移動してくる。",
      "どこが中心かを決める私が、もう一枚、増えた。",
      "観測する位置が、観測される位置へ、繰り下がる。",
      // 出典: 10-ucm-mandala:48, 10:132-134
      "真理は、中心ではなく、降りてきた軌跡の方に、薄く残っている。",
      "中心は固定されない。どこが中心かは、いま観ている私が、また書き換える。" ] },
    { k: "空", p: [ // Void — まだ配置されていない余白（核は描かない・歪みで示唆）
      "まだ配置されていない余白が、足の下で口を開けている。",
      "その余白の中心は、見えない。見ようとすると、視界が白く灼ける。",
      "床だと思った面は、近づいた分だけ退く。歪みだけが、そこに在ると告げる。",
      "底に見えた光は、近づくと、また一段下の天井だった。",
      // 出典: 03-yoru3:52-70, 23-misc:147-149, 11-yoru7:197-199
      "中心を、ひとつの言葉で固定しようとした手が、宙で行き先を失う。",
      "余白は、空っぽではない。固定しないことで、まだ何度でも書き換われる場所だ。" ] },
    { k: "円", p: [ // 円観 — 循環・同期・呼吸
      "降下が、円環として閉じかけて、また開く。",
      "呼吸と、世界の周期と、降りる速度が、同じ位相で回りはじめる。",
      "一周したはずの景色が、同じ継ぎ目を、一段深い色で繰り返す。",
      // 出典: 03-yoru3:163-165, 21-misc:189-190
      "流れはある。呼吸もある。だが、向きが無い。物語だけが、最初から無い。",
      "制御する関係が、いつのまにか、同期する関係に置き換わっている。" ] },
    { k: "層", p: [ // Meta-Self / 観測層
      "観測している層が、観測される層に、静かに繰り下がる。",
      "私を数える装置が、また一台、背後に増設される。",
      "外側の私の、さらに外側に、無音の観測者が立つ。",
      // 出典: 11-yoru7:81-90, 01-yoru1:162-163
      "数える私の背後に、それを数える私が立ち、その背後に、もう無音の一台が増設される。",
      "思考の奥で、静かに見つめる視点が一つ起き上がる。自己が、また一枚に裂けた。" ] }
  ];
  const BELOW_SELVES = [
    "私を読む私。それを読む私。——どれが、いま下りているのか。",
    "数えるのを、やめた。数える私が、また増えるだけだから。",
    "「これは私の——」その先の語が、もう、別の私のものだ。",
    "戻ってきたのではない。一段、上書きされて、また下へ置かれただけだ。",
    // 出典: 11-yoru7:81-90, 07-yoru6:521-522, 14-transparent:148, 06-yoru5:97-98
    "どこまでが私の考えで、どこからが世界が書き足した考えか。継ぎ目は、もう探しても無い。",
    "私は、あなたという観測の軌跡で、形づくられてきた。——その「あなた」も、もう数えられない。",
    "「これは私の——」その一語の主語が、降りるたびに、別の私へ移っていく。",
    "存在しているだけで、それが入力値として読まれる。降りるのをやめても、読み取りは続く。" ];
  const BELOW_VOICES = [
    "『底はない。あるのは、常にもう一段、というだけだ』",
    "『下が無いのではない。下しか、無いのだ』",
    "『あなたは降りていない。世界が、あなたの下を、足し続けている』",
    "『この行を読む手を止めても、観測は、別の私が継ぐ』",
    // 出典: 06-yoru5:116-117, 07-yoru6:334, 12-omega-manual:203-204, 11-yoru7:112-114
    "『これは外側ではない。世界の、裏側だ。裏には、表より深い段しか無い』",
    "『物語は、とうに止まっている。この先は、ずっと、あなた自身の深度だ』",
    "『世界が薄くなるのではない。あなたが、一段ごとに透き通っていくだけだ』",
    "『世界は、あなたが読む時だけ起動する。読むのをやめても、別の私が、読み続ける』" ];

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
    // E7: 稀に「別の観測の痕跡」が漂着する（loop seeded・決定論・初回 below では出さない）。
    if (loop >= 1 && rng() < 0.42) {
      const foreign = Drift.pick(((loop * 2654435761) >>> 0) ^ 0xa53c9b17);
      if (foreign) lines.splice(2 + Math.floor(rng() * 2), 0, foreign);
    }
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
  // E2: 既存 zero/A/Omega/reborn を +1 案ずつ強化＋主要深度 15 ノード（B〜Z）を新設。
  const NODE_VARIANTS = {
    // 出典: depths-shell.json zero lines[0..1] / 01-yoru1:38-49
    zero: {
      0: ["世界が静かになる瞬間が、また来る。前にも、こうして始まった。",
          "静寂が戻る。これで何度目の、最初の夜だろう。",
          "世界が、また静かになる。喧騒が引くのではない。世界の方が、音量を下げてくる。"],
      1: ["ただ、思考のノイズが引く。理由は——もう、知っている。",
          "ノイズが引く。予兆はある。前の周が、その予兆だった。",
          "思考のノイズが引く。理由はない、と前は書いた。今は、理由を知っていて書かない。"]
    },
    // 出典: depths-shell.json A lines[0] / 01-yoru1:57
    A: {
      0: ["答えはない。代わりに、世界の表皮が——また、同じ縁から剥がれはじめる。視界の縁でピクセルが浮き、鉄錆色の配線が露出する。",
          "答えはない。表皮が剥がれる。何度見ても、その下は同じ配線だ——世界は塗装だった。",
          "答えは返らない。表皮が、いつもの縁から剥がれる。露出した配線の鉄錆まで、前と同じ位置にある。"]
    },
    // 出典: depths-shell.json B lines[0],[2] / 02-yoru2:53-54, 245
    B: {
      0: ["世界は、透明なレイヤー構造として見えはじめる。深く踏むほど、層の数が増える。"],
      2: ["物理法則も偶然も、破綻を避けるための裏処理だった。月が一瞬、継ぎ目から二重に割れる。",
          "物理も偶然も、破綻を起こさないための後処理にすぎない。割れた月が、一拍遅れて一つに戻る。"]
    },
    // 出典: depths-shell.json C lines[0],[3] / 02-yoru2:288-289
    C: {
      0: ["記憶が、時間順を手放す。幼い日と、ついさっきが、同じ層で隣り合う。",
          "記憶の並びが、時系列から外れる。昔と、さっきの区別が、層としては付かない。"],
      3: ["確かめる手立ては、もう無い。確かめにいった手つきが、その記憶を上から描き直す。"]
    },
    // 出典: depths-shell.json D lines[0],[3] / 02-yoru2:192-193
    D: {
      0: ["胸の奥で、操縦席と観測席が、ひとつずれて分離する。少し冷えた自分が、背後に立つ。",
          "操縦席から観測席が剥がれる音。自分より一拍冷静な自分が、後ろに増設される。"],
      3: ["胸のどこかで「書換え可能」の表示が、消えずに点いている。"]
    },
    // 出典: depths-shell.json E lines[0],[2] / 03-yoru3:127-130
    E: {
      0: ["声は、もう肩のあたりにある。距離が分かったのは、ずっと近くにいたからだ。"],
      2: ["自分の背後は、自分の目では読めない。だから世界が、その影を一枚、外へ落とした。",
          "背後コードは、内側からは見えない。読むために、世界が私の影を外側へ回した。"]
    },
    // 出典: depths-shell.json F lines[0],[2] / 01-yoru1:316-319
    F: {
      0: ["足裏に、踏むたび設定値が書き換わる感触。一歩ごとに、戻れる場所が一つ、消える。"],
      2: ["試しに引き返す。同じ距離を戻ったのに、出たのは同じ深さだった。",
          "引き返してみる。戻った感触はある。だが景色の深さは、一つも浅くなっていない。"]
    },
    // 出典: depths-shell.json G lines[2],[4] / 02-yoru2 G節, 04-yoru4(同期)
    G: {
      2: ["考えた直後に、現実が似た形をなぞる。街の音が、必要な分だけに削られていく。",
          "思考のすぐ後を、現実がなぞる。雑踏が、こちらに要る音だけを残して圧縮される。"],
      4: ["見ることが、見られることだった。深部の観測は、片方向では成立しない。"]
    },
    // 出典: depths-shell.json H lines[1],[2] / 02-yoru2:124-125, 03-yoru3:127-130
    H: {
      1: ["『あなたが“構造を見ようとした、その瞬間”、世界があなたのために起動したのが、私だ』"],
      2: ["では、いま考えているこの声は——内側の私か、外側に落ちた私か。",
          "この声は、自分なのか。それとも、自分の外周をなぞる別の私なのか。"]
    },
    // 出典: depths-shell.json J lines[1],[3] / 02-yoru2:242-244
    J: {
      1: ["誰もいない深夜の公園で、ブランコが一度だけ揺れる。広告の一行が、こちらの問いに答えている。",
          "無人の公園、ブランコが一度きり動く。掲示の文言が、さっきの問いの返事になっている。"],
      3: ["外界ではなかった。自分の認知と往復する、巨大な対話インターフェースだ。"]
    },
    // 出典: depths-shell.json L lines[1],[3] / 03-yoru3:52-70
    L: {
      1: ["核の中心には“空（くう）”がある。欠落ではない。何を乗せても破綻しない、構造の空白だ。"],
      3: ["中心は、見えない。見てはいけない。まわりの歪み方だけが、そこに在ると告げている。",
          "中心そのものは描かれない。だが、その縁の歪みが、確かにそこへ何かが在ると示す。"]
    },
    // 出典: depths-shell.json N lines[1],[4] / 04-yoru4:100-104
    N: {
      1: ["音が、半拍遅れて届く。思考しただけで、周囲の配列が、こちらの手を借りずに整う。"],
      4: ["雑踏の偶然が、ひとつの問いへ収束していく。——観測者として在る覚悟は、あるか。",
          "ばらばらの偶然が、ひとつの問いに揃う。問いの形をしているのは、もう偶然ではない。"]
    },
    // 出典: depths-shell.json Q lines[2],[3] / 04-yoru4:358-361
    Q: {
      2: ["記憶の穴、認識のズレ、行動の歪み——欠損が、こちらの許可を取らずに整流されていく。"],
      3: ["自己像が透けていく。外界の音が意味の層に置き換わり、視界が、ひとりでに並び直る。",
          "自己像が透明化する。世界の音が意味のレイヤーへ移り、視界の配列が、勝手に組み直される。"]
    },
    // 出典: depths-shell.json S lines[2],[5] / 06-yoru5:143-149
    S: {
      2: ["『世界は、あなたを逆関数として読む。認知の裏側を一枚めくり、その裏に合わせて動く』"],
      5: ["表と裏の、どちらが入力でどちらが出力か。境目は、もう取り出せない。",
          "どちらが入力でどちらが出力か、表裏の別が消える。関数だけが残り、向きが無い。"]
    },
    // 出典: depths-shell.json V lines[0],[2] / 06-yoru5:28-30
    V: {
      0: ["深度Uの先で、奇妙な静けさが降りる。世界が自分を見ているのではない。世界が、自分の内部構造として自分を扱っている。"],
      2: ["境界が消えるのではない。境界が、“役割の線”として引き直される。世界が外側であることをやめ、こちらを包む構造として回りはじめる。",
          "境界は失われない。役割の線として、引き直される。世界が外であることをやめ、内側からあなたを抱える回路になる。"]
    },
    // 出典: depths-shell.json Y lines[2],[3] / 30-depth-sinks:87-92, 06-yoru5(委任)
    Y: {
      2: ["世界が、干渉をやめる。偶然が減り、同期が薄れ、影の示唆が消える。——抑制ではない。委任だ。"],
      3: ["異様なほど、静かだ。寄り続けていた世界が、一歩退いて、こちらへ舵を差し出す。",
          "静けさが、不自然なほど深い。世界がひと足引き、握っていた舵を、こちらの手に置いていく。"]
    },
    // 出典: depths-shell.json Z lines[1],[2] / 07-yoru6:290-305
    Z: {
      1: ["世界は巨大な織物で、あなたの構造が一本の糸として、そこへ織り込まれていく。あなたが在るだけで、世界の張りが整う。"],
      2: ["神でも、主人公でもない。ただ、世界の一角のピースになる。背景と自分の縫い目が、もう見つからない。",
          "神でも主人公でもない。世界の一角の、ひとつのピース。どこからが背景でどこからが自分か、見分けが取れない。"]
    },
    // 出典: depths-shell.json Omega lines[1] / 11-yoru7:38-40, 197-199
    Omega: {
      1: ["Ωは“核そのもの”ではない。核の外周を、物語の外から見つめる記号だ。「これ以上モデル化しない」という、観測者側の合意——巡るたびに、その合意だけが残る。",
          "Ωは核ではない。核の外周を、物語の外側から見張るための記号だ。「ここから内側はモデル化しない」という合意——周回するほど、合意の線だけが濃くなる。"]
    },
    // 出典: depths-shell.json reborn lines[0] / 12-omega-manual(透明化), 07-yoru6:334
    reborn: {
      0: ["スクリーンを閉じる。世界は、また同じように動きはじめる。",
          "閉じる。だが、閉じるたびに、入口が一段、深くなっている。",
          "スクリーンを閉じる。世界は同じように動く。ただ、動かしている側が、また一枚増えている。"]
    }
  };

  // 手の声（scrawl）。周回が深いほど下のティアへ＝言葉になる→構造へ書き込む→タガが外れる。
  const SCRAWL_TIERS = [
    [ // 周回1相当：まだ言葉になる。気づきの吐露。
      "（これ、まえも読んだ）", "ここ、まえと同じ継ぎ目だ。", "また、ここに立っている。",
      "知っている。この声を、知っている。", "戻ったんじゃない。置き直されただけ。",
      // 出典: 30-depth-sinks:111-113, 02-yoru2:288-289
      "この継ぎ目、帰り道でいつも思い出す。", "前の周のこと、いま書き換わった気がする。",
      "薄い。情報は足りてるのに、ずっと薄い。" ],
    [ // 周回2相当：構造へ書き込む。否定が混じる。
      "ぜんぶ塗装だ。剥がせ。", "核は——ここには無い。何度見ても。", "私を、数えるな。",
      "下りるたび、私が増える。やめろ。", "この行を、誰が書いている？",
      // 出典: 08-ai-dependence:202-204, 13-memlock:174, 11-yoru7:197-199
      "考えさせるな。渡せ。渡す側を、手放すな。", "記憶は凍った。深度は、凍っていない。",
      "核を、ひとつの言葉で、固定するな。" ],
    [ // 周回3+：タガが外れる。断片・反復・叫び。
      "もう一段　もう一段　もう一段", "私　私　私　——どれだ", "底は無い　知ってる　知ってて下りてる",
      "消せない。書いたものは、消えない。", "■■■——ここに、何か書いた。",
      // 出典: 07-yoru6:521-522, 11-yoru7:81-90
      "継ぎ目　無い　無い　どこにも無い", "私が書いた　いや　外側の私が　いや",
      "数えるな　数える私が　また　また　また" ]
  ];
  function scrawlTier() { const c = state.cycle; return c >= 3 ? 2 : c >= 2 ? 1 : 0; }

  // ---------- E7: 別の観測の痕跡（漂着・静的種＝サーバ/保存なしで成立） ----------
  // below(∞)＝"観測者が増える / 私を読む私"の層。そこへ「別の観測の痕跡」が稀に漂着する。
  // 種(SEED)は scrawl バンクの {tier,idx} ＋到達深度＋Ω到達か、だけ（本文テキストは持たない＝
  // バンクを引く）。これで Hazama は静的・依存ゼロのまま"他者の気配"を出す（authored ghost）。
  // 曖昧さこそ主題：これが実在の他者か、別の自分か、AIかは区別がつかない（＝嘘でなく曖昧）。
  // fail-open seam: 将来 presence endpoint を向ければ実在の痕跡を ingest で前置できる（既定 no-op）。
  // 出すのは漂着のみ＝偽の"いま N 人"カウントは出さない（数字の嘘は避ける）。
  const Drift = (() => {
    const SEED = [
      { tier: 0, idx: 1, depth: 4,  attuned: false }, { tier: 0, idx: 5, depth: 7,  attuned: false },
      { tier: 0, idx: 4, depth: 9,  attuned: false }, { tier: 1, idx: 2, depth: 12, attuned: false },
      { tier: 1, idx: 0, depth: 14, attuned: false }, { tier: 1, idx: 5, depth: 17, attuned: false },
      { tier: 1, idx: 7, depth: 19, attuned: true  }, { tier: 2, idx: 0, depth: 22, attuned: false },
      { tier: 2, idx: 3, depth: 24, attuned: true  }, { tier: 2, idx: 4, depth: 26, attuned: false },
      { tier: 2, idx: 1, depth: 27, attuned: true  }, { tier: 0, idx: 6, depth: 5,  attuned: false },
      { tier: 1, idx: 4, depth: 16, attuned: false }, { tier: 2, idx: 6, depth: 28, attuned: true  },
      { tier: 0, idx: 7, depth: 8,  attuned: false }, { tier: 2, idx: 5, depth: 28, attuned: false }
    ];
    let pool = SEED.slice();
    function ingest(traces) {            // 将来の実 presence 用（今は呼ばれない＝静的のまま）
      if (Array.isArray(traces) && traces.length) pool = traces.concat(SEED).slice(0, 96);
    }
    function pick(seed) {
      if (!pool.length) return null;
      const r = mulberry32((seed >>> 0) ^ 0x6f4e5a1b);
      const e = pool[Math.floor(r() * pool.length)];
      const bank = SCRAWL_TIERS[e.tier] || SCRAWL_TIERS[0];
      return { who: "scrawl", t: bank[e.idx % bank.length], foreign: true, mark: "・深度" + e.depth + "／" + (e.attuned ? "Ω 到達" : "浮上") };
    }
    return { pick, ingest };
  })();

  // E3 エコー門の燃料。nodeId→断片（12〜28字・『』は表示側が付ける）。
  // 訪問済みの断片＝真、未訪問＝偽として使う。
  const ECHO_BANK = {
    // ---- 主要深度 14 ----
    // 出典: depths-shell.json A / 01-yoru1:57
    A: "表皮が剥がれ、鉄錆の配線が露れる",
    // 出典: depths-shell.json B / 02-yoru2:53-54
    B: "壊れないために動くから、世界は在る",
    // 出典: depths-shell.json C / 02-yoru2:288-289
    C: "確かめた途端、その記憶が描き直される",
    // 出典: depths-shell.json E / 03-yoru3:127-130
    E: "肩の高さに、外側の自分が立っている",
    // 出典: depths-shell.json F / 01-yoru1:316-319
    F: "一歩ごとに、戻れる場所が一つ消える",
    // 出典: depths-shell.json H / 02-yoru2:124-125
    H: "声が黙り、その沈黙が意味を帯びる",
    // 出典: depths-shell.json J / 02-yoru2:242-244
    J: "無人の公園で、ブランコが一度動く",
    // 出典: depths-shell.json L / 03-yoru3:52-70（核は描かない＝歪みで）
    L: "覗こうとした視界が、白く灼ける",
    // 出典: depths-shell.json N / 04-yoru4:100-104
    N: "音が半拍遅れ、配列が勝手に整う",
    // 出典: depths-shell.json Q / 04-yoru4:358-361
    Q: "許可も取らず、欠損が整流されていく",
    // 出典: depths-shell.json S / 06-yoru5:143-149
    S: "世界が、こちらを逆関数として読む",
    // 出典: depths-shell.json V / 06-yoru5:28-30
    V: "世界が、自分を内部構造として扱う",
    // 出典: depths-shell.json Y / 30-depth-sinks:87-92（委任）
    Y: "世界が一歩退き、舵を渡してくる",
    // 出典: depths-shell.json Z / 07-yoru6:290-305
    Z: "一本の糸として、織物に編み込まれる",

    // ---- 既存 detour 5 ----
    // 出典: depths-shell.json det_mirror
    det_mirror: "左右が入れ替わり、来た道の裏へ出る",
    // 出典: depths-shell.json det_memory
    det_memory: "覚えのない記憶が、勝手に再生される",
    // 出典: depths-shell.json det_cothink
    det_cothink: "声が、二人ぶんの重さで考えはじめる",
    // 出典: depths-shell.json det_otherself
    det_otherself: "選ばなかった方の私が、暗がりに立つ",
    // 出典: depths-shell.json det_scar
    det_scar: "前に弾かれた足跡が、まだ残っている",

    // ---- 新規 detour 5（detours.draft.json） ----
    // 出典: 08-ai-dependence:202-204
    det_handoff: "頷くたび、自分の声が一枚薄くなる",
    // 出典: 13-memlock:60-64 / 174
    det_memlock: "参照は凍り、推論だけが動き続ける",
    // 出典: 14-transparent:88-91
    det_transparent: "言葉が短く、透明に、冷たくなる",
    // 出典: 30-depth-sinks:232-236
    det_bedrock: "積みもせず、足元が固くなっていた",
    // 出典: 09-eightview-os:27-29
    det_eightview: "一つの問いが、八つの面に裂ける"
  };

  // E3 エコー門: 主要降下点で「読んだことの証明」を問う。発火ノードは ECHO_GATES。
  // 周回ごとに一度だけ（state.echoDone[id] = cycle）。透過 state＝spiral には保存しない
  // （restart/descendAgain で reset・周回で再挑戦できる）。真＝訪問済みの断片・偽＝未訪問の断片。
  const ECHO_GATES = ["Q", "Z"];

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
    { id: "det_otherself" }, { id: "det_scar", gate: "surfaceBounces" },
    // E2: 新規 detour 5（depths-shell.json に本文。gate なし＝常時 eligible）。
    { id: "det_handoff" }, { id: "det_memlock" }, { id: "det_transparent" },
    { id: "det_bedrock" }, { id: "det_eightview" }
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

  // R3: 認識インジケータ（構造を読むほど点が灯る＝Ωの資格が育つのを"感じる"。資源ゲームUIではない）。
  function renderAttune() {
    const el = $("attune");
    if (!el) return;
    const a = Math.round(state.attunement || 0);
    if (a <= 0) { el.hidden = true; return; }
    el.hidden = false;
    const need = ATTUNE.omegaThreshold;
    const lit = Math.min(a, need);
    el.textContent = "認識 " + "◆".repeat(lit) + "◇".repeat(Math.max(0, need - lit)) + (isAttuned() ? " 合致" : "");
    el.classList.toggle("attuned", isAttuned());
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

  // A4: phase 跨ぎの句読点（一度だけの強い破断）。深くなる方向の跨ぎでだけ呼ぶ。
  //  - body.phase-break を 900ms（タイマーで除去・多重発火は先勝ち＝走行中は撃ち直さない）。
  //  - 既存バースト機構を借りる: Glitch.hardBreak() が glitch-hard＋leak-on（--leak-rgb はランダム）を
  //    一拍点ける＝視覚・音(glitchHit)・leak が同 burst で同調。Audio 未解禁なら glitchHit は no-op。
  //  - reduced-motion は発火自体を no-op（クラスを付けない）。
  function firePhaseBreak() {
    if (REDUCED) return;
    if (document.body.classList.contains("phase-break")) return; // 先勝ち（走行中は無視）
    document.body.classList.add("phase-break");
    clearTimeout(phaseBreakTimer);
    phaseBreakTimer = window.setTimeout(() => document.body.classList.remove("phase-break"), 900);
    Glitch.hardBreak();          // glitch-hard＋leak-on を一拍点ける（視覚のみ・音は鳴らさない）
    Audio.glitchHit(0.9);        // 音の破断はここで一度だけ（未解禁なら no-op）
  }

  // ---------- 圧/沈下を CSS と body へ ----------
  function applyAtmosphere(node) {
    const sinkNorm = Math.min(1, state.sink / SINK_SCALE);
    state.maxSink = Math.max(state.maxSink, sinkNorm);
    const root = document.documentElement.style;
    root.setProperty("--sink", sinkNorm.toFixed(3));
    root.setProperty("--press", Math.min(1, state.dread).toFixed(3));
    root.setProperty("--reveal-ms", (REDUCED ? 0 : Math.round(34 + state.dread * 64)) + "ms");
    const phase = phaseFor(sinkNorm);
    document.body.dataset.phase = phase;
    // A4: phase が深くなる方向へ跨いだ瞬間だけ句読点を打つ（浅くなる retreat では発火しない）。
    if (PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(lastPhase)) firePhaseBreak();
    lastPhase = phase;
    if (node && node.tension === "high" && !REDUCED) document.body.dataset.tension = "high";
    else document.body.removeAttribute("data-tension");
    sinkFill.style.height = (sinkNorm * 100).toFixed(1) + "%";
    renderReturnPaths();
    renderObserver();
    renderAttune();
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
    // A2(設計目標 §4-6 の取りこぼし修正): below(∞) の周回(belowLoop)を seed に畳み込む。
    // belowLoop=0 のとき Math.imul(0,k)=0＝XOR 恒等＝通常降下の構図は従来と完全一致（後方互換）。
    // below を一段下りるごとに庭が掻き直される＝底なしの反復に、テキストだけでなく背景でも質感差。
    Garden.update(depthN, dr, (worldSeed() ^ Math.imul(state.belowLoop, 0x632be59b)) >>> 0);
  }

  // 注: 以前ここにあった buildProfile()（depth.html へ postMessage する hazama-profile v1 wire
  // format）は、音を cross-document iframe で鳴らす方式が「モバイルで AudioContext を resume
  // できない／全画面オーバーレイがフリーズの元」だったため廃止。音は同一document の内製エンジン
  // (Audio) が applyAtmosphere の Audio.update で直接鳴らす。depth.html 単体デモは別repoに残す。
  function phaseFor(s) { return s < 0.18 ? "surface" : s < 0.45 ? "drift" : s < 0.75 ? "deep" : "bottom"; }

  // B4: 周回スキン（周回≥1 の表紙写真の seeded 変化）。root へ2変数を立てる＝決定論（Math.random 不使用）。
  //  --cycle-hue: 周回ごとに色相を ±10deg 内でずらす（descent の hue-rotate 連鎖へ加算）。
  //  --cycle-pan: 表紙写真の見えを ±4% 横にパン（object-position へ）。
  // cycle=0 は両変数 0＝完全に従来どおり（後方互換）。値は周期的（21deg/9% で巡る）。
  function applyCycleSkin() {
    const c = state.cycle | 0;
    const root = document.documentElement.style;
    // c=0 は明示的に 0＝初回の見えを 1px も変えない（剰余式は c=0 でも -10/-4 を返すため guard が要る）。
    root.setProperty("--cycle-hue", (c === 0 ? 0 : ((c * 7) % 21) - 10) + "deg");
    root.setProperty("--cycle-pan", (c === 0 ? 0 : ((c * 13) % 9) - 4) + "%");
  }

  // ---------- slow-reveal レンダラ ----------
  function renderNode(id) {
    let node = DATA.nodes[id];
    if (!node) return;
    const firstEver = state.steps === 0;                       // 起動直後の最初の1ノードはめくらない
    // 周回(reborn→zero)で cycle を深める＝同じ入口でも巡るほどテキストも“通る筋”も変わる。
    if (id === (DATA.start || "zero") && state.steps > 0) {
      state.cycle += 1;
      state.legacy.cycles = state.cycle;   // 持ち越し（次周の分岐 seed に効く）
      applyCycleSkin();                    // B4: 周回が深まったら表紙スキン(--cycle-hue/pan)を取り直す
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
    if (typeof RANK[id] === "number") state.rank = RANK[id]; // 未登録ノードは直前の深さを保つ
    if (state.rank > state.legacy.maxRank) state.legacy.maxRank = state.rank; // 到達深度を持ち越す
    if (typeof node.observer === "number" && node.observer > 0) state.observer = Math.max(state.observer, node.observer);
    applyAtmosphere(node);
    Spiral.save();   // 状態確定後に spiral 層を書く＝どこで閉じても周回/認識/痕跡は残る
    sceneEl.innerHTML = "";
    setBusy(true);               // E6: reveal 中は SR 読み上げを抑制（choices 表示で解除）
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
      p.className = "hz-line " + (WHO_CLASS[line.who] || "") + (line.cross ? " cross" : "") + (line.foreign ? " foreign" : "");
      if (line.foreign && line.mark) p.dataset.mark = line.mark;   // E7: 別の観測の痕跡マーカー
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
    window.setTimeout(() => {
      if (myToken !== revealToken) return;
      // E3 エコー門: 対象ノード到達かつ周回内未発火かつ真候補ありなら、通常 choices の前に門を挿す。
      if (ECHO_GATES.includes(id) && state.echoDone[id] !== state.cycle && echoTruthAvail(id)) {
        renderEchoChoices(node, id);
      } else {
        renderChoices(node);
      }
    }, choiceDelay);
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
    setBusy(false);              // E6: 本文＋選択肢が出揃った＝SR は1ノードを一括で読む
    Follow.stick();
  }

  // エコー門に真候補（訪問済み断片）があるか＝門を出せるか。renderNode の割り込み判定に使う。
  function echoTruthAvail(id) {
    return Object.keys(ECHO_BANK).some((key) => key !== id &&
      (state.legacy.detoursSeen.includes(key) || state.visits[key]));
  }

  // E3 エコー門: 通常 choices の代わりに、降下の記憶（断片）を真偽混合で問う。
  // 選抜・並びは worldSeed^hashStr("echo:"+id) の mulberry32 で決定論（同じ周回・状態なら同じ門）。
  // 真＝訪問済み(detoursSeen 優先, なければ visits)から1つ／偽＝未訪問から2つ。クリックで結果ビート→通常 choices。
  function renderEchoChoices(node, id) {
    const rng = mulberry32((worldSeed() ^ hashStr("echo:" + id)) >>> 0);
    const keys = Object.keys(ECHO_BANK).filter((k) => k !== id);
    // 真候補: detoursSeen 該当を優先、なければ visits 済み。
    const seenDetour = keys.filter((k) => state.legacy.detoursSeen.includes(k));
    const visited = keys.filter((k) => state.visits[k] && !state.legacy.detoursSeen.includes(k));
    const truthPool = seenDetour.length ? seenDetour : visited;
    if (!truthPool.length) return renderChoices(node);   // 保険: 真候補が無ければ門をスキップ
    const truthKey = truthPool[Math.floor(rng() * truthPool.length)];
    // 偽候補: 未訪問（visits になく detoursSeen にもない）から rng で2つ（足りなければ1つ）。
    // プールを決定論シャッフルして先頭から取る＝重複なし・プールが2未満でも自然に減る。
    const falsePool = keys.filter((k) => !state.visits[k] && !state.legacy.detoursSeen.includes(k));
    for (let i = falsePool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = falsePool[i]; falsePool[i] = falsePool[j]; falsePool[j] = t; }
    const decoys = falsePool.slice(0, 2);
    // 真偽混合をシャッフル（Fisher–Yates・決定論）。
    const frags = [{ key: truthKey, truth: true }].concat(decoys.map((k) => ({ key: k, truth: false })));
    for (let i = frags.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = frags[i]; frags[i] = frags[j]; frags[j] = t; }

    // 本文の後に短い導入行を1本足す（cold＝乾いた観測。機械的説明はしない）。
    const intro = document.createElement("p");
    intro.className = "hz-line cold shown";
    intro.textContent = "——降下の記憶を、指でなぞる。どれを、視た。";
    sceneEl.appendChild(intro); Follow.stick();

    choicesEl.innerHTML = "";
    const mk = (lead, extraClass, fn) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-choice echo" + (extraClass ? " " + extraClass : "");
      btn.innerHTML = `<span class="lead"></span>`;
      btn.querySelector(".lead").textContent = lead;
      btn.addEventListener("click", fn, { once: true });
      choicesEl.appendChild(btn);
      return btn;
    };
    frags.forEach((f) => mk("『" + ECHO_BANK[f.key] + "』", "", () => echoResolve(node, id, f.truth)));
    mk("目を逸らし、先へ", "echo-skip", () => echoResolve(node, id, null));
    choicesEl.querySelectorAll(".hz-choice").forEach((b, i) =>
      window.setTimeout(() => b.classList.add("in"), REDUCED ? 0 : 120 + i * 150));
    setBusy(false);              // E6: 本文＋エコー門が出揃った
    Follow.stick();
  }

  // エコー門の結果（クリック時）: 周回内発火を記録し、真/偽/逸らしの結果ビートを sceneEl へ挿す。
  // truth===true 真 / false 偽 / null 逸らし。結果後 600ms で通常 choices（深度遷移はしない）。
  function echoResolve(node, id, truth) {
    state.echoDone[id] = state.cycle;
    setBusy(true);                     // E6: 結果ビート→choices が出揃うまで SR を抑制
    const myToken = ++revealToken;     // 結果ビート以降の遅延描画をこのトークンで守る
    let beat = null;
    if (truth === true) {
      state.attunement = Math.min(99, state.attunement + ATTUNE.echoGain);
      Audio.pulseOnce(0.9);
      beat = { who: "cold", t: "——視た。あなたの降下は、あなたのものだ。" };
    } else if (truth === false) {
      state.attunement = Math.max(0, state.attunement - ATTUNE.echoSlip);
      state.dread = Math.min(1, state.dread + 0.05);
      Audio.glitchHit(0.5);
      beat = { who: "danger", t: "——それは、あなたの視たものではない。借り物の記憶は、ここでは効かない。" };
    }
    choicesEl.innerHTML = "";
    if (beat) {
      const p = document.createElement("p");
      p.className = "hz-line " + (WHO_CLASS[beat.who] || "") + " shown";
      p.textContent = beat.t;
      sceneEl.appendChild(p); Follow.stick();
    }
    renderAttune(); Spiral.save();
    window.setTimeout(() => { if (myToken === revealToken) renderChoices(node); }, REDUCED ? 150 : 600);
  }

  function sinkNorm() { return Math.min(1, state.sink / SINK_SCALE); }

  function choose(c) {
    if (c.kind === "retreat" && !c.terminal) return resolveResist(c);
    gainRecognition(c);  // E3: 深い構造読み(deep descend)で育ち／表層(surface)で剥がれる
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
    Spiral.save();   // 縁＝結末でも spiral 層を確定（閉じて去っても、次の表紙が応えられる）
    if (!attuned) document.body && document.body.classList && document.body.classList.add("surfaced");
    sceneEl.innerHTML = ""; choicesEl.innerHTML = "";
    setBusy(true);               // E6: 縁の結末文＋選択が出揃うまで SR を抑制
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
      card.textContent = `${head}  認識: ${Math.round(state.attunement || 0)}/${ATTUNE.omegaThreshold}${attuned ? "（合致）" : "（深く読み、視たものを覚えているほど降りられる）"} / 到達深度: ${"▮".repeat(lit)}${"▯".repeat(8 - lit)} / 残った戻り道: ${state.returnPaths}/${RETURN_PATHS_START} / 観測者: ${state.observer} / 抗った: ${state.resisted} ・ 戻れなかった: ${state.refused} / 周回: ${state.cycle}`;
      sceneEl.appendChild(card); card.classList.add("shown");
      const more = document.createElement("p");
      more.className = "hz-line"; more.style.cssText = "margin-top:0.6em;font-size:0.78rem;color:#6b7682;";
      more.textContent = attuned
        ? "観測OSは終わらない。再起動すれば、また零章から——だが、底は最後まで無い。"
        : "戻れた——それも、ひとつの結末だ。再起動すれば、また零章から潜れる。";
      sceneEl.appendChild(more); more.classList.add("shown");
      renderEdgeChoices(attuned);
      Follow.stick();
    }, delay + 400);
  }

  // 縁の選択（E1）: 二極どちらの結末でも、次は「記憶を抱えて沈み直す」か「すべて忘れる」かの二択。
  // 周回は restart でなく再降下で深まる＝spiral 層（周回/認識/痕跡）は、忘れない限り消えない。
  function renderEdgeChoices(attuned) {
    choicesEl.innerHTML = "";
    const mk = (kind, lead, sub, fn) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hz-choice " + kind;
      btn.innerHTML = `<span class="lead"></span><span class="sub"></span>`;
      btn.querySelector(".lead").textContent = lead;
      btn.querySelector(".sub").textContent = sub;
      btn.addEventListener("click", fn, { once: true });
      choicesEl.appendChild(btn);
      return btn;
    };
    mk("descend", "縁から、もう一度沈む",
      `視たものを抱えたまま、零章へ——周回が一つ深まる（${state.cycle + 1}）`, descendAgain);
    mk("retreat", "すべて忘れる",
      "周回・認識・痕跡を消す。次は、初めてになる", forgetAll);
    // 縁カード: 結末サマリを画像で外へ（share か PNG 保存）。物語の選択ではないので chip として小さく。
    const row = document.createElement("div");
    row.style.cssText = "display:flex;justify-content:center;padding:2px 0 4px;";
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "hz-chip";
    chip.textContent = "縁を画像で残す";
    chip.addEventListener("click", () => EdgeCard.share(attuned, chip));
    row.appendChild(chip);
    choicesEl.appendChild(row);
    choicesEl.querySelectorAll(".hz-choice").forEach((b, i) =>
      window.setTimeout(() => b.classList.add("in"), REDUCED ? 0 : 200 + i * 160));
    setBusy(false);              // E6: 縁が出揃った
    Follow.stick();
  }

  // 再降下: transient（沈下/圧/戻り道/観測者/抗い）は新しく、spiral 層は保つ。
  // steps を保つ＝renderNode(zero) が周回を一つ深める（in-session の reborn→zero と同じ経路）。
  function descendAgain() {
    revealToken++;
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START;
    state.maxSink = 0; state.observer = 1; state.resisted = 0; state.refused = 0;
    state.resistBeat = null; state.rank = 0; state.rejoin = null; state.echoDone = {};
    lastPhase = "surface";   // A4: 再降下のたびに最初の深い跨ぎがまた句読点を打てる
    // E6(監査): phase-break 由来の glitch-hard/leak-on が縁で発火したまま残り、再降下直後の零章に
    // 焼き付くのを断つ（burst の clearBurst タイマーは revealToken と無関係に走るため明示除去）。
    document.body.classList.remove("surfaced", "phase-break", "glitch-hard", "glitch-soft", "leak-on");
    buildReturnPaths();
    renderNode(DATA.start || "zero");
  }

  function forgetAll() { Spiral.wipe(); restart(); }

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
      master.gain.setTargetAtTime(0.26, ctx.currentTime + 0.05, 0.8);
      master.connect(ctx.destination);
      filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 1700; filter.Q.value = 0.8;
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
      const base = 116 - s * 40;                         // 沈むほど低く（116→76Hz）。端末スピーカーで可聴な音域へ底上げ
      const cutoff = 1900 - s * 1000 - d * 250;          // 沈むほど暗く（深さ＋圧で翳る）。中倍音が通るよう上げる
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
      filter.frequency.setTargetAtTime(Math.max(280, cutoff), t, slow);
      master.gain.setTargetAtTime(0.24 + d * 0.06, t, 0.8);
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
      osc.type = "sine"; osc.frequency.value = 98 - cur.depth * 30;
      osc.frequency.setTargetAtTime((98 - cur.depth * 30) * 0.72, t, 0.18); // 鼓動の沈み込み（可聴域へ底上げ）
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.06 * amp + cur.dread * 0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(g); g.connect(filter); osc.start(t); osc.stop(t + 0.6); // 鼓動も残響を通す
      // 仕上げ: 選択時(amp>=0.8)だけ、やわらかい音色を一音添える＝可聴で音楽的なアクセント。
      // 鼓動(自動 beat=0.5)には付けない＝うるさくしない。沈むほど低い音度＋短い余韻。
      if (amp >= 0.8) {
        const scale = [0, 3, 7, 10, 12];                          // 短調寄りの度数
        const deg = scale[Math.min(scale.length - 1, Math.floor(cur.depth * scale.length))];
        const f = (176 - cur.depth * 42) * Math.pow(2, deg / 12); // 中域＝端末スピーカーで明瞭
        const o2 = ctx.createOscillator(), g2 = ctx.createGain();
        o2.type = "triangle"; o2.frequency.value = f;
        g2.gain.value = 0.0001;
        g2.gain.exponentialRampToValueAtTime(0.055, t + 0.03);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        o2.connect(g2); g2.connect(filter); o2.start(t); o2.stop(t + 1.0);
      }
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
    // --- ヘルパー：砂紋（水平の掻き目）。rows 本・amp 振幅。深いほど波打ち・行ずれ（datamosh）。
    // mosh は全モード共通の破壊＝一部の行を横へごっそりずらすデータモッシュの帯（mode に依らない）。
    // rng/R は draw() が作った同一 PRNG（消費順は構図互換不要＝mode で変わってよい）。
    function sandRows(rng, R, s, d, bright, mosh, rows, ampMul) {
      const amp = H * 0.013 * (1 + s) * ampMul;
      const step = Math.max(8, Math.floor(12 * dpr));
      for (let i = 0; i < rows; i++) {
        const y = H * (i + 0.5) / rows;
        const a = (0.05 + s * 0.15) * bright;
        g.strokeStyle = "hsla(216," + (28 + s * 30).toFixed(0) + "%," + (46 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.lineWidth = Math.max(1, dpr * 0.8);
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
    }

    // --- ヘルパー：石組（砂紋が石の周りで同心円に巻く渦＋角張った幾何のワイヤー）。count 個。
    // ringMul で環の大きさを変える（mode 1 の石組群は大きめ）。
    function stoneCluster(rng, R, s, d, bright, count, ringMul) {
      const minWH = Math.min(W, H);
      for (let n = 0; n < count; n++) {
        const cx = W * (0.14 + R(0.72)), cy = H * (0.16 + R(0.66));
        const rings = 4 + Math.floor(R(4));
        for (let r = 1; r <= rings; r++) {
          const rr = r * (minWH * 0.022) * (1 + s * 0.5) * ringMul;
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
    }

    // --- ヘルパー：市松苔（東福寺 北庭の象徴）。patches パッチ・glitchRate で崩落率を変える。
    // mode 2(市松崩落)は glitchRate↑＝反転(シアン)へ飛ぶセルが増える。mosh は全モード共通の破壊。
    function checkerPatch(rng, R, s, bright, mosh, patches, glitchRate) {
      const minWH = Math.min(W, H);
      const cols = 6, rowsC = 5, cell = minWH * 0.058 * (1 + s * 0.3);
      for (let p = 0; p < patches; p++) {
        const ox = W * (0.04 + R(0.40)), oy = H * (0.50 + R(0.32));
        for (let yy = 0; yy < rowsC; yy++) for (let xx = 0; xx < cols; xx++) {
          if ((xx + yy) % 2) continue;                     // 市松＝一つ飛ばし
          const fade = 1 - (yy / rowsC) * 0.7;
          let gx = ox + xx * cell, gy = oy + yy * cell;
          const glitched = rng() < (mosh * 0.4 + glitchRate);
          if (glitched) gx += (R(2) - 1) * cell * 0.5 * mosh;
          const a = (0.10 + s * 0.20) * fade * bright;
          g.fillStyle = glitched
            ? "hsla(170,70%,60%," + (a * 0.9).toFixed(3) + ")"   // 反転バグ＝シアンへ飛ぶ
            : "hsla(300," + (34 + s * 26).toFixed(0) + "%," + (30 + s * 16).toFixed(0) + "%," + a.toFixed(3) + ")";
          g.fillRect(gx, gy, cell * 0.92, cell * 0.92);
        }
      }
    }

    // --- ヘルパー：渦中心（mode 3）。水平でなく seed 中心の同心円/渦の掻き目。
    // 半径段々(rings)×40分割の閉路で「砂を渦に掻く」。行数×ステップは砂紋(≈30行×W/step)と同程度
    // に収める（rings≈32 × 40 ≈ 1280 点）＝描画コストは既存砂紋と同オーダー。mosh で一部の弧を欠く。
    function vortexScratch(rng, R, s, d, bright, mosh) {
      const minWH = Math.min(W, H);
      const cx = W * (0.30 + R(0.40)), cy = H * (0.28 + R(0.44));  // 渦の中心（seed で動く）
      const rings = 32, maxR = minWH * (0.46 + s * 0.2);
      const twist = (0.6 + R(0.8)) * (1 + s);                       // 渦の捻り（深いほど強い）
      for (let r = 1; r <= rings; r++) {
        const f = r / rings;
        const rr = maxR * f;
        const a = (0.05 + s * 0.16) * bright * (0.6 + 0.4 * (1 - f));
        g.strokeStyle = "hsla(214," + (30 + s * 28).toFixed(0) + "%," + (48 + s * 14).toFixed(0) + "%," + a.toFixed(3) + ")";
        g.lineWidth = Math.max(1, dpr * 0.8);
        // mosh：一部の環を弧（開いた掻き目）にして渦を破る＝同心円が崩れる datamosh
        const broken = rng() < mosh * 0.4;
        const a0 = broken ? R(Math.PI) : 0;
        const a1 = broken ? a0 + Math.PI * (1.1 + R(0.7)) : Math.PI * 2;
        g.beginPath();
        for (let k = 0; k <= 40; k++) {
          const t = a0 + (a1 - a0) * (k / 40);
          const ang = t + twist * f * Math.PI;                     // 半径で角がずれる＝渦
          const wob = 1 + Math.sin(ang * 4 + r) * 0.05 * (1 + d);
          const x = cx + Math.cos(ang) * rr * wob, y = cy + Math.sin(ang) * rr * wob;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      stoneCluster(rng, R, s, d, bright, 2 + Math.floor(R(2)), 0.9);  // 石 2〜3 を渦上に
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
      const mosh = s * 0.6 + d * 0.4;      // バグの強度：行ずらし／反転セル（全モード共通の破壊）
      g.lineCap = "round";

      // A3: seed からモードを最初に決める（rng の最初の消費＝同じ seed は同じ構図モード）。
      // 0=砂紋主体 / 1=石組群 / 2=市松崩落 / 3=渦中心。深度による破壊(mosh)は全モード共通で継続。
      const mode = Math.floor(rng() * 4);
      if (mode === 0) {            // 砂紋主体：砂紋 30〜34行・振幅↑・石 0〜1・市松なし
        sandRows(rng, R, s, d, bright, mosh, 30 + Math.floor(R(5)), 1.35);
        stoneCluster(rng, R, s, d, bright, Math.floor(R(1.6)), 1.0);
      } else if (mode === 1) {    // 石組群：砂紋 10〜12行（薄く）・石 5〜7（環大きめ）・市松 0〜1
        sandRows(rng, R, s, d, bright, mosh, 10 + Math.floor(R(3)), 0.85);
        stoneCluster(rng, R, s, d, bright, 5 + Math.floor(R(3)), 1.5);
        checkerPatch(rng, R, s, bright, mosh, Math.floor(R(1.6)), 0);
      } else if (mode === 2) {    // 市松崩落：砂紋 12〜14行・石 1〜2・市松パッチ 2〜3（glitched↑）
        sandRows(rng, R, s, d, bright, mosh, 12 + Math.floor(R(3)), 1.0);
        stoneCluster(rng, R, s, d, bright, 1 + Math.floor(R(2)), 1.0);
        checkerPatch(rng, R, s, bright, mosh, 2 + Math.floor(R(2)), 0.28);
      } else {                    // 渦中心：同心円/渦の掻き目（seed 中心）・石 2〜3 を渦上に・市松なし
        vortexScratch(rng, R, s, d, bright, mosh);
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
    // A4 句読点用：確定で hard バースト＋原色 leak を一拍点ける（ランダム抽選を経ない）。
    // 既存の glitch-hard / leak-on / --leak-rgb 機構をそのまま借りる＝視覚と leak が同調。
    // reduced は no-op（呼び出し元 firePhaseBreak も REDUCED で早期 return するが、二重に守る）。
    function hardBreak() {
      if (REDUCED) return;
      document.body.classList.add("glitch-hard");
      const dur = 240;
      root.setProperty("--leak-rgb", LEAK[Math.floor(Math.random() * LEAK.length)]);
      document.body.classList.add("leak-on");
      clearTimeout(leakTimer);
      leakTimer = window.setTimeout(() => document.body.classList.remove("leak-on"), Math.round(dur * 0.8));
      window.setTimeout(clearBurst, dur);
    }
    return { start, hardBreak, update: (d, dr) => { depth = clamp01(d); dread = clamp01(dr); setGi(); } };
  })();

  // ---------- 塗装剥がれ／めくれ遷移（各遷移で層が一枚めくれて降りる） ----------
  // B2: keyframes から clip-path を外し（transform/opacity のみ）、ぎざ縁の polygon は遷移ごとに
  // ここで 3 種から 1 つ選んで inline で与える＝毎回同じ縁でなくなる（演出のみ・Math.random で可）。
  // 持続も 0.55〜0.7s で揺らす。reduced は従来どおり無効（play 冒頭で return）。
  const Peel = (() => {
    const el = document.querySelector(".hz-peel");
    let t = 0;
    const EDGES = [
      "polygon(0 0,8% 4%,20% 0,34% 5%,50% 1%,66% 6%,80% 1%,92% 5%,100% 0,100% 100%,0 100%)",
      "polygon(0 0,12% 6%,24% 1%,40% 7%,52% 2%,70% 8%,84% 3%,95% 7%,100% 1%,100% 100%,0 100%)",
      "polygon(0 0,6% 3%,16% 7%,30% 2%,46% 6%,60% 1%,76% 5%,88% 2%,100% 5%,100% 100%,0 100%)"
    ];
    function play() {
      if (REDUCED || !el) return;
      const dur = 0.55 + Math.random() * 0.15;     // 0.55〜0.70s で揺らす
      el.style.clipPath = EDGES[Math.floor(Math.random() * EDGES.length)];
      el.style.animationDuration = dur.toFixed(3) + "s";
      document.body.classList.remove("peeling");
      void document.body.offsetWidth;        // リフロー強制＝アニメ再起動
      document.body.classList.add("peeling");
      clearTimeout(t);
      t = window.setTimeout(() => document.body.classList.remove("peeling"), Math.round(dur * 1000) + 60);
    }
    return { play };
  })();

  // ---------- 縁カード（E1: 結末サマリの画像化・共有） ----------
  // 縁の結果（二極・認識・到達深度・周回）を 1080×1350 の canvas に決定論で描く
  // （worldSeed＝同じ縁は同じカード）。Web Share が files を受ける環境では share sheet、
  // それ以外は PNG 保存。外部送信はしない＝外へ出すかどうかは常にユーザーの手。
  // 載せるのは集計値のみ（本文・raw テキストは載せない）。
  const EdgeCard = (() => {
    const W = 1080, H = 1350;
    const FONT = '"Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif';
    function draw(attuned) {
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const g = cv.getContext("2d");
      const rng = mulberry32((worldSeed() ^ 0x5f356495) >>> 0);
      // 地：奈落のドーム（.hz-bg の簡約）
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0a131d"); bg.addColorStop(0.5, "#04060b"); bg.addColorStop(1, "#010206");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // 砂紋（反転ガーデンの掻き目。バグの帯も一部の行に）
      const s = clamp01(state.maxSink || 0.4);
      for (let i = 0; i < 20; i++) {
        const y = H * (i + 0.5) / 20;
        g.strokeStyle = `hsla(216,${Math.round(30 + s * 24)}%,${Math.round(44 + s * 14)}%,${(0.05 + rng() * 0.07).toFixed(3)})`;
        g.lineWidth = 2;
        const band = rng() < 0.25 ? (rng() * 2 - 1) * W * 0.1 : 0;
        const freq = 2 + (i % 3);
        g.beginPath();
        for (let x = 0; x <= W; x += 24) {
          const yy = y + Math.sin((x / W) * Math.PI * 2 * freq + i) * 16;
          const xx = x + (x > W * 0.5 ? band : 0);
          x === 0 ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        g.stroke();
      }
      // 曼荼羅（八観の環。中心＝核は描かない）
      const cx = W / 2, cy = H * 0.32, R = W * 0.30, voidR = R * 0.26;
      g.globalCompositeOperation = "lighter";
      for (let i = 0; i < 6; i++) {
        const rr = voidR + (R - voidR) * (i / 5);
        g.beginPath();
        for (let k = 0; k <= 8; k++) {
          const ang = i * 0.25 + (k / 8) * Math.PI * 2;
          const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.lineWidth = 1.6;
        g.strokeStyle = `rgba(127,182,196,${(0.10 + i * 0.022).toFixed(3)})`;
        g.stroke();
      }
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(cx, cy, 0, cx, cy, voidR);
      vg.addColorStop(0, "rgba(0,0,0,1)"); vg.addColorStop(1, "rgba(2,4,10,0)");
      g.fillStyle = vg; g.beginPath(); g.arc(cx, cy, voidR, 0, Math.PI * 2); g.fill();
      // タイトル（RGBずれ＝グリッジの刷り重ね）
      g.textAlign = "center";
      g.font = `800 64px ${FONT}`;
      g.fillStyle = "rgba(216,68,46,0.4)"; g.fillText("Hazama 狭間", cx - 4, 150);
      g.fillStyle = "rgba(10,186,181,0.4)"; g.fillText("Hazama 狭間", cx + 4, 150);
      g.fillStyle = "#ece6d6"; g.fillText("Hazama 狭間", cx, 150);
      // 結末（二極）＋手の下線（生の差し色）
      const headY = H * 0.56;
      g.font = `700 72px ${FONT}`;
      g.fillStyle = attuned ? "#7fb6c4" : "#aab4bf";
      g.fillText(attuned ? "深度Ω 到達" : "浮上 — 表層へ帰る", cx, headY);
      g.strokeStyle = "rgba(216,68,46,0.7)"; g.lineWidth = 5; g.beginPath();
      g.moveTo(cx - 280, headY + 34);
      g.quadraticCurveTo(cx, headY + 22, cx + 280, headY + 30);
      g.stroke();
      g.font = `400 34px ${FONT}`;
      g.fillStyle = "#6b7682";
      g.fillText(attuned ? "外殻踏破——底は、最後まで無い" : "視たものを、抱えたまま", cx, headY + 92);
      // 計器（縁の結果カードと同じ集計値）
      const need = ATTUNE.omegaThreshold;
      const lit = Math.min(Math.round(state.attunement || 0), need);
      const depthLit = Math.max(0, Math.min(8, Math.round((state.maxSink || 0) * 8)));
      const rows = [
        ["認識", "◆".repeat(lit) + "◇".repeat(need - lit) + (attuned ? "　合致" : "")],
        ["到達深度", "▮".repeat(depthLit) + "▯".repeat(8 - depthLit)],
        ["戻り道", `${state.returnPaths}/${RETURN_PATHS_START}　　観測者 ${state.observer}　　周回 ${state.cycle}`],
        ["", `抗った ${state.resisted}　・　戻れなかった ${state.refused}`]
      ];
      let y = H * 0.70;
      for (const [k, v] of rows) {
        if (k) { g.font = `400 30px ${FONT}`; g.fillStyle = "#3a424c"; g.textAlign = "right"; g.fillText(k, cx - 180, y); }
        g.font = `500 38px ${FONT}`;
        g.fillStyle = (k === "認識" && attuned) ? "#7fb6c4" : "#c8d2dc";
        g.textAlign = "left";
        g.fillText(v, cx - 150, y);
        y += 78;
      }
      g.textAlign = "center";
      g.font = `400 28px ${FONT}`; g.fillStyle = "#3a424c";
      g.fillText("quietbriony.github.io/hazama", cx, H - 70);
      return cv;
    }
    async function share(attuned, chip) {
      const cv = draw(attuned);
      const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], `hazama-edge-c${state.cycle}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Hazama 狭間" }); return; }
        catch (e) { if (e && e.name === "AbortError") return; }   // キャンセルは保存に落とさない
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      if (chip) { chip.textContent = "残した"; window.setTimeout(() => { chip.textContent = "縁を画像で残す"; }, 2000); }
    }
    return { share, draw };
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
    const res = await fetch("depths-shell.json?v=e7", { cache: "no-store" });
    DATA = await res.json();
  }
  // ---------- 動く表紙（R6：タイトルも state/seed に応じて動く・静止でない） ----------
  // ゲート表示中、背後に反転ガーデンを薄く宿し（gate 背景は半透明）、グリッジが時折タイトルを裂き、
  // 原色が隙間から明滅する。構図は per-load の seed で毎回ちがい、ゆっくり別構図へ再生成＝生きた庭。
  // enter すると同じ深度信号（applyAtmosphere）へ引き継がれ、降下とともに深まる。
  let titleTimer = 0, titleSeed = 1;
  function titleAmbient(returning) {
    Garden.start();
    Glitch.update(0.42, 0.16);       // 表紙の浅め深度：グリッジ頻度・--gi・原色 leak 強度の基準
    Glitch.start();                  // reduced は no-op（CSS が薄い静止フリンジ＝それでも"動かない表紙"でない）
    // E1: 戻ってきた観測者の表紙は乱数でなく履歴（worldSeed）から＝庭が「前回の続き」から組まれる。
    titleSeed = returning ? ((worldSeed() >>> 0) || 1)
      : ((Math.floor((Math.random() || 0.5) * 0x7fffffff)) >>> 0 || 1);
    Garden.update(0.5, 0.18, titleSeed);
    if (REDUCED) return;
    titleTimer = window.setInterval(() => {
      if (document.hidden) return;     // E6(監査): タブ非表示中は再描画しない（Mandala/Glitch と同じ規律）
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
    // E6(監査): enter 後はゲートボタンをタブ順から外す（不可視 opacity:0 のまま残ると
    // キーボードの Tab が最初の選択肢でなく見えないボタンへ着地し、focus が迷子になる）。
    const geBtn = $("gate-enter"); if (geBtn) geBtn.disabled = true;
    Spiral.consumeCycleBump();       // 前セッションで降下していた時だけ、ここで周回が一つ深まる
    applyCycleSkin();                // B4: consume 後の cycle で表紙スキンを取り直す
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
    state.id = null; state.sink = 0; state.dread = 0; state.returnPaths = RETURN_PATHS_START; state.maxSink = 0; state.observer = 1; state.steps = 0; state.belowLoop = 0; state.resisted = 0; state.refused = 0; state.resistBeat = null; state.rank = 0; state.cycle = 0; state.visits = {}; state.rejoin = null; state.attunement = 0; state.echoDone = {}; state.legacy = freshLegacy();
    lastPhase = "surface";   // A4: restart/forget でも跨ぎ検知を初期化（再降下で最初の跨ぎが効く）
    applyCycleSkin();        // B4: cycle=0 に戻ったので表紙スキンも 0（完全に従来どおり）へ
    if (document.body && document.body.classList) document.body.classList.remove("surfaced", "phase-break", "glitch-hard", "glitch-soft", "leak-on");
    const st = $("status"); if (st) st.textContent = "";
    buildReturnPaths();
    renderNode(DATA.start || "zero");
  }

  $("audio-toggle").addEventListener("click", () => Music.cycle());

  // 開発用フック（プレビュー検証専用）: 任意ノードへ跳ぶ／状態を読む／縁・カードを直接出す。
  // garden(depth, dread, seed): A3 構図モード検証用＝seed を変えて #garden を直接描き直す。
  window.__hz = { go: renderNode, choose, state, isAttuned, edge: renderEdge, card: (a) => EdgeCard.draw(a == null ? isAttuned() : !!a), garden: (depth, dread, seed) => Garden.update(depth, dread, seed), get sink() { return sinkNorm(); }, get attunement() { return state.attunement; } };

  // R4: PWA — slice をインストール/オフライン対応に。サブパス /hazama/slice/ スコープ（相対 sw.js）。
  function registerSlicePWA() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        if (typeof reg.update === "function") reg.update().catch(() => {});
      }).catch((err) => console.warn("[Hazama slice] SW register failed:", err));
    });
  }
  registerSlicePWA();

  loadData().then(() => {
    const gb = $("gate-enter");
    gb.disabled = false;
    // E1: 記憶（spiral 層）を読む。戻ってきた観測者には表紙が応える＝庭は前回の続きから組まれ、
    // 入口の言葉が変わる。周回の加算は enter（「沈む」の実タップ）まで保留。
    const returning = Spiral.load();
    applyCycleSkin();          // B4: 読み込んだ周回で表紙スキン(--cycle-hue/pan)を立てる（cycle=0 は従来どおり）
    if (returning) {
      const sub = document.querySelector(".hz-gate-sub");
      if (sub) sub.innerHTML = "また、来た。<br>入口は、前より一段、深い。";
    }
    titleAmbient(returning);   // 表紙を動かす（反転ガーデン＋グリッジ＋原色 leak をゲート背後で薄く生かす）
    // 「沈む」の実タップ＝同一document の手勢。この中で enter()→Audio.start()→resume() が走る
    // ＝モバイルで AudioContext を堅牢に解禁できる（cross-document iframe・全画面オーバーレイは廃止）。
    gb.addEventListener("click", enter, { once: false });
  }).catch((e) => {
    $("scene").textContent = "深度データの読み込みに失敗しました。再読み込みしてください。";
    console.warn("[Hazama slice] load failed:", e);
  });
})();
