/** Optional local caches: application still works when storage is disabled. */
const SAVED_KEY = 'hiddenPlacesSaved'; // compatible with v1-v3 bookmarks
export function readBookmarks() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.filter(value => typeof value === 'string') : []);
  } catch { return new Set(); }
}
export function writeBookmarks(saved) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...saved])); } catch { /* storage unavailable */ }
}
export function getCachedPlaces(coords) {
  try {
    const key = `hp-cache:${coords.lat.toFixed(3)}:${coords.lon.toFixed(3)}`;
    const cached = JSON.parse(sessionStorage.getItem(key) || 'null');
    return cached && Date.now() - cached.time < 15 * 60_000 && Array.isArray(cached.points)
      ? cached.points : null;
  } catch { return null; }
}
export function cachePlaces(coords, points) {
  try {
    const key = `hp-cache:${coords.lat.toFixed(3)}:${coords.lon.toFixed(3)}`;
    sessionStorage.setItem(key, JSON.stringify({time: Date.now(), points}));
  } catch { /* storage unavailable */ }
}
