/** Orientation sensor adapter. Absolute north bearings are not confused with relative angles. */
import { norm } from '../utils/geo-math.js';

export function createSensorService({onHeading, onStatus, onMessage}) {
  let listening = false, active = false, origin = null, base = 45, gotAbsolute = false;
  let timer = null, raf = 0, latest = null;
  let generation = 0;

  function stop() {
    generation++;
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    clearTimeout(timer);
    if (raf) cancelAnimationFrame(raf);
    raf = 0; latest = null;
    listening = active = gotAbsolute = false;
    origin = null;
    onStatus({sensorOn: false, sensorPending: false, sensorKind: 'manual'});
  }

  function handleOrientation(event) {
    let bearing = null, kind = 'relative';
    if (Number.isFinite(event.webkitCompassHeading)) {
      bearing = norm(event.webkitCompassHeading); kind = 'absolute';
    } else if (event.absolute === true && Number.isFinite(event.alpha)) {
      const rotation = Number.isFinite(screen.orientation?.angle) ? screen.orientation.angle : 0;
      bearing = norm(360 - event.alpha + rotation); kind = 'absolute';
    } else if (!gotAbsolute && Number.isFinite(event.alpha)) {
      if (origin === null) origin = event.alpha;
      bearing = norm(base + origin - event.alpha);
    }
    if (bearing === null || (gotAbsolute && kind !== 'absolute')) return;
    if (kind === 'absolute') gotAbsolute = true;
    if (!active) {
      active = true;
      clearTimeout(timer);
      onStatus({sensorOn: true, sensorPending: false, sensorKind: kind});
      onMessage(kind === 'absolute'
        ? 'Kompass aktiv – bewege dein Handy.'
        : 'Bewegungssensor aktiv. Die Richtung ist relativ, nicht auf Norden kalibriert.');
    }
    latest = {bearing, kind};
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      if (listening && latest) onHeading(latest.bearing, latest.kind);
    });
  }

  async function enable(currentHeading) {
    if (listening) return;
    if (!('DeviceOrientationEvent' in window)) {
      onMessage('Auf diesem Gerät sind keine Orientierungssensoren verfügbar. Nutze den Regler.');
      return;
    }
    if (!isSecureContext) {
      onMessage('Für Sensoren HTTPS oder localhost verwenden.');
      return;
    }
    const attempt = ++generation;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // Called inside the user's click handler, before yielding to asynchronous events.
        const permission = await DeviceOrientationEvent.requestPermission(true);
        if (attempt !== generation) return;
        if (permission !== 'granted') {
          onMessage('Sensorfreigabe nicht erteilt. Der manuelle Modus funktioniert weiterhin.');
          return;
        }
      }
      base = currentHeading; origin = null; gotAbsolute = false;
      listening = true;
      onStatus({sensorOn: false, sensorPending: true, sensorKind: 'manual'});
      window.addEventListener('deviceorientationabsolute', handleOrientation);
      window.addEventListener('deviceorientation', handleOrientation);
      timer = setTimeout(() => {
        if (listening && !active) {
          stop();
          onMessage('Keine verwertbaren Sensordaten. Nutze den Regler.');
        }
      }, 3500);
    } catch (error) {
      stop();
      onMessage('Kompass konnte nicht aktiviert werden: ' + (error.message || 'Berechtigung fehlt'));
    }
  }

  return { enable, stop, isRunning: () => listening };
}
