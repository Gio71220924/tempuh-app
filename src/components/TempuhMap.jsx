import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLOR_HEX } from '../data/catalog.js';

const TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const NM_TO_M   = 1852;

export default function TempuhMap({ origin, dest, aircraft, focused, showRanges, onAirportClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const layersRef    = useRef({ routes: [], rings: [], pins: [], labels: [], markers: [] });
  const animRef      = useRef({ raf: null, progress: 0 });
  const fitRef       = useRef({ raf: null, from: null, to: null });

  // ── Init Leaflet map once ──────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    if (containerRef.current._leaflet_id) return;

    const map = L.map(containerRef.current, {
      center: [20, 60],
      zoom: 4,
      minZoom: 3,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      worldCopyJump: false,
    });

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    const syncMapSize = () => {
      map.invalidateSize({ pan: false });
      if (fitRef.current.from && fitRef.current.to) {
        fitRouteToView(map, fitRef.current.from, fitRef.current.to, fitRef.current.extraBounds);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(fitRef.current.raf);
      fitRef.current.raf = requestAnimationFrame(syncMapSize);
    });

    resizeObserver.observe(containerRef.current);
    fitRef.current.raf = requestAnimationFrame(syncMapSize);

    const clampLatitude = () => {
      const center = map.getCenter();
      const lat = Math.max(-85, Math.min(85, center.lat));
      if (lat !== center.lat) {
        map.panTo([lat, center.lng], { animate: false });
      }
    };

    map.on('moveend', clampLatitude);
    map.on('zoomend', clampLatitude);

    return () => {
      cancelAnimationFrame(animRef.current.raf);
      cancelAnimationFrame(fitRef.current.raf);
      resizeObserver.disconnect();
      map.off('moveend', clampLatitude);
      map.off('zoomend', clampLatitude);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Redraw everything (routes, rings, pins) + fitBounds ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !origin || !dest) return;

    const layers = layersRef.current;

    // Clear old layers
    [...layers.routes, ...layers.rings, ...layers.pins, ...layers.labels, ...layers.markers]
      .forEach(l => { try { l.remove(); } catch (_) {} });
    layers.routes  = [];
    layers.rings   = [];
    layers.pins    = [];
    layers.labels  = [];
    layers.markers = [];

    cancelAnimationFrame(animRef.current.raf);

    const from = [origin.lat, origin.lng];
    const to   = [dest.lat,   dest.lng];

    // Draw overlays on 3 world copies (−360/0/+360) so they stay visible and
    // continuous when panning across the wrapped map — without worldCopyJump's
    // jarring view-snap. The copies follow the view (see onWorldPan), so you
    // can scroll any number of worlds without them running out.
    const COPIES = [0, -360, 360];
    let worldShift = 0;

    // ── Route polylines ──────────────────────────────────────────
    const markerData = [];
    const zoomHandlers = [];
    const basePts = geodesicPoints(from, to, 80);

    aircraft.forEach((a, idx) => {
      const color  = COLOR_HEX[a.tone] || '#fff';
      const dimmed = focused !== null && focused !== a.tone;

      COPIES.forEach(off => {
        const pts = off ? basePts.map(([la, ln]) => [la, ln + off]) : basePts;
        const poly = L.polyline(pts, {
          color,
          weight:    dimmed ? 1.2 : 2.5,
          opacity:   dimmed ? 0.2 : 0.85,
          dashArray: '6 5',
          lineCap:   'round',
        }).addTo(map);
        layers.routes.push(poly);
      });

      const initT   = (idx * 0.18) % 1;
      const basePt  = interpGeodesic(from, to, initT);
      const markers = COPIES.map(off => {
        const m = L.marker([basePt[0], basePt[1] + off], {
          icon:         makePlaneIcon(color),
          zIndexOffset: 500,
          interactive:  false,
          opacity:      dimmed ? 0.2 : 1,
        }).addTo(map);
        layers.markers.push(m);
        return m;
      });
      markerData.push({ markers, offsetT: initT });
    });

    // Range ring per aircraft, drawn on each world copy.
    if (showRanges) {
      aircraft.forEach(a => {
        if (!a.range || a.range <= 0) return;
        const color     = COLOR_HEX[a.tone] || '#fff';
        const isFocused  = focused === a.tone;
        const dimmed     = focused !== null && !isFocused;
        COPIES.forEach(off => {
          const ring = L.circle([from[0], from[1] + off], {
            radius:      a.range * NM_TO_M,
            color,
            weight:      isFocused ? 2.4 : 1.4,
            opacity:     dimmed ? 0.18 : (isFocused ? 0.9 : 0.62),
            fillOpacity: 0,
            dashArray:   '8 10',
            interactive: false,
          }).addTo(map);
          layers.rings.push(ring);
        });
      });
    }

    // ── Airport pins ─────────────────────────────────────────────
    [origin, dest].forEach(airport => {
      COPIES.forEach(off => {
        const pin = L.circleMarker([airport.lat, airport.lng + off], {
          radius: 7, color: '#e8eef2', weight: 2.5, fillColor: '#0d1620', fillOpacity: 1,
        })
          .bindTooltip(airportTooltipHtml(airport), {
            direction: 'top', offset: [0, -10], className: 'tempuh-tooltip', opacity: 1,
          })
          .on('click', () => onAirportClick?.(airport))
          .addTo(map);
        layers.pins.push(pin);

        const label = L.tooltip({
          permanent: true, direction: 'right', offset: [10, 0],
          className: 'tempuh-icao-label', interactive: false,
        }).setContent(airport.icao).setLatLng([airport.lat, airport.lng + off]);
        map.addLayer(label);
        layers.labels.push(label);
      });
    });

    // ── fitBounds — only when the route changes, not on loadout edits ─
    // Include the largest range ring so it fits in the initial view.
    let extraBounds = null;
    if (showRanges) {
      const maxR = aircraft.reduce((m, a) => (a.range > 0 ? Math.max(m, a.range) : m), 0);
      if (maxR > 0) extraBounds = rangeRingBounds(from, maxR);
    }
    fitRef.current.from = from;
    fitRef.current.to = to;
    fitRef.current.extraBounds = extraBounds;
    const routeKey = `${origin.icao}->${dest.icao}`;
    if (fitRef.current.routeKey !== routeKey) {
      fitRef.current.routeKey = routeKey;
      map.invalidateSize({ pan: false });
      fitRouteToView(map, from, to, extraBounds);
      cancelAnimationFrame(fitRef.current.raf);
      fitRef.current.raf = requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
        fitRouteToView(map, from, to, extraBounds);
      });
    }

    // Re-center the static overlays on whichever world copy the view is over,
    // so panning any distance keeps them visible (markers follow via worldShift).
    const onWorldPan = () => {
      const desired = Math.round(map.getCenter().lng / 360) * 360;
      const delta = desired - worldShift;
      if (!delta) return;
      worldShift = desired;
      const sh = ll => L.latLng(ll.lat, ll.lng + delta);
      layers.routes.forEach(pl => pl.setLatLngs(pl.getLatLngs().map(sh)));
      layers.rings.forEach(c => c.setLatLng(sh(c.getLatLng())));
      layers.pins.forEach(c => c.setLatLng(sh(c.getLatLng())));
      layers.labels.forEach(t => t.setLatLng(sh(t.getLatLng())));
    };
    map.on('move', onWorldPan);
    onWorldPan(); // align freshly-drawn overlays to the current world copy

    // ── Animation loop ────────────────────────────────────────────
    const PERIOD_MS = 28000;
    let lastTs = null;

    function animate(ts) {
      if (lastTs !== null) {
        animRef.current.progress = (animRef.current.progress + (ts - lastTs) / PERIOD_MS) % 1;
      }
      lastTs = ts;
      const p = animRef.current.progress;

      markerData.forEach(({ markers, offsetT }) => {
        const t   = (p + offsetT) % 1;
        const pt  = interpGeodesic(from, to, t);
        const pt2 = interpGeodesic(from, to, Math.min(t + 0.008, 0.999));
        const angle = Math.atan2(pt2[1] - pt[1], pt2[0] - pt[0]) * 180 / Math.PI;
        markers.forEach((m, ci) => {
          m.setLatLng([pt[0], pt[1] + COPIES[ci] + worldShift]);
          const icon = m.getElement()?.querySelector('svg');
          if (icon) icon.style.transform = `rotate(${angle}deg)`;
        });
      });

      animRef.current.raf = requestAnimationFrame(animate);
    }
    animRef.current.raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current.raf);
      map.off('move', onWorldPan);
      zoomHandlers.forEach(handler => map.off('zoomend', handler));
    };
  }, [origin?.icao, dest?.icao, aircraft, focused, showRanges]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0 }}
    />
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function fitRouteToView(map, from, to, extraBounds) {
  try {
    const bounds = L.latLngBounds(from, to);
    if (extraBounds) bounds.extend(extraBounds);
    map.fitBounds(bounds.pad(extraBounds ? 0.08 : 0.3), {
      animate: false,
      maxZoom: 6,
      paddingTopLeft: [360, 110],
      paddingBottomRight: [430, 260],
    });
  } catch (_) {}
}

