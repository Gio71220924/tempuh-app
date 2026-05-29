export const ROUTE_COLORS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

export const COLOR_HEX = {
  r1: '#ffc857',
  r2: '#6dd3e7',
  r3: '#f78ca0',
  r4: '#a3e4a8',
  r5: '#c9a3e8',
  r6: '#f0a472',
};

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
export function computeAircraft(fleetEntry, legNm, catalog) {
  const cat = catalog.find(c => c.id === fleetEntry.catId);
  if (!cat) return null;
  if (!cat.oew || !cat.maxFuel) return null;
  const paxTonnes = (fleetEntry.params.pax * 100) / 1000;
  const totalPayload = fleetEntry.params.payload + paxTonnes;
  // Calibrated payload-range curve, tied to the published max range:
  //  - below the design payload knee, tanks are full → range = maxRange
  //  - above it, payload displaces fuel → range scales with fuel remaining
  const knee = Math.max(0, cat.mtow - cat.oew - cat.maxFuel);
  let range;
  if (totalPayload <= knee) {
    range = cat.maxRange;
  } else {
    const fuel = Math.max(0, cat.mtow - cat.oew - totalPayload);
    range = Math.round(cat.maxRange * fuel / cat.maxFuel);
  }
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
    curve: payloadRangeCurve(cat),
  };
}

/**
 * Returns key points of the 3-segment payload-range curve for a given aircraft.
 * Used to draw the mini SVG chart in the aircraft card.
 */
export function payloadRangeCurve(cat) {
  // Calibrated to the published max range (see computeAircraft):
  // flat at maxRange until the design-payload knee, then declines as payload
  // displaces fuel, down to the structural max payload.
  const knee1Payload = Math.max(0, cat.mtow - cat.oew - cat.maxFuel);
  const knee2Payload = cat.maxPayload;
  const ferryRange   = cat.maxRange;
  const fuelAtMax    = Math.max(0, cat.mtow - cat.oew - knee2Payload);
  const rangeAtMax   = Math.round(cat.maxRange * fuelAtMax / cat.maxFuel);
  return { knee1Payload, knee2Payload, ferryRange, rangeAtMax };
}

/** Format nautical miles with thousands separator */
export function fmtNm(nm) {
  return nm.toLocaleString('en-US').replace(/,/g, ' ');
}
