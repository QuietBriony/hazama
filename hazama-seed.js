(function () {
  const KEY = "hazama_seed";

  function hashText(input) {
    let h = 2166136261;
    const text = String(input || "");
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  function randomSeed() {
    const partA = Math.random().toString(16).slice(2, 10);
    const partB = Date.now().toString(16).slice(-8);
    return hashText(`${partA}-${partB}`);
  }

  async function ensureSeed() {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const answer = window.prompt("位相の種を1文だけ入力してください（空欄なら自動生成）", "");
    const trimmed = (answer || "").trim();
    const seed = trimmed ? hashText(trimmed) : randomSeed();
    localStorage.setItem(KEY, seed);
    return seed;
  }

  function clearSeed() {
    localStorage.removeItem(KEY);
  }

  window.HazamaSeed = {
    ensureSeed,
    clearSeed,
    hashText
  };
})();
