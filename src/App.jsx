import { useState, useEffect, useCallback } from 'react';
import TempuhMap from './components/TempuhMap.jsx';
import TopBar from './components/TopBar.jsx';
import LeftDock from './components/LeftDock.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import ComparisonCard from './components/ComparisonCard.jsx';
import PrintBrief from './components/PrintBrief.jsx';
import { loadAirports } from './services/airports.js';
import { loadAircraft } from './services/aircraft.js';
import { ROUTE_COLORS, computeAircraft, gcDistanceNm } from './data/catalog.js';
import './components/map.css';
import './components/ui.css';

// Default airports for first load (WIII → OMDB)
const DEFAULT_ORIGIN = { icao:'WIII', iata:'CGK', name:'Soekarno-Hatta', city:'Jakarta',  country:'ID', lat:-6.13, lng:106.66, elev:34 };
const DEFAULT_DEST   = { icao:'WSSS', iata:'SIN', name:'Singapore Changi', city:'Singapore', country:'SG', lat:1.3592, lng:103.9894, elev:7 };

const DEFAULT_FLEET = [
  { color:'r1', catId:'b77w', params:{ pax:396, payload:12 } },
  { color:'r2', catId:'g650', params:{ pax:14,  payload:1.0 } },
  { color:'r3', catId:'a359', params:{ pax:315, payload:10 } },
  { color:'r4', catId:'gl75', params:{ pax:15,  payload:1.0 } },
];

