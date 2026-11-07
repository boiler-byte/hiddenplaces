/** Immersive radio *metaphor*: bearings are artistic projections, never RF measurements. */
import { store } from '../state.js';
import { delta, clamp } from '../utils/geo-math.js';
import { $, escapeHtml } from '../utils/dom.js';
import { networkTitle, networkSubtitle, signalSources } from '../services/signals.js';

const PALETTE = {
  wifi: [91, 231, 240], bluetooth: [169, 139, 255],
  network: [213, 250, 140], device: [255, 180, 116]
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createWaves({onDemoToggle, onBluetooth, onSelect}) {
  const canvas = $('#wavesCanvas');
  const stage = $('#wavesStage');
  const context = canvas.getContext('2d');
  let animation = 0, lastFrame = 0, timestamp = 0;
  let sources = [];

  function projected(source, heading) {
    const diff = delta(source.bearing, heading);
    if (Math.abs(diff) > 96) return null;
    const edge = Math.min(.24, Math.max(.11, 62 / Math.max(stage.clientWidth, 320)));
    return {
      x: clamp(.5 + diff / 96 * .40, edge, 1 - edge),
      y: .32 + (source.lane % 3) * .105 + (source.quality === 'browser' ? .045 : 0),
      diff
    };
  }

  function visibleSources() {
    return sources.filter(source => projected(source, store.get().heading));
  }

  function renderMarkers() {
    const heading = store.get().heading;
    $('#waveBeacons').innerHTML = sources.map(source => {
      const pos = projected(source, heading);
      if (!pos) return '';
      const label = source.quality === 'demo' ? 'DEMO' : 'BROWSER';
      const selected = store.get().selectedSignal === source.id;
      return `<button type="button" class="wave-beacon wave-${source.type}${selected ? ' selected' : ''}" data-wave-id="${escapeHtml(source.id)}" style="left:${(pos.x*100).toFixed(2)}%;top:${(pos.y*100).toFixed(2)}%" aria-label="${escapeHtml(source.name)}, ${label}, Position illustrativ">
        <span class="wave-beacon-pip" aria-hidden="true"></span><span class="wave-beacon-text"><small>${label} · NICHT GEORTET</small><strong>${escapeHtml(source.name)}</strong></span></button>`;
    }).join('');
  }

  function renderData() {
    const state = store.get();
    sources = signalSources({network: state.signalNetwork, bluetoothDevices:state.bluetoothDevices, demo:state.wavesDemo});
    const liveCount = sources.filter(source => source.quality === 'browser').length;
    const demoCount = sources.length - liveCount;
    $('#wavesLiveBadge').textContent = `${liveCount} BROWSER · ${demoCount} DEMO`;
    $('#waveDemoToggle').setAttribute('aria-pressed', String(state.wavesDemo));
    $('#waveDemoToggle').textContent = state.wavesDemo ? 'Demo: An' : 'Demo: Aus';
    $('#waveDemoToggle').classList.toggle('active', state.wavesDemo);
    $('#wavesNetworkTitle').textContent = networkTitle(state.signalNetwork);
    $('#wavesNetworkDetail').textContent = networkSubtitle(state.signalNetwork);
    $('#wavesBleCount').textContent = `${state.bluetoothDevices.length} freigegeben`;
    $('#waveBluetoothBtn').textContent = state.bluetoothSupported ? '+ Bluetooth wählen' : 'Bluetooth nicht verfügbar';
    $('#waveBluetoothBtn').setAttribute('aria-disabled', String(!state.bluetoothSupported));
    $('#waveBluetoothBtn').title = state.bluetoothSupported
      ? 'Bluetooth-Low-Energy-Gerät über Browserauswahl freigeben'
      : 'Web Bluetooth benötigt einen unterstützten Browser und HTTPS';
    $('#wavesDemoHint').textContent = state.wavesDemo
      ? 'Bunte Demo-Wolken sind erfunden. Auch Browserdaten haben keine räumlich gemessene Position.'
      : 'Nur freigegebene Browserdaten. Die Position jeder Wolke ist illustrativ, niemals geortet.';
    $('#wavesSourceCount').textContent = `${sources.length} PROJEKTIONEN`;
    const selected = sources.find(source => source.id === state.selectedSignal);
    const focus = selected || sources.find(source => source.quality === 'browser') || sources[0];
    $('#waveFocusName').textContent = focus ? focus.name : 'Keine Quellen verfügbar';
    $('#waveFocusDetail').textContent = focus ? `${focus.quality === 'demo' ? 'SIMULATION' : 'BROWSERINFO'} · ${focus.detail}`
      : 'Demo einschalten oder ein Bluetooth-Gerät freigeben.';
    renderMarkers();
  }

  function renderHeading() {
    if (store.get().mode !== 'waves') return;
    renderMarkers();
    if (reducedMotion.matches) draw(performance.now());
  }

  function draw(now) {
    if (!context || store.get().mode !== 'waves') return;
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dw = Math.round(width * dpr), dh = Math.round(height * dpr);
    if (canvas.width !== dw || canvas.height !== dh) {
      canvas.width = dw; canvas.height = dh;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const t = reducedMotion.matches ? 0 : now / 1000;
    const isCamera = store.get().cameraActive;
    const bg = context.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, isCamera ? 'rgba(1,12,24,.40)' : '#07131f');
    bg.addColorStop(.63, isCamera ? 'rgba(3,22,31,.39)' : '#102a35');
    bg.addColorStop(1, isCamera ? 'rgba(1,12,22,.7)' : '#06151d');
    context.fillStyle = bg; context.fillRect(0, 0, width, height);

    // Perspective grid, explicitly a visualization rather than a sensor-based map.
    const horizon = height * .56;
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(89,224,218,.14)';
    for (let i = -10; i <= 10; i++) {
      context.beginPath(); context.moveTo(width / 2 + i * 23, horizon);
      context.lineTo(width / 2 + i * width * .17, height); context.stroke();
    }
    for (const fraction of [.02,.07,.15,.27,.43,.64,.91]) {
      const y = horizon + (height-horizon)*fraction;
      context.beginPath(); context.moveTo(0,y); context.lineTo(width,y); context.stroke();
    }
    const beamX = width*(.5 + .45*Math.sin(t*.41));
    const beam = context.createLinearGradient(beamX - 84, 0, beamX + 84, 0);
    beam.addColorStop(0,'rgba(91,231,240,0)'); beam.addColorStop(.5,'rgba(91,231,240,.065)'); beam.addColorStop(1,'rgba(91,231,240,0)');
    context.fillStyle = beam; context.fillRect(beamX-84,0,168,height);

    const heading = store.get().heading;
    for (const source of sources) {
      const pos = projected(source, heading);
      if (!pos) continue;
      const [r,g,b] = PALETTE[source.type] || PALETTE.network;
      const x = width*pos.x, y = height*pos.y;
      const size = Math.min(width,height) * (source.quality === 'demo' ? .095 : .112);
      const glow = context.createRadialGradient(x,y,3,x,y,size*2.1);
      glow.addColorStop(0,`rgba(${r},${g},${b},.36)`);
      glow.addColorStop(.37,`rgba(${r},${g},${b},.11)`);
      glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
      context.fillStyle=glow; context.beginPath(); context.arc(x,y,size*2.1,0,Math.PI*2); context.fill();
      for (let i=0;i<3;i++) {
        const pulse = (t*.21 + i/3 + source.bearing*.001)%1;
        const radius=size*(.42+pulse*1.48);
        context.strokeStyle=`rgba(${r},${g},${b},${.34*(1-pulse)})`;
        context.lineWidth=source.quality==='browser'?1.65:1.1;
        context.beginPath();context.ellipse(x,y,radius,radius*.65,0,0,Math.PI*2);context.stroke();
      }
      context.fillStyle=`rgba(${r},${g},${b},.86)`;
      context.beginPath(); context.arc(x,y,3.4,0,Math.PI*2);context.fill();
      for(let i=0;i<12;i++){
        const angle=i*2.39996+source.bearing, dist=size*(.31+(i%4)*.32);
        const px=x+Math.cos(angle+t*.075)*dist, py=y+Math.sin(angle+t*.075)*dist*.69;
        context.fillStyle=`rgba(${r},${g},${b},${.14 + (i%4)*.095})`;
        context.fillRect(px,py,1.8,1.8);
      }
    }
    // Fine scanlines keep the graphic lively while remaining visually lightweight.
    context.fillStyle='rgba(164,244,227,.018)';
    for (let y=0; y<height; y+=5) context.fillRect(0,y,width,1);
  }

  function loop(now) {
    animation = 0;
    if (document.hidden || store.get().mode !== 'waves') return;
    if (now - lastFrame >= 32) {draw(now);lastFrame=now;}
    animation=requestAnimationFrame(loop);
  }

  function start() {
    if (store.get().mode !== 'waves') return;
    draw(performance.now());
    if (!reducedMotion.matches && !document.hidden && !animation) animation=requestAnimationFrame(loop);
  }
  function stop() {if(animation) cancelAnimationFrame(animation);animation=0;}
  function renderMode() {
    if (store.get().mode === 'waves') start(); else stop();
  }
  function render() {renderData();renderMode();}

  $('#waveDemoToggle').addEventListener('click', () => onDemoToggle(!store.get().wavesDemo));
  $('#waveBluetoothBtn').addEventListener('click', onBluetooth);
  $('#waveBeacons').addEventListener('click', event => {
    const button=event.target.closest('[data-wave-id]');
    if (button) onSelect(button.dataset.waveId);
  });
  $('#wavesListButton').addEventListener('click', () => {
    const current=sources.findIndex(source => source.id === store.get().selectedSignal);
    const next=sources[(current+1)%sources.length];
    if(next) onSelect(next.id);
  });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reducedMotion.addEventListener?.('change', () => {stop();start();});
  return {render, renderMode, renderHeading, renderData, start, stop};
}
