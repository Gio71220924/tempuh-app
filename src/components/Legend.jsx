import { COLOR_HEX } from '../data/catalog.js';

export default function Legend({ aircraft, focused, onFocus }) {
  if (!aircraft.length) return null;
  return (
    <div className="map-legend">
      <span className="legend-label">routes</span>
      {aircraft.map(a => {
        const dim = focused !== null && focused !== a.tone;
        return (
          <button
            key={a.tone}
            className={`legend-item${dim ? ' dim' : ''}${focused === a.tone ? ' on' : ''}`}
            onClick={() => onFocus(focused === a.tone ? null : a.tone)}
            title={a.name}
          >
            <span className="legend-dot" style={{ background: COLOR_HEX[a.tone] }} />
            {a.short}
          </button>
        );
      })}
    </div>
  );
}