export default function App() {
  const [airports,  setAirports]  = useState([]);
  const [catalog,   setCatalog]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState(null);

  const [origin,    setOrigin]    = useState(DEFAULT_ORIGIN);
  const [dest,      setDest]      = useState(DEFAULT_DEST);
  const [fleet,     setFleet]     = useState(DEFAULT_FLEET);
  const [focused,   setFocused]   = useState(null);
  const [showRanges, setShowRanges] = useState(true);
  const [panelsOpen, setPanelsOpen] = useState(true);

  const [palette,   setPalette]   = useState(null); // null | 'from' | 'to' | 'aircraft'
  const [palQuery,  setPalQuery]  = useState('');

  // ── Load airports + aircraft catalog in parallel ───────────────
  useEffect(() => {
    Promise.all([loadAirports(), loadAircraft()])
      .then(([ap, ac]) => { setAirports(ap); setCatalog(ac); setLoading(false); })
      .catch(err => { setLoadErr(err.message); setLoading(false); });
  }, []);

  // ── ⌘K keyboard shortcut ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => p ? null : 'aircraft');
        setPalQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Derived values ─────────────────────────────────────────────
  const legNm   = gcDistanceNm(origin, dest);
  const aircraft = fleet.map(f => computeAircraft(f, legNm, catalog)).filter(Boolean);

  // ── Handlers ───────────────────────────────────────────────────
  const openPalette = useCallback((mode) => {
    setPalette(mode);
    setPalQuery('');
  }, []);

  const closePalette = useCallback(() => setPalette(null), []);

  const pickAirport = useCallback((airport) => {
    if (palette === 'from') setOrigin(airport);
    if (palette === 'to')   setDest(airport);
    setPalette(null);
  }, [palette]);

  const pickAircraft = useCallback((cat) => {
    const used = new Set(fleet.map(f => f.color));
    const free = ROUTE_COLORS.find(c => !used.has(c));
    if (!free) return;
    // Default to a typical load: most seats filled + light belly cargo,
    // not the structural max payload (which would overload the jet).
    setFleet(prev => [...prev, {
      color: free,
      catId: cat.id,
      params: { pax: Math.round(cat.maxPax * 0.85), payload: +(cat.maxPayload * 0.15).toFixed(1) },
    }]);
    setPalette(null);
  }, [fleet]);

  const removeAircraft = useCallback((tone) => {
    setFleet(prev => prev.filter(f => f.color !== tone));
    setFocused(prev => prev === tone ? null : prev);
  }, []);

  const swapRoute = () => {
    setOrigin(dest);
    setDest(origin);
  };

  const handleSave = () => {
    localStorage.setItem('tempuh_plan', JSON.stringify({ origin, dest, fleet }));
    alert('Plan saved to local storage.');
  };

  // ── Loading / error states ─────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
        <svg width="40" height="40" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--r1)" strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.85" />
          <g transform="translate(16, 17.5) rotate(-8)">
            <path d="M -9 -7 L 9 -7 L 7 -4.5 L -7 -4.5 Z" fill="var(--ink)" />
            <path d="M -2 -7 L 2 -7 L 1.5 8 L -1.5 8 Z" fill="var(--ink)" />
            <circle cx="0" cy="-7.5" r="1.6" fill="var(--r1)" />
          </g>
        </svg>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-dim)' }}>
          Loading airport &amp; aircraft database…
        </div>
      </div>
    );
  }

  if (loadErr) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
        <div style={{ color: '#f78ca0', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Failed to load: {loadErr}</div>
        <button className="btn" onClick={() => window.location.reload()}>retry</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {/* Map layer */}
      <TempuhMap
        origin={origin}
        dest={dest}
        aircraft={aircraft}
        focused={focused}
        setFocused={setFocused}
        showRanges={showRanges}
        airports={airports}
        onAirportClick={(airport) => {
          openPalette(airport.icao === origin.icao ? 'from' : 'to');
        }}
        onSetOrigin={setOrigin}
        onSetDest={setDest}
      />

      {/* Brand — top left */}
      {panelsOpen && (
      <div style={{
        position: 'absolute', top: 18, left: 18, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
      }}>
        <svg width="28" height="28" viewBox="0 0 32 32" style={{ display: 'block' }}>
          <circle cx="16" cy="16" r="14" fill="none" stroke="var(--r1)" strokeWidth="1.2" strokeDasharray="2.5 2" opacity="0.85" />
          <g transform="translate(16, 17.5) rotate(-8)">
            <path d="M -9 -7 L 9 -7 L 7 -4.5 L -7 -4.5 Z" fill="var(--ink)" />
            <path d="M -2 -7 L 2 -7 L 1.5 8 L -1.5 8 Z" fill="var(--ink)" />
            <circle cx="0" cy="-7.5" r="1.6" fill="var(--r1)" />
          </g>
        </svg>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontFamily: 'var(--font-hand)', fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            tempuh
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 8, color: 'var(--ink-faint)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2, fontWeight: 500 }}>
            flight range · v0.1
          </div>
        </div>
      </div>
      )}

      {/* Top bar */}
      {panelsOpen && (
      <TopBar
        origin={origin}
        dest={dest}
        legNm={legNm}
        onFromClick={() => openPalette('from')}
        onToClick={() => openPalette('to')}
        onSwap={swapRoute}
      />
      )}

      {/* Map controls (top-right, below Leaflet zoom) */}
      <div className="map-controls" style={{ top: 80 }}>
        <button
          className={`ctrl-btn${panelsOpen ? '' : ' active'}`}
          title={panelsOpen ? 'Hide panels — full map' : 'Show panels'}
          onClick={() => setPanelsOpen(o => !o)}
        >{panelsOpen ? '⤢' : '⤡'}</button>
        <button
          className={`ctrl-btn${showRanges ? ' active' : ''}`}
          title="Toggle range rings"
          onClick={() => setShowRanges(s => !s)}
        >◯</button>
        <button
          className="ctrl-btn"
          title="Print briefing"
          onClick={() => window.print()}
        >⎙</button>
      </div>

      {/* Left dock */}
      {panelsOpen && (
      <LeftDock
        origin={origin}
        dest={dest}
        fleet={fleet}
        aircraft={aircraft}
        focused={focused}
        legNm={legNm}
        onFromClick={() => openPalette('from')}
        onToClick={() => openPalette('to')}
        onFocus={setFocused}
        onFleetUpdate={setFleet}
        onRemoveAircraft={removeAircraft}
        onAddClick={() => openPalette('aircraft')}
      />
      )}

      {/* Comparison card (bottom-right) */}
      {panelsOpen && (
      <ComparisonCard
        aircraft={aircraft}
        legNm={legNm}
        onPrint={() => window.print()}
        onSave={handleSave}
      />
      )}

      {/* Command palette */}
      {palette && (
        <CommandPalette
          mode={palette}
          query={palQuery}
          setQuery={setPalQuery}
          airports={airports}
          catalog={catalog}
          fleet={fleet}
          onClose={closePalette}
          onPickAirport={pickAirport}
          onPickAircraft={pickAircraft}
        />
      )}

      {/* Print briefing (hidden on screen) */}
      <PrintBrief
        origin={origin}
        dest={dest}
        legNm={legNm}
        aircraft={aircraft}
      />
    </div>
  );
}
