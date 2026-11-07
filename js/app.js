/** Hidden Places v5 - composition root. UI receives callbacks, services remain framework-free. */
import { DEMO, DEMO_CENTER } from './config.js';
import { store, placeWithDistance, selectPlace, selectedPlace, toggleBookmark } from './state.js';
import { delta, norm } from './utils/geo-math.js';
import { $ } from './utils/dom.js';
import { getCurrentPosition } from './services/geolocation.js';
import { fetchNearbyPlaces } from './services/places-api.js';
import { createSensorService } from './services/sensors.js';
import { createCameraService } from './services/camera.js';
import { createSignalService } from './services/signals.js';
import { createToolbar } from './components/toolbar.js';
import { createSidebar } from './components/sidebar.js';
import { createViewer } from './components/viewer.js';
import { createRadar } from './components/radar.js';
import { createWaves } from './components/waves.js';
import { toast } from './components/notifications.js';

let requestVersion = 0;
let requestController = null;

const sensor = createSensorService({
  onHeading(bearing, kind) {
    const heading = store.get().heading;
    store.patch({heading: norm(heading + delta(bearing, heading) * .32), sensorKind: kind}, 'heading');
  },
  onStatus(status) { store.patch(status, 'sensor'); },
  onMessage: toast
});

const camera = createCameraService({
  onChange(active) { store.patch({cameraActive: active}, 'camera'); },
  onMessage: toast
});

const signals = createSignalService({
  onUpdate({network, bluetoothDevices, bluetoothSupported}) {
    store.patch({signalNetwork:network, bluetoothDevices, bluetoothSupported}, 'signals');
  },
  onMessage: toast
});

function setHeading(value) {
  if (sensor.isRunning()) sensor.stop();
  store.patch({heading: norm(value)}, 'heading');
}

function useDemo() {
  requestVersion++;
  requestController?.abort();
  requestController = null;
  store.patch({
    coords: {...DEMO_CENTER}, demo: true,
    points: placeWithDistance(DEMO, DEMO_CENTER), selected: null, busy: false
  }, 'places');
  toast('Berlin-Demo geladen. Wähle „Mein Standort“ für echte Orte.');
}

async function loadLive(coords, name) {
  const version = ++requestVersion;
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  store.patch({coords: {...coords, name}, demo: false, points: [], selected: null, busy: true}, 'places');
  try {
    const points = await fetchNearbyPlaces(coords, {signal: controller.signal});
    if (version !== requestVersion) return;
    store.patch({points: placeWithDistance(points, store.get().coords), selected: null}, 'places');
    toast(points.length ? `${points.length} Orte aus OpenStreetMap geladen.` : 'Keine passenden OSM-Orte in diesem Umkreis gefunden.');
  } catch (error) {
    if (version !== requestVersion || controller.signal.aborted) return;
    console.warn('Hidden Places / Overpass', error);
    toast('Orte konnten nicht geladen werden. Prüfe deine Verbindung oder probiere die Demo.');
  } finally {
    if (version === requestVersion) {
      requestController = null;
      store.patch({busy: false}, 'busy');
    }
  }
}

async function locate() {
  if (store.get().busy) return;
  const version = ++requestVersion;
  toast('Standort wird angefragt …');
  try {
    const coords = await getCurrentPosition();
    if (version !== requestVersion) return;
    await loadLive(coords, 'Dein Standort');
  } catch (error) {
    if (version === requestVersion) toast(error.message);
  }
}

const radar = createRadar({onSelect: selectPlace});
const viewer = createViewer({
  onHeading: setHeading, onSelect: selectPlace,
  onSave: toggleBookmark, onCloseDetail: () => selectPlace(null)
});
const waves = createWaves({
  onDemoToggle(wavesDemo) { store.patch({wavesDemo, selectedSignal:null}, 'signals'); },
  onBluetooth() { signals.chooseBluetooth(); },
  onSelect(selectedSignal) { store.patch({selectedSignal}, 'signals'); }
});
const sidebar = createSidebar({
  onFilter(filter) { store.patch({filter, selected: null}, 'filters'); },
  onRadius(radius) {
    store.patch({radius, selected: selectedPlace()?.dist > radius ? null : store.get().selected}, 'filters');
  },
  onQuery(query) { store.patch({query: query.trim().toLocaleLowerCase('de')}, 'filters'); },
  onSelect: selectPlace, onSave: toggleBookmark, onDemo: useDemo
});
const toolbar = createToolbar({
  onMode(mode) { store.patch({mode}, 'mode'); },
  onHeading: setHeading,
  onSensor() {
    if (sensor.isRunning()) { sensor.stop(); toast('Manuelle Richtungssteuerung aktiviert.'); }
    else sensor.enable(store.get().heading);
  },
  onCamera() { camera.toggle($('#cameraVideo')); },
  onLocate: locate,
  onCoordinates(coords) { loadLive(coords, 'Eigene Koordinaten'); }
});

function renderAll() {
  toolbar.render();
  sidebar.render();
  viewer.render();
  radar.render();
  waves.render();
}

store.subscribe((_state, change) => {
  switch (change) {
    case 'heading':
      toolbar.renderHeading();
      viewer.renderHeading();
      radar.render();
      waves.renderHeading();
      break;
    case 'sensor':
      toolbar.renderSensor();
      toolbar.renderHeading();
      viewer.renderHeading();
      break;
    case 'camera':
      toolbar.renderCamera();
      viewer.renderMode();
      waves.renderMode();
      break;
    case 'mode':
      toolbar.renderMode();
      viewer.renderMode();
      radar.render();
      waves.renderMode();
      break;
    case 'signals':
      waves.renderData();
      break;
    case 'busy':
      toolbar.renderLocation();
      break;
    case 'filters': case 'selection': case 'saved':
      sidebar.render();
      viewer.renderMarkers();
      viewer.renderDetail();
      radar.render();
      break;
    default:
      renderAll();
  }
});

// Start with the original places demo and opt-in demo signal field.
store.patch({points: placeWithDistance(DEMO, DEMO_CENTER)}, 'places');
signals.refresh();
signals.restorePermitted();
sidebar.syncResponsive();
window.addEventListener('resize', () => {
  sidebar.syncResponsive();
  toolbar.closeMenus();
  viewer.renderHeading();
  radar.render();
  waves.renderHeading();
});
window.addEventListener('pagehide', () => {
  sensor.stop();
  camera.stop($('#cameraVideo'));
  requestController?.abort();
  signals.dispose();
  waves.stop();
});
if ('serviceWorker' in navigator && isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
}