// Approximate lat/lng bounding box of a geodesic range ring, so the initial
// view can be zoomed out far enough to contain it.
function rangeRingBounds([lat, lng], rangeNm) {
  const latDelta = rangeNm / 60;                       // 1° lat ≈ 60 nm
  const north = Math.min(85, lat + latDelta);
  const south = Math.max(-85, lat - latDelta);
  const cosLat = Math.cos(lat * Math.PI / 180);
  let lngDelta;
  if (latDelta >= 90 - Math.abs(lat) || cosLat < 0.1) {
    lngDelta = 180;                                    // ring reaches a pole → full width
  } else {
    const ratio = Math.sin(latDelta * Math.PI / 180) / cosLat;
    lngDelta = ratio >= 1 ? 180 : Math.asin(ratio) * 180 / Math.PI;
  }
  return L.latLngBounds([south, lng - lngDelta], [north, lng + lngDelta]);
}

function geodesicPoints(from, to, steps = 80) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(interpGeodesic(from, to, i / steps));
  // Unwrap longitudes so antimeridian-crossing routes don't draw across the whole map
  for (let i = 1; i < pts.length; i++) {
    while (pts[i][1] - pts[i-1][1] >  180) pts[i][1] -= 360;
    while (pts[i][1] - pts[i-1][1] < -180) pts[i][1] += 360;
  }
  return pts;
}

