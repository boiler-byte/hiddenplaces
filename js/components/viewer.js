/** AR-like directional overlay, compass ruler, gesture navigation and place detail card. */
import { CATEGORY } from '../config.js';
import { filteredPlaces, selectedPlace, store } from '../state.js';
import { cardinal, clamp, delta, displayDistance, norm } from '../utils/geo-math.js';
import { $, escapeHtml } from '../utils/dom.js';

export function createViewer({onHeading, onSelect, onSave, onCloseDetail}) {
  const viewport = $('#viewport');
  const detail = $('#detailCard');

  function renderMode() {
    const {mode, cameraActive, demo} = store.get();
    viewport.classList.toggle('radar-mode', mode === 'radar');
    viewport.classList.toggle('waves-mode', mode === 'waves');
    viewport.classList.toggle('camera-active', cameraActive);
    $('#viewModeLabel').textContent = mode === 'waves' ? 'SIGNALRAUM · ILLUSTRATION' : (demo ? 'DEMO · BERLIN' : 'LIVE · OSM-DATEN');
  }

  function renderRuler() {
    const heading = store.get().heading;
    let html = '';
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const difference = delta(bearing, heading);
      if (Math.abs(difference) > 65) continue;
      const left = 50 + difference / 65 * 50;
      const label = bearing % 45 === 0 ? cardinal(bearing) : String(bearing).padStart(3, '0');
      html += `<div class="bearing-tick" style="left:${left}%">${label}</div>`;
    }
    $('#bearingRuler').innerHTML = html;
  }

  function renderMarkers() {
    const state = store.get();
    const visible = filteredPlaces()
      .filter(point => Math.abs(delta(point.bearing, state.heading)) <= 58)
      .sort((a, b) => Math.abs(delta(a.bearing, state.heading)) - Math.abs(delta(b.bearing, state.heading)))
      .slice(0, 7);
    const occupied = [];
    $('#arMarkers').innerHTML = visible.map((point, index) => {
      const d = delta(point.bearing, state.heading);
      const edge = window.innerWidth <= 400 ? 21 : window.innerWidth <= 760 ? 18 : 12;
      const x = clamp(50 + (d / 58) * 44, edge, 100 - edge);
      let y = 33 + index % 4 * 10;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (!occupied.some(position => Math.abs(position.x - x) < 18 && Math.abs(position.y - y) < 12)) break;
        y = y > 58 ? 30 : y + 13;
      }
      occupied.push({x, y});
      const category = CATEGORY[point.category] || CATEGORY.culture;
      return `<button type="button" class="ar-marker${point.id === state.selected ? ' selected' : ''}"
        data-open="${escapeHtml(point.id)}" style="left:${x}%;top:${y}%" aria-label="${escapeHtml(point.name)} ${displayDistance(point.dist)}">
        <div class="marker-top"><span class="marker-dot"></span>${displayDistance(point.dist)} · ${category.label}</div>
        <div class="marker-name">${escapeHtml(point.name)}</div></button>`;
    }).join('');
    $('#visibleLabel').textContent = `${visible.length} ${visible.length === 1 ? 'ORT' : 'ORTE'} IM BLICK`;
    $('#viewHint').textContent = visible.length
      ? 'Tippe auf einen Marker für Details.' : 'Drehe dich, um Orte zu finden.';
  }

  function renderDetail() {
    const state = store.get(), point = selectedPlace();
    if (!point) {
      detail.classList.remove('open');
      detail.innerHTML = '';
      return;
    }
    const maps = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point.lat + ',' + point.lon)}&travelmode=walking`;
    const osm = `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=17/${point.lat}/${point.lon}`;
    const category = CATEGORY[point.category] || CATEGORY.culture;
    detail.innerHTML = `<button class="detail-close" type="button" id="detailClose" aria-label="Details schließen">×</button>
      <div class="detail-category">${category.label} · ${state.demo ? 'BEISPIELORT' : 'OPENSTREETMAP'}</div>
      <h3>${escapeHtml(point.name)}</h3>
      <p>${escapeHtml(point.description || 'Ein spannender Ort in deiner Umgebung. Finde heraus, was ihn besonders macht.')}</p>
      <div class="detail-meta"><span>◎ ${displayDistance(point.dist)} entfernt</span><span>↗ ${Math.round(point.bearing)}° ${cardinal(point.bearing)}</span></div>
      <div class="detail-actions"><a href="${maps}" target="_blank" rel="noopener noreferrer">Route öffnen ↗</a>
        <button type="button" id="detailSave">${state.saved.has(point.id) ? '★ Gespeichert' : '☆ Merken'}</button>
        <a href="${osm}" target="_blank" rel="noopener noreferrer" style="flex:0;white-space:nowrap;background:#2d3d33;color:#e6f2df">Karte</a>
      </div>`;
    detail.classList.add('open');
  }

  function renderHeading() {
    const {heading, sensorOn, sensorKind} = store.get();
    $('#headingValue').textContent = String(Math.round(norm(heading)) % 360).padStart(3, '0') + '°';
    $('#headingCardinal').textContent = cardinal(heading);
    $('#headingSource').textContent = sensorOn
      ? sensorKind === 'absolute' ? 'KOMPASS AKTIV' : 'RELATIVE AUSRICHTUNG'
      : 'MANUELLE RICHTUNG';
    renderRuler();
    renderMarkers();
  }

  function render() { renderMode(); renderHeading(); renderDetail(); }

  $('#arMarkers').addEventListener('click', event => {
    const button = event.target.closest('[data-open]');
    if (button) onSelect(button.dataset.open);
  });
  detail.addEventListener('click', event => {
    if (event.target.closest('#detailClose')) onCloseDetail();
    else if (event.target.closest('#detailSave')) {
      const point = selectedPlace();
      if (point) onSave(point.id);
    }
  });

  let pointer = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.target.closest('button,a,canvas,.detail-card')) return;
    pointer = {id: event.pointerId, x: event.clientX, heading: store.get().heading};
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointer || event.pointerId !== pointer.id || Math.abs(event.clientX - pointer.x) < 3) return;
    onHeading(pointer.heading - (event.clientX - pointer.x) * .4);
  });
  for (const name of ['pointerup', 'pointercancel', 'pointerleave']) {
    viewport.addEventListener(name, () => { pointer = null; });
  }
  return {render, renderHeading, renderMarkers, renderDetail, renderMode};
}
