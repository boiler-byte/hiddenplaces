/** OpenStreetMap Overpass adapter. Network requests are never stored by the service worker. */
import { OVERPASS_ENDPOINTS } from '../config.js';
import { getCachedPlaces, cachePlaces } from '../utils/storage.js';

function categoryOf(tags) {
  if (tags.natural || tags.leisure === 'nature_reserve') return 'nature';
  if (tags.tourism === 'viewpoint' || ['tower', 'lighthouse'].includes(tags.man_made)) return 'view';
  if (tags.historic) return 'history';
  return 'culture';
}

export function parseOverpass(elements) {
  const parsed = [], dedupe = new Set();
  for (const element of elements) {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const name = tags['name:de'] || tags.name || '';
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const canonical = name.toLocaleLowerCase('de').trim();
    if (dedupe.has(canonical)) continue;
    dedupe.add(canonical);
    let description = tags['description:de'] || tags.description || '';
    if (description.length > 200) description = description.slice(0, 197) + '…';
    parsed.push({
      id: `osm-${element.type}-${element.id}`, name, lat, lon,
      category: categoryOf(tags), description
    });
  }
  return parsed;
}

export function buildOverpassQuery({lat, lon}) {
  const l = lat.toFixed(5), g = lon.toFixed(5), near = `(around:15000,${l},${g})`;
  return `[out:json][timeout:25];(nwr${near}[name][historic~"castle|ruins|archaeological_site|city_gate|fort|monument|memorial|tomb|wayside_shrine"];nwr${near}[name][tourism~"viewpoint|attraction|museum|gallery|artwork"];nwr${near}[name][natural~"peak|cave_entrance|rock|cliff|spring|waterfall"];nwr${near}[name][man_made~"tower|lighthouse|windmill"];nwr${near}[name][leisure="nature_reserve"];);out center 600;`;
}

export async function fetchNearbyPlaces(coords, {signal, fetcher = fetch, endpoints = OVERPASS_ENDPOINTS} = {}) {
  const cached = getCachedPlaces(coords);
  if (cached) return cached;
  const query = buildOverpassQuery(coords);
  let lastError;
  for (const endpoint of endpoints) {
    if (signal?.aborted) throw new DOMException('Abgebrochen', 'AbortError');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28_000);
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, {once: true});
    try {
      const response = await fetcher(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
        body: new URLSearchParams({data: query}),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Server antwortet mit HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.elements)) throw new Error('Ungültige Serverantwort');
      const points = parseOverpass(data.elements);
      cachePlaces(coords, points);
      return points;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
  throw lastError || new Error('Keine Verbindung zum Ortsdienst');
}