// Mercator latitude limit used to cap polar fills
const POLE_EDGE = 85;

function geodesicCircle(lat, lng, radiusNm, steps) {
  const d    = radiusNm / 3440.065;
  const latR = lat * Math.PI / 180;
  const lngR = lng * Math.PI / 180;
  const pts  = [];
  for (let i = 0; i <= steps; i++) {
    const brg    = (2 * Math.PI * i) / steps;
    const sinPhi = Math.max(-1, Math.min(1,
      Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(brg)
    ));
    const φ = Math.asin(sinPhi);
    const λ = lngR + Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(latR),
      Math.cos(d) - Math.sin(latR) * Math.sin(φ)
    );
    pts.push([φ * 180 / Math.PI, ((λ * 180 / Math.PI + 540) % 360) - 180]);
  }
  return pts;
}

function geodesicRingSegments(center, radiusNm, steps = 240) {
  const pts = geodesicCircleContinuous(center[0], center[1], radiusNm, steps);
  if (pts.length < 2) return [];
  return [pts];
}

function geodesicCircleContinuous(lat, lng, radiusNm, steps) {
  const d    = radiusNm / 3440.065;
  const latR = lat * Math.PI / 180;
  const lngR = lng * Math.PI / 180;
  const pts  = [];

  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const nextLatR = Math.asin(Math.max(-1, Math.min(1,
      Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(bearing)
    )));
    const nextLngR = lngR + Math.atan2(
      Math.sin(bearing) * Math.sin(d) * Math.cos(latR),
      Math.cos(d) - Math.sin(latR) * Math.sin(nextLatR)
    );

    const point = [nextLatR * 180 / Math.PI, nextLngR * 180 / Math.PI];
    point[1] = pts.length
      ? closestLngToRef(point[1], pts[pts.length - 1][1])
      : closestLngToRef(point[1], lng);
    pts.push(point);
  }

  return pts;
}

function closestLngToRef(lng, refLng) {
  let out = lng;
  while (out - refLng > 180) out -= 360;
  while (out - refLng < -180) out += 360;
  return out;
}

