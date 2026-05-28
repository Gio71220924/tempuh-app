export const CATALOG = [
  // Commercial — widebody
  { id:'b77w', name:'Boeing 777-300ER',       short:'B777',  category:'Commercial', subtype:'widebody',   maxPax:396, maxPayload:70.0, mtow:351, fuelBurn:7.5,  cruise:485, alt:'FL360', maxRange:7370 },
  { id:'a359', name:'Airbus A350-900',         short:'A350',  category:'Commercial', subtype:'widebody',   maxPax:440, maxPayload:53.0, mtow:280, fuelBurn:6.4,  cruise:488, alt:'FL390', maxRange:8100 },
  { id:'b789', name:'Boeing 787-9',            short:'B789',  category:'Commercial', subtype:'widebody',   maxPax:296, maxPayload:52.0, mtow:254, fuelBurn:5.9,  cruise:485, alt:'FL400', maxRange:7565 },
  { id:'a339', name:'Airbus A330-900',         short:'A339',  category:'Commercial', subtype:'widebody',   maxPax:440, maxPayload:45.0, mtow:251, fuelBurn:6.1,  cruise:470, alt:'FL370', maxRange:7200 },
  { id:'a388', name:'Airbus A380-800',         short:'A380',  category:'Commercial', subtype:'superjumbo', maxPax:853, maxPayload:84.0, mtow:575, fuelBurn:12.0, cruise:488, alt:'FL360', maxRange:8000 },
  // Commercial — narrowbody
  { id:'a320', name:'Airbus A320neo',          short:'A320',  category:'Commercial', subtype:'narrowbody', maxPax:194, maxPayload:20.0, mtow:79,  fuelBurn:2.6,  cruise:447, alt:'FL370', maxRange:3500 },
  { id:'b738', name:'Boeing 737-800',          short:'B738',  category:'Commercial', subtype:'narrowbody', maxPax:189, maxPayload:20.0, mtow:79,  fuelBurn:2.7,  cruise:453, alt:'FL360', maxRange:2935 },
  // Private — ultra long range
  { id:'gl75', name:'Bombardier Global 7500',  short:'G7500', category:'Private',    subtype:'ultra long', maxPax:19,  maxPayload:2.5,  mtow:51,  fuelBurn:1.8,  cruise:516, alt:'FL430', maxRange:7700 },
  { id:'g700', name:'Gulfstream G700',         short:'G700',  category:'Private',    subtype:'ultra long', maxPax:19,  maxPayload:2.9,  mtow:48,  fuelBurn:1.8,  cruise:516, alt:'FL410', maxRange:7500 },
  { id:'g650', name:'Gulfstream G650',         short:'G650',  category:'Private',    subtype:'long range', maxPax:19,  maxPayload:2.8,  mtow:45,  fuelBurn:1.7,  cruise:488, alt:'FL410', maxRange:7000 },
  { id:'fa8x', name:'Dassault Falcon 8X',      short:'F8X',   category:'Private',    subtype:'long range', maxPax:16,  maxPayload:2.0,  mtow:33,  fuelBurn:1.4,  cruise:460, alt:'FL410', maxRange:6450 },
  { id:'citx', name:'Cessna Citation X',       short:'CIT-X', category:'Private',    subtype:'midsize',    maxPax:12,  maxPayload:1.0,  mtow:16,  fuelBurn:1.5,  cruise:528, alt:'FL450', maxRange:3460 },
  { id:'pc24', name:'Pilatus PC-24',           short:'PC24',  category:'Private',    subtype:'light jet',  maxPax:11,  maxPayload:1.1,  mtow:8,   fuelBurn:0.7,  cruise:425, alt:'FL450', maxRange:2000 },
];

export const ROUTE_COLORS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

export const COLOR_HEX = {
  r1: '#ffc857',
  r2: '#6dd3e7',
  r3: '#f78ca0',
  r4: '#a3e4a8',
  r5: '#c9a3e8',
  r6: '#f0a472',
};

export function searchAircraft(query) {
  if (!query || !query.trim()) return CATALOG.slice(0, 6);
  const q = query.toLowerCase().trim();
  return CATALOG
    .map(a => {
      let s = 0;
      if (a.short.toLowerCase().includes(q)) s += 30;
      if (a.name.toLowerCase().includes(q)) s += 20;
      if (a.category.toLowerCase().includes(q)) s += 10;
      if (a.subtype.toLowerCase().includes(q)) s += 5;
      return { a, s };
    })
    .filter(x => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, 8)
    .map(x => x.a);
}

/** Haversine great-circle distance in nautical miles */
export function gcDistanceNm(a, b) {
  const R = 3440.065;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Compute all derived values for one fleet entry */
export function computeAircraft(fleetEntry, legNm, CATALOG_ref) {
  const cat = (CATALOG_ref || CATALOG).find(c => c.id === fleetEntry.catId);
  if (!cat) return null;
  const paxTonnes = (fleetEntry.params.pax * 100) / 1000;
  const ratio = Math.min(1, (fleetEntry.params.payload + paxTonnes) / cat.maxPayload);
  const range = Math.round(cat.maxRange * (1 - 0.30 * ratio));
  const hours = legNm / cat.cruise;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const fuelT = cat.fuelBurn * hours;
  return {
    tone: fleetEntry.color,
    name: cat.name,
    short: cat.short,
    type: `${cat.category} · ${cat.subtype}`,
    pax: fleetEntry.params.pax,
    payload: fleetEntry.params.payload,
    maxPax: cat.maxPax,
    maxPayload: cat.maxPayload,
    weight: Math.round(cat.mtow * 0.7 + fleetEntry.params.payload + paxTonnes),
    time: `${h}h ${String(m).padStart(2, '0')}m`,
    timeHours: hours,
    fuel: `${Math.round(fuelT * 1000).toLocaleString('en-US').replace(/,/g, ' ')} kg`,
    fuelKg: fuelT * 1000,
    alt: cat.alt,
    dist: legNm,
    km: Math.round(legNm * 1.852),
    range,
    maxRange: cat.maxRange,
  };
}

/** Format nautical miles with thousands separator */
export function fmtNm(nm) {
  return nm.toLocaleString('en-US').replace(/,/g, ' ');
}
