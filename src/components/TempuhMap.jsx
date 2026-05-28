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
      worldCopyJump: true,
      maxBounds: [[-85, -Infinity], [85, Infinity]],
      maxBoundsViscosity: 1,
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
        fitRouteToView(map, fitRef.current.from, fitRef.current.to);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(fitRef.current.raf);
      fitRef.current.raf = requestAnimationFrame(syncMapSize);
    });

    resizeObserver.observe(containerRef.current);
    fitRef.current.raf = requestAnimationFrame(syncMapSize);

    return () => {
      cancelAnimationFrame(animRef.current.raf);
      cancelAnimationFrame(fitRef.current.raf);
      resizeObserver.disconnect();
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

    // ── Route polylines ──────────────────────────────────────────
    const markerData = [];
    const zoomHandlers = [];

    aircraft.forEach((a, idx) => {
      const color  = COLOR_HEX[a.tone] || '#fff';
      const dimmed = focused !== null && focused !== a.tone;

      const poly = L.polyline(geodesicPoints(from, to, 80), {
        color,
        weight:    dimmed ? 1.2 : 2.5,
        opacity:   dimmed ? 0.2 : 0.85,
        dashArray: '6 5',
        lineCap:   'round',
      }).addTo(map);
      layers.routes.push(poly);

      const initT  = (idx * 0.18) % 1;
      const marker = L.marker(interpGeodesic(from, to, initT), {
        icon:         makePlaneIcon(color),
        zIndexOffset: 500,
        interactive:  false,
        opacity:      dimmed ? 0.2 : 1,
      }).addTo(map);
      layers.markers.push(marker);
      markerData.push({ marker, offset: initT });
    });

    // ── Range rings (only visible at zoom ≥ 4) ──────────────────
    if (showRanges) {
      aircraft.forEach(a => {
        const color     = COLOR_HEX[a.tone] || '#fff';
        const isFocused = focused === a.tone;
        const ring = L.circle(from, {
          radius:      a.range * NM_TO_M,
          color,
          weight:      isFocused ? 2.4 : 1.4,
          opacity:     isFocused ? 0.9 : 0.62,
          fillOpacity: isFocused ? 0.035 : 0,
          dashArray:   '8 10',
          interactive: false,
        }).addTo(map);
        layers.rings.push(ring);

        // Hide rings when zoomed out too far
        const hideRings = () => {
          ring.setStyle({
            opacity: map.getZoom() >= 3 ? (isFocused ? 0.9 : 0.62) : 0,
            fillOpacity: map.getZoom() >= 3 && isFocused ? 0.035 : 0,
          });
        };
        map.on('zoomend', hideRings);
        zoomHandlers.push(hideRings);
        hideRings();
      });
    }

    // ── Airport pins ─────────────────────────────────────────────
    [origin, dest].forEach(airport => {
      const pin = L.circleMarker([airport.lat, airport.lng], {
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
      }).setContent(airport.icao).setLatLng([airport.lat, airport.lng]);
      map.addLayer(label);
      layers.labels.push(label);
    });

    // ── fitBounds — run after layers are added ───────────────────
    fitRef.current.from = from;
    fitRef.current.to = to;
    map.invalidateSize({ pan: false });
    fitRouteToView(map, from, to);
    cancelAnimationFrame(fitRef.current.raf);
    fitRef.current.raf = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
      fitRouteToView(map, from, to);
    });

    // ── Animation loop ────────────────────────────────────────────
    const PERIOD_MS = 28000;
    let lastTs = null;

    function animate(ts) {
      if (lastTs !== null) {
        animRef.current.progress = (animRef.current.progress + (ts - lastTs) / PERIOD_MS) % 1;
      }
      lastTs = ts;
      const p = animRef.current.progress;

      markerData.forEach(({ marker, offset }) => {
        const t   = (p + offset) % 1;
        const pt  = interpGeodesic(from, to, t);
        const pt2 = interpGeodesic(from, to, Math.min(t + 0.008, 0.999));
        marker.setLatLng(pt);
        const icon = marker.getElement()?.querySelector('svg');
        if (icon) {
          const angle = Math.atan2(pt2[1] - pt[1], pt2[0] - pt[0]) * 180 / Math.PI;
          icon.style.transform = `rotate(${angle}deg)`;
        }
      });

      animRef.current.raf = requestAnimationFrame(animate);
    }
    animRef.current.raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current.raf);
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

function fitRouteToView(map, from, to) {
  try {
    const bounds = L.latLngBounds(from, to).pad(0.3);
    map.fitBounds(bounds, {
      animate: false,
      maxZoom: 6,
      paddingTopLeft: [360, 110],
      paddingBottomRight: [430, 260],
    });
  } catch (_) {}
}

function geodesicPoints(from, to, steps = 80) {
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(interpGeodesic(from, to, i / steps));
  return pts;
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
