// Rebuild the campaign summary on a new device from the account's saved runs.
// hm_runs is append-only; merge keeps the best result while preserving fields
// that are still local-only (labels, expedition bonuses, etc.).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HMProgressSync = api;
})(globalThis, function () {
  function cloneProgress(value) {
    let progress = value;
    if (typeof value === 'string') {
      try { progress = JSON.parse(value); } catch { progress = null; }
    }
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = {};
    progress = JSON.parse(JSON.stringify(progress));
    if (!progress.levels || typeof progress.levels !== 'object' || Array.isArray(progress.levels)) progress.levels = {};
    if (!progress.labels || typeof progress.labels !== 'object' || Array.isArray(progress.labels)) progress.labels = {};
    return progress;
  }

  async function hydrateProgress(fetchPage, localProgress) {
    const progress = cloneProgress(localProgress);
    const before = JSON.stringify(progress);
    let page = 1;
    let totalPages = 1;
    do {
      const response = await fetchPage(page, 500);
      const records = response && Array.isArray(response.items) ? response.items : [];
      totalPages = Math.max(1, Number(response && response.totalPages) || 1);
      for (const run of records) {
        const level = Number(run.level);
        if (!Number.isInteger(level) || level < 1 || run.won !== true) continue;
        const key = String(level);
        const current = progress.levels[key] && typeof progress.levels[key] === 'object'
          ? progress.levels[key] : {};
        const stars = Number(run.stars) || 0;
        const time = Number(run.time) || 0;
        const score = Number(run.score) || 0;
        if (stars > (Number(current.stars) || 0)) current.stars = stars;
        if (stars > 0 && time > 0 && (!(Number(current.best) > 0) || time < Number(current.best))) current.best = time;
        if (score > (Number(current.score) || 0)) current.score = score;
        progress.levels[key] = current;
      }
      if (records.length === 0) break;
      page++;
    } while (page <= totalPages);

    return { progress, changed: JSON.stringify(progress) !== before };
  }

  return { hydrateProgress };
});
