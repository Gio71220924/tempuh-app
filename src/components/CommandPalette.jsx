import { useEffect, useRef } from 'react';
import { searchAirports } from '../services/airports.js';
import { searchAircraft } from '../data/catalog.js';

export default function CommandPalette({
  mode,          // 'from' | 'to' | 'aircraft'
  query,
  setQuery,
  airports,
  fleet,
  onClose,
  onPickAirport,
  onPickAircraft,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isAircraft = mode === 'aircraft';
  const title = mode === 'from' ? 'Choose origin' : mode === 'to' ? 'Choose destination' : 'Add aircraft';
  const placeholder = isAircraft ? 'B777, gulfstream, G650…' : 'WIII, jakarta, CDG, london…';
  const hint = isAircraft
    ? 'Type model name, category, or short code'
    : 'Type city, ICAO (e.g. KJFK) or IATA (e.g. JFK)';

  const usedIds = new Set(fleet.map(f => f.catId));
  const results = isAircraft
    ? searchAircraft(query)
    : searchAirports(airports, query);

  const handleSelect = (item) => {
    if (isAircraft) {
      if (!usedIds.has(item.id)) onPickAircraft(item);
    } else {
      onPickAirport(item);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">{title}</div>
          <span className="kbd">⌘ K</span>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>{hint}</p>

        <div className="palette-input-wrap">
          <span style={{ color: 'var(--ink-faint)', fontSize: 16 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        </div>

        <div className="palette-results">
          {results.length === 0 && (
            <div className="palette-item" style={{ cursor: 'default', color: 'var(--ink-faint)', fontSize: 13 }}>
              No matches found
            </div>
          )}
          {isAircraft
            ? results.map(a => {
                const used = usedIds.has(a.id);
                return (
                  <div
                    key={a.id}
                    className={`palette-item${used ? ' disabled' : ''}`}
                    onClick={() => handleSelect(a)}
                  >
                    <span className="p-code">{a.short}</span>
                    <span className="p-name">{a.name}</span>
                    <span className="p-meta">{a.category} · {a.subtype}{used ? ' · added' : ''}</span>
                  </div>
                );
              })
            : results.map(a => (
                <div key={a.icao} className="palette-item" onClick={() => handleSelect(a)}>
                  <span className="p-code">{a.icao}</span>
                  <span className="p-name">{a.name}</span>
                  <span className="p-meta">{a.city} · {a.country}</span>
                </div>
              ))
          }
        </div>

        <div className="palette-hint">
          <span className="kbd">↵</span> select
          <span className="kbd">esc</span> close
          <span style={{ marginLeft: 'auto' }}>
            {results.length} {isAircraft ? 'aircraft' : 'airports'}
          </span>
        </div>
      </div>
    </div>
  );
}
