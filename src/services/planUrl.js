// Plan ⇄ URL codec
// ----------------
// A plan (route + fleet) is encoded into a compact, human-readable URL hash so
// it can be shared, bookmarked, and restored on reload. The same encoded string
// is mirrored to localStorage so a plain reload (no hash) restores the last
// session.
//
// Format:  #WIII-WSSS;b77w:396:12,g650:14:1,a359:315:10
//             └─route─┘ └──── fleet: catId:pax:payload ────┘
//
// Airports are stored as ICAO only (every origin/dest is a real airport from the
// loaded catalogue) and resolved back to full objects on decode.

import { ROUTE_COLORS } from '../data/catalog.js';

const LS_KEY = 'tempuh_plan'; // revives the previously write-only key

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = v => Math.round(v * 10) / 10;

/** Encode a plan into a URL fragment (no leading '#'). */
export function encodePlan({ origin, dest, fleet }) {
  const route = `${origin.icao}-${dest.icao}`;
  const f = fleet
    .map(e => `${e.catId}:${e.params.pax}:${e.params.payload}`)
    .join(',');
  return `${route};${f}`;
}

/**
 * Decode a fragment back into a plan, resolving ICAO → airport and validating
 * each aircraft against the catalogue. Returns null when the route can't be
 * resolved; silently skips malformed/unknown fleet entries and clamps loads.
 */
export function decodePlan(frag, airports, catalog) {
  if (!frag) return null;
  let clean = frag.replace(/^#/, '').trim();
  if (!clean) return null;
  // Tolerate a browser/proxy that percent-encoded the fragment; no-op otherwise.
  try { clean = decodeURIComponent(clean); } catch (_) { /* keep literal */ }

  const semi = clean.indexOf(';');
  const routePart = semi === -1 ? clean : clean.slice(0, semi);
  const fleetPart = semi === -1 ? '' : clean.slice(semi + 1);

  // ── route ──
  const dash = routePart.indexOf('-');
  if (dash === -1) return null;
  const oIcao = routePart.slice(0, dash).toUpperCase();
  const dIcao = routePart.slice(dash + 1).toUpperCase();
  const origin = airports.find(a => a.icao === oIcao);
  const dest   = airports.find(a => a.icao === dIcao);
  if (!origin || !dest) return null;

  // ── fleet ──
  const fleet = [];
  if (fleetPart) {
    for (const entry of fleetPart.split(',')) {
      if (fleet.length >= ROUTE_COLORS.length) break;
      const [catId, paxS, payS] = entry.split(':');
      const cat = catalog.find(c => c.id === catId);
      if (!cat) continue;
      const pax = clamp(Math.round(Number(paxS)) || 0, 0, cat.maxPax || 0);
      const payload = clamp(round1(Number(payS) || 0), 0, cat.maxPayload || 0);
      fleet.push({ color: ROUTE_COLORS[fleet.length], catId, params: { pax, payload } });
    }
  }

  return { origin, dest, fleet };
}

/**
 * Resolve the plan to load on startup: URL hash first, then the last session
 * from localStorage, else null (caller falls back to its own defaults).
 */
export function readInitialPlan(rawHash, airports, catalog) {
  const fromHash = decodePlan(rawHash, airports, catalog);
  if (fromHash) return fromHash;

  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const fromLS = decodePlan(stored, airports, catalog);
      if (fromLS) return fromLS;
    }
  } catch (_) { /* localStorage unavailable */ }

  return null;
}

/** Mirror the current plan to localStorage (same encoding as the URL). */
export function savePlanLocal(plan) {
  try { localStorage.setItem(LS_KEY, encodePlan(plan)); } catch (_) { /* full/blocked */ }
}
