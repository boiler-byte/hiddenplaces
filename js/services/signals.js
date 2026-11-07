/**
 * Browser-visible connectivity and user-selected BLE peripherals only.
 * No Wi-Fi scanning, RSSI, location triangulation or passive radio discovery.
 */
export function networkSnapshot(online, connection) {
  const type = typeof connection?.type === 'string' ? connection.type : 'unknown';
  const effectiveType = typeof connection?.effectiveType === 'string' ? connection.effectiveType : null;
  const downlink = Number.isFinite(connection?.downlink) ? connection.downlink : null;
  const rtt = Number.isFinite(connection?.rtt) ? connection.rtt : null;
  return { online: Boolean(online), type, effectiveType, downlink, rtt };
}

export function networkTitle(network) {
  if (!network.online) return 'Offline (Browserstatus)';
  if (network.type === 'wifi') return 'WLAN-Verbindung';
  if (network.type === 'cellular') return 'Mobilfunk-Verbindung';
  if (network.type === 'ethernet') return 'Kabelnetz-Verbindung';
  return 'Internet-Verbindung';
}

export function networkSubtitle(network) {
  if (!network.online) return 'navigator.onLine meldet offline';
  const bits = [];
  if (network.effectiveType) bits.push(`Netzklasse ${network.effectiveType.toUpperCase()}`);
  if (network.downlink !== null) bits.push(`~${network.downlink} Mbit/s`);
  if (network.rtt !== null) bits.push(`~${network.rtt} ms RTT`);
  return bits.length ? bits.join(' · ') : 'Online-Status laut Browser';
}

export function signalSources({network, bluetoothDevices = [], demo = true}) {
  const sources = [];
  if (network?.online) {
    sources.push({ id:'net-live', name:networkTitle(network), detail:networkSubtitle(network),
      type:network.type === 'wifi' ? 'wifi' : 'network', quality:'browser', bearing:32, lane:0 });
  }
  bluetoothDevices.forEach((device, index) => {
    // Display locations are deliberately *not* measurements of physical bearing.
    const hash = [...String(device.id || device.name || index)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
    sources.push({ id:`ble-${device.id || index}`, name:device.name || 'Bluetooth-Gerät',
      detail:'Per Auswahl freigegeben · keine Entfernungsdaten', type:'bluetooth',
      quality:'browser', bearing:(78 + hash % 235) % 360, lane:index % 3 });
  });
  if (demo) sources.push(
    {id:'demo-1', name:'WLAN-Cluster', detail:'Demo · fiktive Funkquelle', type:'wifi', quality:'demo', bearing:302, lane:2},
    {id:'demo-2', name:'BLE-Beacon', detail:'Demo · fiktive Funkquelle', type:'bluetooth', quality:'demo', bearing:118, lane:1},
    {id:'demo-3', name:'Mobilfunk-Zelle', detail:'Demo · fiktive Funkquelle', type:'network', quality:'demo', bearing:218, lane:0},
    {id:'demo-4', name:'IoT-Sensor', detail:'Demo · fiktive Funkquelle', type:'device', quality:'demo', bearing:350, lane:2}
  );
  return sources;
}

export function createSignalService({onUpdate, onMessage}) {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  const devices = new Map();
  let disposed = false;
  const isBluetoothSupported = () => Boolean(navigator.bluetooth?.requestDevice && window.isSecureContext);
  const snapshot = () => ({
    network: networkSnapshot(navigator.onLine, connection),
    bluetoothDevices: Array.from(devices.values()),
    bluetoothSupported: isBluetoothSupported()
  });
  const notify = () => { if (!disposed) onUpdate(snapshot()); };
  connection?.addEventListener?.('change', notify);
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);

  async function restorePermitted() {
    if (!isBluetoothSupported() || typeof navigator.bluetooth.getDevices !== 'function') return;
    try {
      const permitted = await navigator.bluetooth.getDevices();
      if (disposed) return;
      for (const device of permitted) devices.set(device.id, {id:device.id, name:device.name || 'Bluetooth-Gerät'});
      notify();
    } catch { /* previously authorized devices may not be listable */ }
  }

  async function chooseBluetooth() {
    if (!isBluetoothSupported()) {
      onMessage('Web Bluetooth ist hier nicht verfügbar. Probiere Chrome auf Android über HTTPS.');
      return;
    }
    try {
      // Must be invoked directly from user click. This is a chooser, NOT an ambient BLE scan.
      const device = await navigator.bluetooth.requestDevice({acceptAllDevices:true});
      if (disposed) return;
      devices.set(device.id, {id:device.id, name:device.name || 'Bluetooth-Gerät'});
      notify();
      onMessage('Bluetooth-Gerät übernommen. Die dargestellte Richtung ist rein illustrativ.');
    } catch (error) {
      if (error?.name === 'NotFoundError' || error?.name === 'NotAllowedError') {
        onMessage('Keine Bluetooth-Auswahl getroffen oder Zugriff nicht erlaubt.');
      } else {
        onMessage('Bluetooth-Zugriff fehlgeschlagen: ' + (error?.message || 'Nicht unterstützt'));
      }
    }
  }

  function dispose() {
    disposed = true;
    connection?.removeEventListener?.('change', notify);
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
    devices.clear();
  }
  return {snapshot, refresh:notify, chooseBluetooth, restorePermitted, dispose};
}
