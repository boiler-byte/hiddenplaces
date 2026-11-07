/** Central, small observable store. Features never mutate state directly. */
import { DEMO_CENTER } from './config.js';
import { bearingTo, distanceKm } from './utils/geo-math.js';
import { readBookmarks, writeBookmarks } from './utils/storage.js';

const listeners = new Set();
let state = {
  coords: {...DEMO_CENTER}, demo: true, points: [],
  filter: 'all', radius: 10, query: '', heading: 45,
  selected: null, mode: 'lens', selectedSignal: null, wavesDemo: true,
  signalNetwork: {online:false, type:'unknown', effectiveType:null, downlink:null, rtt:null},
  bluetoothDevices: [], bluetoothSupported: false,
  sensorOn: false, sensorPending: false, sensorKind: 'manual',
  cameraActive: false, busy: false, saved: readBookmarks()
};

export const store = {
  get: () => state,
  patch(patch, change = 'all') {
    state = {...state, ...patch};
    for (const listener of listeners) listener(state, change);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

export function placeWithDistance(points, coords = state.coords) {
  return points.map(point => ({
    ...point, dist: distanceKm(coords, point), bearing: bearingTo(coords, point)
  })).sort((a, b) => a.dist - b.dist);
}

export function filteredPlaces() {
  const {points, radius, filter, query, saved} = state;
  return points.filter(point => point.dist <= radius
    && (filter === 'all' || (filter === 'saved' ? saved.has(point.id) : point.category === filter))
    && (!query || point.name.toLocaleLowerCase('de').includes(query)));
}

export function selectedPlace() { return state.points.find(point => point.id === state.selected) ?? null; }
export function selectPlace(id) {
  if (id !== null && !state.points.some(point => point.id === id)) return;
  store.patch({selected: id}, 'selection');
}
export function setPlaces(points) {
  store.patch({points: placeWithDistance(points), selected: null}, 'places');
}
export function toggleBookmark(id) {
  const saved = new Set(state.saved);
  if (saved.has(id)) saved.delete(id); else saved.add(id);
  writeBookmarks(saved);
  store.patch({saved}, 'saved');
}
