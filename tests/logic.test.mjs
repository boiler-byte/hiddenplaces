import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO, DEMO_CENTER} from '../js/config.js';
import {bearingTo, cardinal, delta, distanceKm, norm} from '../js/utils/geo-math.js';
import {buildOverpassQuery, parseOverpass, fetchNearbyPlaces} from '../js/services/places-api.js';
import {store, placeWithDistance, filteredPlaces, selectPlace, toggleBookmark} from '../js/state.js';
import {escapeHtml} from '../js/utils/dom.js';
import {networkSnapshot, networkTitle, networkSubtitle, signalSources} from '../js/services/signals.js';

test('Geographic helpers: normalization, delta and compass bearings', () => {
  assert.equal(norm(-15), 345);
  assert.equal(delta(355, 5), -10);
  assert.equal(delta(5, 355), 10);
  assert.equal(cardinal(44), 'NE');
  assert.equal(distanceKm(DEMO_CENTER, DEMO_CENTER), 0);
  assert.ok(Math.abs(bearingTo({lat:0,lon:0}, {lat:0,lon:1}) - 90) < 0.01);
  assert.ok(distanceKm({lat:0,lon:0}, {lat:0,lon:1}) > 111);
});

test('Demo places are sorted by distance and derivable from central store', () => {
  const points = placeWithDistance(DEMO, DEMO_CENTER);
  assert.equal(points.length, DEMO.length);
  assert.ok(points.every(point => point.dist >= 0 && point.bearing >= 0 && point.bearing < 360));
  assert.ok(points.every((point, index) => index === 0 || points[index - 1].dist <= point.dist));
  store.patch({points, filter:'all', radius:15, query:''}, 'places');
  assert.ok(filteredPlaces().length >= 10);
  const first = filteredPlaces()[0];
  selectPlace(first.id);
  assert.equal(store.get().selected, first.id);
  toggleBookmark(first.id);
  assert.ok(store.get().saved.has(first.id));
  store.patch({filter:'saved'}, 'filters');
  assert.ok(filteredPlaces().some(point => point.id === first.id));
  toggleBookmark(first.id);
});

test('Overpass input query and OSM parsing', () => {
  const query = buildOverpassQuery(DEMO_CENTER);
  assert.match(query, /around:15000,52\.52060,13\.40500/);
  const parsed = parseOverpass([
    {type:'node',id:1,lat:52.5,lon:13.4,tags:{name:'Altstadt',historic:'castle'}},
    {type:'node',id:2,lat:52.6,lon:13.5,tags:{name:'Altstadt',tourism:'viewpoint'}},
    {type:'way',id:3,center:{lat:52.4,lon:13.6},tags:{name:'Turm',man_made:'tower'}},
    {type:'node',id:4,lat:null,lon:null,tags:{name:'Fehler'}}
  ]);
  assert.equal(parsed.length,2);
  assert.equal(parsed[0].category,'history');
  assert.equal(parsed[1].category,'view');
  assert.equal(parsed[1].lat,52.4);
});

test('Overpass endpoint fallback, using injected HTTP stub', async () => {
  const attempts = [];
  const points = await fetchNearbyPlaces({lat:48.12345,lon:11.98765},{
    endpoints:['https://invalid.example','https://working.example'],
    fetcher:async url => {
      attempts.push(url);
      if (url.includes('invalid')) return {ok:false,status:503};
      return {ok:true,json:async()=>({elements:[
        {type:'node',id:77,lat:48.12,lon:11.98,tags:{name:'Mock POI',tourism:'museum'}}
      ]})};
    }
  });
  assert.equal(attempts.length,2);
  assert.equal(points[0].name,'Mock POI');
  assert.equal(points[0].id,'osm-node-77');
});

test('Untrusted OSM markup is escaped before rendering', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});


test('Signal source labeling: browser readings never pretend to be RF scans', () => {
  const network = networkSnapshot(true, {type:'wifi',effectiveType:'4g',downlink:12.5,rtt:50});
  assert.equal(networkTitle(network), 'WLAN-Verbindung');
  assert.match(networkSubtitle(network), /Netzklasse 4G/);
  const sources = signalSources({network, demo:false, bluetoothDevices:[{id:'foo',name:'Beacon A'}]});
  assert.equal(sources.length,2);
  assert.ok(sources.every(s => s.quality==='browser'));
  assert.match(sources[1].detail,/keine Entfernungsdaten/);
  const demo = signalSources({network, demo:true,bluetoothDevices:[]});
  assert.equal(demo.filter(s=>s.quality==='demo').length,4);
  assert.equal(networkTitle(networkSnapshot(false,null)), 'Offline (Browserstatus)');
  assert.equal(signalSources({network:networkSnapshot(false,null),demo:false}).length,0);
});
