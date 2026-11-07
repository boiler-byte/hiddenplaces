/** Canvas-only radar; all math and hit testing is isolated here. */
import { filteredPlaces, store } from '../state.js';
import { clamp, delta, toRad } from '../utils/geo-math.js';
import { $ } from '../utils/dom.js';

const COLORS = {history: '#e8c593', nature: '#8deab6', view: '#a2d6ff', culture: '#e7b8f9'};

export function createRadar({onSelect}) {
  const targets = [[$('#radarCanvas'), false], [$('#radarBig'), true]];
  const hits = new Map();

  function draw(canvas, large) {
    const state = store.get();
    const logical = large ? 480 : 128;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, logical, logical);
    const center = logical / 2, radius = large ? 205 : 51, scale = radius / state.radius;
    context.strokeStyle = 'rgba(197,246,174,.23)';
    context.lineWidth = large ? 1.4 : .85;
    for (const fraction of [.33, .66, 1]) {
      context.beginPath(); context.arc(center, center, radius * fraction, 0, 2 * Math.PI); context.stroke();
    }
    context.beginPath();
    context.moveTo(center - radius, center); context.lineTo(center + radius, center);
    context.moveTo(center, center - radius); context.lineTo(center, center + radius); context.stroke();
    context.beginPath(); context.moveTo(center, center);
    context.arc(center, center, radius, -Math.PI / 2 - toRad(58), -Math.PI / 2 + toRad(58));
    context.closePath(); context.fillStyle = 'rgba(213,250,140,.055)'; context.fill();
    if (large) {
      context.fillStyle = '#cbeaba'; context.font = '800 13px sans-serif'; context.textAlign = 'center';
      context.fillText('VORNE', center, center - radius - 17);
      context.fillText(`${state.radius} KM`, center, center + radius + 30);
    }
    const currentHits = [];
    for (const point of filteredPlaces().slice().reverse()) {
      const angle = toRad(delta(point.bearing, state.heading)) - Math.PI / 2;
      const r = clamp(point.dist * scale, 0, radius);
      const x = center + Math.cos(angle) * r, y = center + Math.sin(angle) * r;
      context.beginPath();
      context.arc(x, y, point.id === state.selected ? (large ? 8 : 4.3) : (large ? 5 : 2.8), 0, 2 * Math.PI);
      context.fillStyle = point.id === state.selected ? '#ffffff' : COLORS[point.category] || '#e7b8f9';
      context.fill();
      if (point.id === state.selected) {
        context.strokeStyle = '#d5fa8c'; context.lineWidth = large ? 3 : 1.8; context.stroke();
      }
      currentHits.push({id: point.id, x, y});
    }
    context.fillStyle = '#d5fa8c'; context.beginPath();
    context.moveTo(center, center - (large ? 12 : 7));
    context.lineTo(center - (large ? 7 : 4), center + (large ? 8 : 5));
    context.lineTo(center + (large ? 7 : 4), center + (large ? 8 : 5));
    context.closePath(); context.fill();
    hits.set(canvas, currentHits);
  }

  function render() {
    for (const [canvas, large] of targets) draw(canvas, large);
    $('#radarRange').textContent = `${store.get().radius} KM`;
  }

  function handleClick(event, canvas, large) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const x = (event.clientX - rect.left) * canvas.width / rect.width;
    const y = (event.clientY - rect.top) * canvas.height / rect.height;
    const best = (hits.get(canvas) || []).reduce((closest, point) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      return distance < (closest?.distance ?? Infinity) ? {id: point.id, distance} : closest;
    }, null);
    if (best && best.distance < (large ? 23 : 13)) onSelect(best.id);
  }

  for (const [canvas, large] of targets) {
    canvas.addEventListener('click', event => handleClick(event, canvas, large));
  }
  return {render};
}
