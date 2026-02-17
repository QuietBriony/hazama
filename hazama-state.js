(function () {
  const KEY = "hazama_progress";

  function saveProgress(nodeId, seed) {
    const payload = {
      nodeId,
      seed,
      lastVisitedAt: Date.now()
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.nodeId !== "string") return null;
      return data;
    } catch (_error) {
      return null;
    }
  }

  function clearProgress() {
    localStorage.removeItem(KEY);
  }

  window.HazamaState = {
    saveProgress,
    loadProgress,
    clearProgress
  };
})();
