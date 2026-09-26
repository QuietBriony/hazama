import { MODES, SCENES } from "./scene-score.mjs?v=scene-20260923-1";
import { SceneAudioSession } from "./scene-response-audio.mjs?v=scene-20260923-1";

export function setupSceneLab(doc, host) {
  const session = new SceneAudioSession(host, doc);
  const byId = (id) => doc.getElementById(id);
  let mode = "d", index = 0, complete = false;
  const modes = [...doc.querySelectorAll("[data-mode]")];
  const status = (text) => { byId("status").textContent = text; };

  function syncAudio() {
    const active = session.running || session.pending;
    byId("play-toggle").textContent = active ? (session.pending ? "開始を取り消す" : "音を止める") : `${MODES[mode].label}で聴く`;
    byId("play-toggle").disabled = Boolean(session.closing);
    byId("play-toggle").setAttribute("aria-pressed", String(active));
    byId("next-scene").disabled = complete || session.pending;
  }

  function renderScene(focus = false) {
    const scene = SCENES[index];
    byId("scene-counter").textContent = `本文抜粋 · 深度${scene.node} · ${index + 1} / ${SCENES.length}`;
    byId("scene-title").textContent = scene.label;
    byId("scene-lines").replaceChildren(...scene.lines.map((line) => {
      const p = doc.createElement("p"); p.textContent = line; return p;
    }));
    byId("next-scene").textContent = scene.action;
    byId("next-scene").disabled = complete;
    byId("reflection").hidden = !complete;
    if (focus) {
      byId("scene-title").focus({ preventScroll: true });
      byId("scene-title").scrollIntoView({ block: "start" });
    }
  }

  function reset(focus = false) {
    void session.stop("最初の場面です。聴くボタンから開始してください。");
    index = 0; complete = false; renderScene(focus);
  }

  session.onChange = syncAudio;
  session.onStop = status;
  modes.forEach((button) => button.addEventListener("click", () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    reset();
    modes.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    byId("mode-description").textContent = MODES[mode].description;
    syncAudio();
  }));

  byId("play-toggle").addEventListener("click", async () => {
    if (session.running || session.pending) { await session.stop(); return; }
    if (session.closing) return;
    if (complete) { index = 0; complete = false; renderScene(true); }
    try {
      if (await session.start(mode, index)) {
        status(mode === "current" ? "E44の原型で試聴中 · 読み終えたら次の場面へ" : mode === "d"
          ? (session.current?.tier === "static" ? "統合で試聴中 · OS設定により持続音なし、操作への応答のみ" : "統合で試聴中 · 反応の後も沈む地の音が続きます")
          : "反応音で試聴中 · 数秒で静かになります。読み終えたら次へ");
        byId("scene-title").focus({ preventScroll: true });
        byId("scene-title").scrollIntoView({ block: "start" });
      }
    } catch (error) { status(`再生できません：${error.message}`); syncAudio(); }
  });
  byId("volume").addEventListener("input", () => {
    const value = Number(byId("volume").value);
    session.setVolume(value / 100);
    byId("volume-value").textContent = `${Math.round(session.volume * 100)}%`;
  });
  byId("next-scene").addEventListener("click", () => {
    if (complete) return;
    if (index === SCENES.length - 1) {
      complete = true; void session.stop("この案の試聴は終了。別の音でも比べてみてください。");
      renderScene();
      byId("reflection-title").focus();
      return;
    }
    index += 1; renderScene(true); session.applyScene(index);
  });
  byId("reset").addEventListener("click", () => reset(true));
  byId("compare-again").addEventListener("click", () => {
    byId("comparison-title").focus();
    byId("comparison-title").scrollIntoView({ block: "start" });
  });
  doc.addEventListener("visibilitychange", () => {
    if (doc.hidden && (session.context || session.pending)) void session.stop("画面を離れたため停止。再開はボタンから。");
  });
  host.addEventListener("pagehide", () => { void session.stop("ページを離れたため停止。再開はボタンから。"); });
  const reduced = host.matchMedia?.("(prefers-reduced-motion: reduce)");
  byId("reduced-notice").hidden = !reduced?.matches;
  byId("tier-note").textContent = reduced?.matches
    ? "動きを減らす設定：A・Dは本編と同じく持続音・自動鼓動なし。全案とも操作後の応答だけになり、Dの持続する沈みは比較できません。"
    : "A・Dは本編と同じく、タッチ端末では持続音の声数を減らします。B・Cはどの端末でも短い応答のみです。";
  reduced?.addEventListener?.("change", () => {
    void session.stop("OS設定が変わりました。再開はボタンから。");
    byId("reduced-notice").hidden = !reduced.matches;
    byId("tier-note").textContent = "OS設定の変更を検出しました。A・Dの持続音・自動鼓動は次の開始で設定を反映します。";
  });
  byId("mode-description").textContent = MODES[mode].description;
  renderScene(); syncAudio();
  return session;
}

if (typeof document !== "undefined" && typeof window !== "undefined") setupSceneLab(document, window);
