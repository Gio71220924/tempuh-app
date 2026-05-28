const JSON_URL  = '/aircraft.json';
const LS_KEY    = 'tempuh_aircraft_v2'; // bumped: added oew + maxFuel fields
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days — specs rarely change

let _cache = null;

export async function loadAircraft() {
  if (_cache) return _cache;

  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const { ts, data } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL) {
        _cache = data;
        return _cache;
      }
    }
  } catch (_) {}

  const resp = await fetch(JSON_URL);
  if (!resp.ok) throw new Error('Failed to load aircraft data');
  _cache = await resp.json();

  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data: _cache }));
  } catch (_) {}

  return _cache;
}

export function searchAircraft(catalog, query) {
  if (!query || !query.trim()) return catalog.slice(0, 8);
  const q = query.toLowerCase().trim();
  return catalog
    .map(a => {
      let s = 0;
      if (a.short.toLowerCase().includes(q)) s += 30;
      if (a.name.toLowerCase().includes(q))  s += 20;
      if (a.category.toLowerCase().includes(q)) s += 10;
      if (a.subtype.toLowerCase().includes(q))  s += 5;
      return { a, s };
    })
    .filter(x => x.s > 0)
    .sort((x, y) => y.s - x.s)
    .slice(0, 8)
    .map(x => x.a);
}