function splitRingAtAntimeridian(pts) {

  const segments = [];
  let current = [pts[0]];

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const delta = b[1] - a[1];

    if (Math.abs(delta) > 180) {
      const eastward = delta < 0;
      const aEdge = eastward ? 180 : -180;
      const bEdge = eastward ? -180 : 180;
      const bShift = eastward ? b[1] + 360 : b[1] - 360;
      const t = (aEdge - a[1]) / (bShift - a[1]);
      const edgeLat = a[0] + t * (b[0] - a[0]);

      current.push([edgeLat, aEdge]);
      segments.push(current);
      current = [[edgeLat, bEdge], b];
    } else {
      current.push(b);
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

/**
 * Returns the on-map polygon(s) for an aircraft's reach from `center`.
 * { polys: [[ [lat,lng], … ], …], reachable }
 *  - reachable=true  → polys enclose the in-range area
 *  - reachable=false → range exceeds a quarter-globe; polys enclose the small
 *    UNREACHABLE pocket near the antipode instead (clean to draw, reads as a gap)
 * Handles antimeridian crossings and pole-enclosing circles.
 */
function reachableArea(center, radiusNm, steps = 180) {
  let [lat, lng] = center;
  let r = radiusNm;
  let reachable = true;
  if (radiusNm > 5400) {                 // > 90°: use antipode complement
    lat = -lat;
    lng = lng > 0 ? lng - 180 : lng + 180;
    r   = 10800 - radiusNm;
    reachable = false;
  }

  const rDeg      = r / 60;
  const enclosesN = rDeg > 90 - lat;
  const enclosesS = rDeg > 90 + lat;
  const pts       = geodesicCircle(lat, lng, r, steps);

  // Pole-enclosing: boundary is single-valued per longitude → sort by lng,
  // then cap along the top/bottom map edge.
  if (enclosesN || enclosesS) {
    const body = pts.slice(0, -1).sort((a, b) => a[1] - b[1]);
    const edge = enclosesN ? POLE_EDGE : -POLE_EDGE;
    return { polys: [[[edge, -180], ...body, [edge, 180]]], reachable };
  }

  // Otherwise cut the loop at antimeridian crossings; each piece closes
  // along the date line. Start away from ±180 to avoid a wrap seam.
  let arr = pts;
  let cIdx = 0, best = Infinity;
  for (let i = 0; i < arr.length - 1; i++) {
    const dist = Math.abs(((arr[i][1] - lng + 540) % 360) - 180);
    if (dist < best) { best = dist; cIdx = i; }
  }
  arr = [...arr.slice(cIdx), ...arr.slice(1, cIdx + 1)];

  const polys = [];
  let cur = [arr[0]];
  for (let i = 1; i < arr.length; i++) {
    const a = arr[i - 1], b = arr[i];
    if (Math.abs(b[1] - a[1]) > 180) {
      const eastward = b[1] < a[1];
      const aEdge = eastward ? 180 : -180;
      const bEdge = eastward ? -180 : 180;
      const bShift = eastward ? b[1] + 360 : b[1] - 360;
      const t = (aEdge - a[1]) / (bShift - a[1]);
      const latE = a[0] + t * (b[0] - a[0]);
      cur.push([latE, aEdge]);
      polys.push(cur);
      cur = [[latE, bEdge], b];
    } else {
      cur.push(b);
    }
  }
  polys.push(cur);
  if (polys.length > 1) {
    polys[0] = [...polys[polys.length - 1], ...polys[0].slice(1)];
    polys.pop();
  }
  return { polys, reachable };
}

function interpGeodesic([lat1, lng1], [lat2, lng2], t) {
  const R  = Math.PI / 180, D = 180 / Math.PI;
  const φ1 = lat1*R, λ1 = lng1*R, φ2 = lat2*R, λ2 = lng2*R;
  const x1 = Math.cos(φ1)*Math.cos(λ1), y1 = Math.cos(φ1)*Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2)*Math.cos(λ2), y2 = Math.cos(φ2)*Math.sin(λ2), z2 = Math.sin(φ2);
  const dot = Math.min(1, Math.max(-1, x1*x2 + y1*y2 + z1*z2));
  const ω = Math.acos(dot);
  if (Math.abs(ω) < 1e-10) return [lat1, lng1];
  const s = Math.sin(ω);
  const a = Math.sin((1-t)*ω)/s, b = Math.sin(t*ω)/s;
  return [(Math.asin(a*z1 + b*z2))*D, (Math.atan2(a*y1 + b*y2, a*x1 + b*x2))*D];
}

function makePlaneIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-12 -12 24 24" style="display:block">
    <circle r="10" fill="${color}" fill-opacity="0.18"/>
    <path d="M -7 0 L 5 -2.5 L 7 0 L 5 2.5 Z M -2 0 L -2 -4 L 1 -1.5 M -2 0 L -2 4 L 1 1.5"
          fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.5"/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
}

function airportTooltipHtml(a) {
  return `<div class="ap-tip">
    <div class="ap-tip-head"><span class="ap-tip-icao">${a.icao}</span><span class="ap-tip-iata">${a.iata}</span></div>
    <div class="ap-tip-name">${a.name}</div>
    <div class="ap-tip-city">${a.city} · ${a.country}</div>
    ${a.elev != null ? `<div class="ap-tip-meta">↑ ${a.elev} m elev</div>` : ''}
  </div>`;
}
