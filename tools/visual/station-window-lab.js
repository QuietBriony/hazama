/* Tools-only visual study. It never reads or writes Hazama's spiral save. */
(() => {
  const app = document.getElementById("experience");
  const kicker = document.getElementById("scene-kicker");
  const title = document.getElementById("scene-title");
  const line = document.getElementById("scene-line");
  const choices = document.getElementById("choices");
  const motionToggle = document.getElementById("motion-toggle");

  const scenes = {
    arrival: {
      kicker: "01 / 初めての窓",
      title: "間の駅",
      line: "終電の記録だけが残る駅。扉のガラスに、雨の線が二重に落ちている。待合室には誰もいない。",
      choices: [
        { text: "窓の奥を確かめる", sub: "見えた線を、覚える", next: "observed" },
        { text: "視線を外す", sub: "見なかったものを、残す", next: "averted" }
      ]
    },
    observed: {
      kicker: "02 / 見た",
      title: "遅れて映る",
      line: "待合室の明かりに、人影が一拍遅れて現れる。窓枠の一本は、景色の下地にまで続いていた。",
      choices: [
        { text: "一歩退き、同じ窓へ戻る", sub: "見たものが残るか、確かめる", next: "return-observed" },
        { text: "最初から見直す", sub: "別の選択を試す", next: "arrival" }
      ]
    },
    averted: {
      kicker: "02 / 見なかった",
      title: "内側の曇り",
      line: "視線を落とした。雨は止まらない。誰もいないはずの窓で、ガラスの内側だけが曇る。",
      choices: [
        { text: "同じ窓へ戻る", sub: "見なかったものが残るか、確かめる", next: "return-averted" },
        { text: "最初から見直す", sub: "別の選択を試す", next: "arrival" }
      ]
    },
    "return-observed": {
      kicker: "03 / 再訪 · 見たあと",
      title: "影はこちら側に",
      line: "駅舎は同じで、待合室は空だ。代わりに扉のこちら側へ、あなたと同じ形の影が移っている。視た継ぎ目は閉じない。",
      choices: [
        { text: "もう一度、最初の窓へ", sub: "視線を外した場合も試せる", next: "arrival" }
      ]
    },
    "return-averted": {
      kicker: "03 / 再訪 · 見なかったあと",
      title: "向こうは覚えていた",
      line: "駅舎は同じで、待合室の窓に今度は人影がいる。見なかったはずのあなたの位置を、向こうは覚えていた。",
      choices: [
        { text: "もう一度、最初の窓へ", sub: "窓を確かめた場合も試せる", next: "arrival" }
      ]
    }
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionTouched = false;
  let glitchTimer = 0;

  function setMotion(enabled) {
    app.dataset.motion = enabled ? "on" : "off";
    motionToggle.textContent = enabled ? "動きを止める" : "動きを戻す";
    if (!enabled) {
      window.clearTimeout(glitchTimer);
      app.classList.remove("glitching");
    }
  }

  function render(sceneId, focus) {
    const scene = scenes[sceneId];
    if (!scene) return;
    app.dataset.scene = sceneId;
    kicker.textContent = scene.kicker;
    title.textContent = scene.title;
    line.textContent = scene.line;
    choices.replaceChildren();

    for (const choice of scene.choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.next = choice.next;
      button.append(document.createTextNode(choice.text));
      const sub = document.createElement("span");
      sub.textContent = choice.sub;
      button.appendChild(sub);
      choices.appendChild(button);
    }

    window.clearTimeout(glitchTimer);
    app.classList.remove("glitching");
    if (focus && app.dataset.motion === "on" && sceneId !== "arrival") {
      // Reflow lets each decision produce one finite tear, never a looping effect.
      void app.offsetWidth;
      app.classList.add("glitching");
      glitchTimer = window.setTimeout(() => app.classList.remove("glitching"), 700);
    }
    if (focus) title.focus({ preventScroll: true });
  }

  choices.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-next]");
    if (button && choices.contains(button)) render(button.dataset.next, true);
  });
  motionToggle.addEventListener("click", () => {
    motionTouched = true;
    setMotion(app.dataset.motion !== "on");
  });
  reducedMotion.addEventListener("change", () => {
    if (!motionTouched) setMotion(!reducedMotion.matches);
  });
  document.addEventListener("visibilitychange", () => {
    app.dataset.hidden = document.hidden ? "yes" : "no";
  });
  window.addEventListener("pagehide", () => window.clearTimeout(glitchTimer));

  setMotion(!reducedMotion.matches);
  render("arrival", false);
})();
