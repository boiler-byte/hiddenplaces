/** Acquires the current location only after the user requests it. */
export function getCurrentPosition() {
  if (!navigator.geolocation) throw new Error('Standortbestimmung wird nicht unterstützt. Nutze Koordinaten.');
  if (!isSecureContext) throw new Error('Für GPS ist HTTPS oder localhost nötig.');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({lat: position.coords.latitude, lon: position.coords.longitude}),
      error => reject(new Error(error.code === 1
        ? 'Standortzugriff verweigert. Alternativ Koordinaten eingeben.'
        : 'Standort nicht verfügbar. Versuche es erneut oder nutze Koordinaten.')),
      {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000}
    );
  });
}
