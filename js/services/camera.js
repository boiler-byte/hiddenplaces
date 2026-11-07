/** Handles camera permissions, device streams and cleanup. No DOM rendering. */
export function createCameraService({onChange, onMessage}) {
  let stream = null;
  return {
    async toggle(video) {
      if (stream) {
        this.stop(video);
        onMessage('Kamera ausgeschaltet.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        onMessage('Kamera erfordert HTTPS und einen unterstützten Browser.');
        return;
      }
      try {
        const active = await navigator.mediaDevices.getUserMedia({
          audio: false, video: {facingMode: {ideal: 'environment'}}
        });
        stream = active;
        video.srcObject = active;
        await video.play().catch(() => {});
        onChange(true);
        onMessage('Kamera aktiv. Die Marker sind richtungsbasiert und können leicht abweichen.');
      } catch (error) {
        if (stream) this.stop(video);
        onMessage('Kamerazugriff nicht möglich: ' + (error.name === 'NotAllowedError'
          ? 'Berechtigung verweigert' : error.message));
      }
    },
    stop(video) {
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
      if (video) video.srcObject = null;
      onChange(false);
    }
  };
}
