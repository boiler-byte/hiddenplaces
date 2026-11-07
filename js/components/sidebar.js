/** Filtering, bookmarks and responsive offcanvas listing. */
import { CATEGORY } from '../config.js';
import { filteredPlaces, store } from '../state.js';
import { displayDistance } from '../utils/geo-math.js';
import { $, $$, escapeHtml } from '../utils/dom.js';
import { smallScreen } from './dropdown.js';

export function createSidebar({onFilter, onRadius, onQuery, onSelect, onSave, onDemo}) {
  const sidebar = $('#placesSidebar');
  const backdrop = $('#sidebarBackdrop');
  const toggle = $('#placesToggle');

  function setOpen(value, returnFocus = true) {
    const open = Boolean(value && smallScreen.matches);
    const wasOpen = sidebar.classList.contains('open');
    if (!open && wasOpen && returnFocus) toggle.focus();
    sidebar.classList.toggle('open', open);
    backdrop.hidden = !open;
    document.body.classList.toggle('drawer-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (smallScreen.matches) {
      sidebar.inert = !open;
      sidebar.setAttribute('aria-hidden', String(!open));
    } else {
      sidebar.inert = false;
      sidebar.removeAttribute('aria-hidden');
    }
    if (open) $('#sidebarClose').focus();
  }

  function syncResponsive() {
    if (!smallScreen.matches) setOpen(false, false);
    else if (!sidebar.classList.contains('open')) {
      sidebar.inert = true;
      sidebar.setAttribute('aria-hidden', 'true');
    }
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !smallScreen.matches || !sidebar.classList.contains('open')) return;
    const nodes = [...sidebar.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')]
      .filter(element => element.getClientRects().length);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function render() {
    const state = store.get();
    $$('#filters [data-filter]').forEach(button => {
      const active = button.dataset.filter === state.filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#radiusSlider').value = state.radius;
    $('#radiusLabel').textContent = `${state.radius} km`;
    if ($('#searchInput').value.trim().toLocaleLowerCase('de') !== state.query) {
      $('#searchInput').value = state.query;
    }
    const places = filteredPlaces();
    $('#resultCount').textContent = `${places.length} ${places.length === 1 ? 'Ort' : 'Orte'}`;
    $('#placesList').innerHTML = places.length ? places.slice(0, 60).map(place => {
      const category = CATEGORY[place.category] || CATEGORY.culture;
      const selected = place.id === state.selected;
      return `<article class="place-item${selected ? ' selected' : ''}">
        <button class="place-main" type="button" data-open="${escapeHtml(place.id)}" aria-label="${escapeHtml(place.name)} auswählen">
          <span class="place-icon ${escapeHtml(place.category)}"><span aria-hidden="true" style="font-size:22px">${category.symbol}</span></span>
          <span class="place-data"><span class="place-title" style="display:block">${escapeHtml(place.name)}</span>
          <span class="place-sub"><span>${displayDistance(place.dist)}</span><span>· ${category.label}</span><span>· ${Math.round(place.bearing)}°</span></span></span>
        </button><button class="bookmark${state.saved.has(place.id) ? ' saved' : ''}" data-save="${escapeHtml(place.id)}"
        type="button" aria-label="${state.saved.has(place.id) ? 'Aus Merkliste entfernen' : 'In Merkliste speichern'}" title="Merkliste">${state.saved.has(place.id) ? '★' : '☆'}</button>
      </article>`;
    }).join('') : '<div class="empty-state">Hier gibt es mit diesen Filtern noch keine Treffer. Wechsle die Kategorie, erhöhe den Radius oder ändere deinen Standort.</div>';
    $('#dataNote').innerHTML = state.demo
      ? 'Demo-Orte sind Beispiele. Für echte Orte Standort wählen. Datenquelle: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap-Mitwirkende</a> (ODbL).'
      : 'Orte aus <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap-Mitwirkende</a> (ODbL). Standort-Koordinaten werden bei der Suche an den Overpass-Server übermittelt, aber von dieser App nicht dauerhaft gespeichert.';
  }

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  $('#sidebarClose').addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => {
    trapFocus(event);
    if (event.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
  });
  $('#filters').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (button) onFilter(button.dataset.filter);
  });
  $('#placesList').addEventListener('click', event => {
    const save = event.target.closest('[data-save]');
    if (save) { onSave(save.dataset.save); return; }
    const open = event.target.closest('[data-open]');
    if (open) {
      onSelect(open.dataset.open);
      if (smallScreen.matches) setOpen(false);
    }
  });
  $('#radiusSlider').addEventListener('input', event => onRadius(Number(event.target.value)));
  $('#searchInput').addEventListener('input', event => onQuery(event.target.value));
  $('#demoBtn').addEventListener('click', onDemo);
  return {render, setOpen, syncResponsive};
}
