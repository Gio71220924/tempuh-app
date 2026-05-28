const CSV_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const LS_KEY  = 'tempuh_airports_v1';
// Cache expires after 7 days so data stays reasonably fresh
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VALID_TYPES = new Set(['large_airport', 'medium_airport']);

function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const airports = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields with commas inside
    const fields = [];
    let inQuote = false;
    let current = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { fields.push(current); current = ''; }
      else { current += ch; }
    }
    fields.push(current);

    const row = {};
    headers.forEach((h, idx) => { row[h] = (fields[idx] || '').trim(); });

    if (!VALID_TYPES.has(row.type)) continue;
    const lat = parseFloat(row.latitude_deg);
    const lng = parseFloat(row.longitude_deg);
    const elev = parseInt(row.elevation_ft, 10) || 0;
    if (isNaN(lat) || isNaN(lng)) continue;
    const icao = (row.gps_code || row.ident || '').replace(/"/g, '').trim();
    const iata = (row.iata_code || '').replace(/"/g, '').trim();
    if (!icao) continue;

    airports.push({
      icao,
      iata: iata || icao,
      name: row.name.replace(/"/g, ''),
      city: (row.municipality || '').replace(/"/g, '') || row.name.replace(/"/g, ''),
      country: (row.iso_country || '').replace(/"/g, ''),
      lat,
      lng,
      elev: Math.round(elev * 0.3048), // ft → m
      type: row.type,
    });
  }

  return airports;
}

let _cache = null;

export async function loadAirports() {
  if (_cache) return _cache;

  // Try localStorage first
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const { ts, data } = JSON.parse(stored);
      if (Date.now() - ts < CACHE_TTL_MS) {
        _cache = data;
        return _cache;
      }
    }
  } catch (_) { /* ignore parse errors */ }

  // Fetch from OurAirports
  const resp = await fetch(CSV_URL);
  if (!resp.ok) throw new Error('Failed to load airport data');
  const text = await resp.text();
  _cache = parseCSV(text);

  // Persist to localStorage for next visit
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now(), data: _cache }));
  } catch (_) { /* storage full — skip */ }

  return _cache;
}

export function searchAirports(airports, query) {
  if (!query || !query.trim()) return airports.slice(0, 10);
  const q = query.toLowerCase().trim();
  return airports
    .map(a => {
      let score = 0;
      if (a.icao.toLowerCase() === q) score += 100;
      else if (a.icao.toLowerCase().startsWith(q)) score += 50;
      if (a.iata.toLowerCase() === q) score += 90;
      else if (a.iata.toLowerCase().startsWith(q)) score += 45;
      if (a.city.toLowerCase().startsWith(q)) score += 30;
      else if (a.city.toLowerCase().includes(q)) score += 10;
      if (a.name.toLowerCase().includes(q)) score += 5;
      if (a.country.toLowerCase() === q) score += 15;
      return { a, score };
    })
    .filter(x => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 10)
    .map(x => x.a);
}
