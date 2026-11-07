// Shared static data and service configuration. No browser or UI dependencies.
export const DEMO_CENTER = { lat: 52.5206, lon: 13.4050, name: 'Berlin · Demo' };
export const DEMO = [
      {id:'d1',name:'Märchenbrunnen',lat:52.5284,lon:13.4236,category:'culture',description:'Ein Brunnenensemble im Volkspark Friedrichshain mit Figuren aus Märchen.',tag:'Brunnen & Kunst'},
      {id:'d2',name:'Gedenkstätte Berliner Mauer',lat:52.5350,lon:13.3904,category:'history',description:'Ein Erinnerungsort zur Geschichte der Berliner Mauer an der Bernauer Straße.',tag:'Geschichte'},
      {id:'d3',name:'Bebelplatz',lat:52.5166,lon:13.3937,category:'history',description:'Historischer Platz in Mitte mit einem unterirdischen Denkmal zur Bücherverbrennung.',tag:'Geschichte'},
      {id:'d4',name:'Viktoriapark',lat:52.4883,lon:13.3816,category:'nature',description:'Park am Kreuzberg mit Wasserfall, Wegen und Aussicht über Teile der Stadt.',tag:'Natur'},
      {id:'d5',name:'Teufelsberg',lat:52.4979,lon:13.2408,category:'view',description:'Erhebung im Grunewald mit markanten ehemaligen Abhöranlagen und weitem Blick.',tag:'Aussicht'},
      {id:'d6',name:'Museumsinsel',lat:52.5209,lon:13.4010,category:'culture',description:'Museumsensemble auf einer Insel in der Spree und UNESCO-Welterbestätte.',tag:'Kultur'},
      {id:'d7',name:'Nikolaiviertel',lat:52.5169,lon:13.4068,category:'history',description:'Historisch geprägtes Quartier im Zentrum Berlins rund um die Nikolaikirche.',tag:'Geschichte'},
      {id:'d8',name:'Oberbaumbrücke',lat:52.5019,lon:13.4450,category:'view',description:'Bekannte Brücke über die Spree zwischen Kreuzberg und Friedrichshain.',tag:'Aussicht'},
      {id:'d9',name:'Volkspark Friedrichshain',lat:52.5267,lon:13.4379,category:'nature',description:'Weitläufiger Stadtpark mit Spazierwegen, Bäumen und Grünflächen.',tag:'Natur'},
      {id:'d10',name:'Humboldt Forum',lat:52.5175,lon:13.4021,category:'culture',description:'Kultur- und Ausstellungsort im rekonstruierten Berliner Schloss.',tag:'Kultur'},
      {id:'d11',name:'Mauerpark',lat:52.5430,lon:13.4023,category:'nature',description:'Öffentlicher Park entlang eines ehemaligen Abschnitts der Berliner Mauer.',tag:'Natur'},
      {id:'d12',name:'Zionskirche',lat:52.5344,lon:13.4059,category:'history',description:'Historische Kirche am Zionskirchplatz in Berlin-Mitte.',tag:'Geschichte'}
    ];
export const CATEGORY = {
      history: { label:'Geschichte', symbol:'⌂' }, nature:{label:'Natur',symbol:'✿'},
      view:{label:'Aussicht',symbol:'↗'}, culture:{label:'Kultur',symbol:'✦'}
    };

export const OVERPASS_ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];
