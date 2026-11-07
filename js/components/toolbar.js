/** Topbar controls: mode, sensor, position, camera, installation and manual coordinates. */
import { store } from '../state.js';
import { $ } from '../utils/dom.js';
import { norm } from '../utils/geo-math.js';
import { createDropdowns } from './dropdown.js';
import { toast } from './notifications.js';

export function createToolbar({onMode, onHeading, onSensor, onCamera, onLocate, onCoordinates}) {
  const dropdowns = createDropdowns();
  const originalLocateButton = $('#locateBtn').innerHTML;
  let installPrompt = null;

  function renderMode() {
    for (const [id, mode] of [['lensTab','lens'],['radarTab','radar'],['wavesTab','waves']]) {
      const active=store.get().mode === mode;
      $(`#${id}`).classList.toggle('active', active);
      $(`#${id}`).setAttribute('aria-pressed', String(active));
    }
  }

  function renderHeading() {
    const {heading, sensorOn} = store.get();
    $('#manualLabel').textContent = `${Math.round(norm(heading))}°`;
    $('#headingSlider').value = Math.round(norm(heading));
    $('#sliderNote').textContent = sensorOn ? 'MANUELL ÜBERNEHMEN' : 'ZIEHEN ZUM ERKUNDEN';
  }

  function renderSensor() {
    const {sensorOn, sensorPending} = store.get();
    const button = $('#sensorBtn');
    button.classList.toggle('on', sensorOn);
    button.setAttribute('aria-pressed', String(sensorOn));
    button.setAttribute('aria-label', sensorOn ? 'Sensor ausschalten' : sensorPending ? 'Sensor wird aktiviert' : 'Sensor aktivieren');
    button.title = sensorOn ? 'Sensor ausschalten' : sensorPending ? 'Sensor wird aktiviert' : 'Sensor aktivieren';
    $('#sensorLabel').textContent = sensorOn ? 'Sensor aktiv' : sensorPending ? 'Sensor startet …' : 'Sensor aktivieren';
  }

  function renderLocation() {
    const {coords, demo, busy} = store.get();
    $('#locationName').textContent = coords.name;
    const {lat, lon} = coords;
    $('#locationCoords').textContent = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}${demo ? ' · Beispieldaten' : ''}`;
    const button = $('#locateBtn');
    if (busy && !button.disabled) {
      button.disabled = true;
      button.textContent = 'Suche läuft …';
    } else if (!busy && button.disabled) {
      button.disabled = false;
      button.innerHTML = originalLocateButton;
    }
  }

  function renderCamera() {
    $('#cameraBtn').setAttribute('aria-pressed', String(store.get().cameraActive));
  }

  function render() {
    renderMode(); renderHeading(); renderSensor(); renderLocation(); renderCamera();
  }

  $('#headingSlider').addEventListener('input', event => onHeading(Number(event.target.value)));
  $('#sensorBtn').addEventListener('click', onSensor);
  $('#cameraBtn').addEventListener('click', onCamera);
  $('#lensTab').addEventListener('click', () => { onMode('lens'); dropdowns.close(); });
  $('#radarTab').addEventListener('click', () => { onMode('radar'); dropdowns.close(); });
  $('#wavesTab').addEventListener('click', () => { onMode('waves'); dropdowns.close(); });
  $('#locateBtn').addEventListener('click', () => { dropdowns.close(); onLocate(); });

  $('#coordinateBtn').addEventListener('click', () => {
    dropdowns.close();
    const {lat, lon} = store.get().coords;
    $('#latitudeInput').value = lat.toFixed(5);
    $('#longitudeInput').value = lon.toFixed(5);
    $('#coordinateDialog').showModal();
  });
  $('#cancelCoordinate').addEventListener('click', () => $('#coordinateDialog').close());
  $('#coordinateForm').addEventListener('submit', event => {
    event.preventDefault();
    const lat = Number($('#latitudeInput').value), lon = Number($('#longitudeInput').value);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      toast('Bitte gültige Koordinaten eingeben.');
      return;
    }
    $('#coordinateDialog').close();
    onCoordinates({lat, lon});
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  $('#installBtn').addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      prompt.prompt();
      await prompt.userChoice;
    } else if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) {
      toast('Die App ist bereits als App geöffnet.');
    } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      toast('iPhone/iPad: Teilen → „Zum Home-Bildschirm“ auswählen.');
    } else {
      toast('Im Browsermenü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.');
    }
  });

  return {render, renderMode, renderHeading, renderSensor, renderLocation, renderCamera, closeMenus: dropdowns.close};
}
