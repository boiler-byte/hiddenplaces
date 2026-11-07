/** Pure geographic helpers, in degrees and kilometers. */
const DEG = Math.PI / 180;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const norm = angle => ((angle % 360) + 360) % 360;
export const delta = (a, b) => ((a - b + 540) % 360) - 180;
export const toRad = angle => angle * DEG;
export const radToDeg = value => value / DEG;

export function distanceKm(a, b) {
  const lat = toRad(b.lat - a.lat);
  const lon = toRad(b.lon - a.lon);
  const h = Math.sin(lat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(lon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function bearingTo(a, b) {
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat), dLon = toRad(b.lon - a.lon);
  return norm(radToDeg(Math.atan2(
    Math.sin(dLon) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  )));
}

export function displayDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`;
}
export const cardinal = angle => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(norm(angle) / 45) % 8];
