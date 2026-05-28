import { fmtNm } from '../data/catalog.js';

export default function TopBar({ origin, dest, legNm, onFromClick, onToClick, onSwap }) {
  const legKm = Math.round(legNm * 1.852);
  return (
    <div className="card top-bar">
      <div className="top-bar-inner">
        <button className="airport-pill" onClick={onFromClick}>
          {origin.icao} <span className="city">{origin.city}</span>
        </button>

        <button
          className="btn"
          style={{ padding: '4px 8px', fontSize: 13, minWidth: 0 }}
          onClick={onSwap}
          title="Swap origin & destination"
        >⇄</button>

        <button className="airport-pill" onClick={onToClick}>
          {dest.icao} <span className="city">{dest.city}</span>
        </button>

        <div style={{
          marginLeft: 12, paddingLeft: 12,
          borderLeft: '1px solid var(--stroke-dim)',
          display: 'flex', alignItems: 'baseline', gap: 5,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--r1)', fontWeight: 600 }}>
            {fmtNm(legNm)}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-dim)' }}>nm</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            · {fmtNm(legKm)} km
          </span>
        </div>
      </div>
    </div>
  );
}
