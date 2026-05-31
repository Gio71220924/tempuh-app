import { useState } from 'react';
import { fmtNm } from '../data/catalog.js';

export default function ComparisonCard({ aircraft, legNm, onPrint, onShare }) {
  const [sortBy, setSortBy] = useState('range');
  const [copied, setCopied] = useState(false);

  if (!aircraft.length) return null;

  const sorted = [...aircraft].sort((a, b) => {
    if (sortBy === 'time') return a.timeHours - b.timeHours;
    if (sortBy === 'fuel') return a.fuelKg - b.fuelKg;
    return (a.dist / a.range) - (b.dist / b.range);
  });

  const best = sorted[0];
  const bestLabel = sortBy === 'range'
    ? <>most headroom · <span style={{ color: `var(--${best.tone})` }}>{best.short}</span></>
    : sortBy === 'time'
    ? <>fastest · <span style={{ color: `var(--${best.tone})` }}>{best.short}</span></>
    : <>least fuel · <span style={{ color: `var(--${best.tone})` }}>{best.short}</span></>;

  const cardTitle = sortBy === 'range' ? 'Range usage' : sortBy === 'time' ? 'Flight time' : 'Fuel burn';
  const cardSub = sortBy === 'range'
    ? `${fmtNm(legNm)} nm leg vs each aircraft's max range`
    : sortBy === 'time' ? 'sorted by flight time · fastest first'
    : 'sorted by fuel burn · most efficient first';

  return (
    <div className="card result-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <div className="card-title">{cardTitle}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>SORT</span>
          <div className="segment">
            {['range', 'time', 'fuel'].map(k => (
              <button key={k} className={`seg${sortBy === k ? ' active' : ''}`} onClick={() => setSortBy(k)}>{k}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="card-sub">{cardSub}</p>

      {sorted.map(a => {
        const pct = Math.round((a.dist / a.range) * 100);
        const overflow = pct > 100;
        const color = `var(--${a.tone})`;
        return (
          <div key={a.tone} style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span className={`swatch sw${a.tone[1]}`} />
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{a.short}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
                {sortBy === 'range' ? `${fmtNm(a.range)} nm max` : a.alt}
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'nowrap', color: overflow ? '#f78ca0' : 'var(--ink)', fontWeight: 600 }}>
                {sortBy === 'time'
                  ? a.time
                  : sortBy === 'fuel'
                  ? a.fuel
                  : <>{pct}<span style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 400 }}>%</span></>
                }
              </span>
            </div>
            <div className="mini-bar">
              <div
                className="mini-bar-fill"
                style={{ width: `${Math.min(pct, 100)}%`, background: overflow ? '#f78ca0' : color }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>
              <span>⏱ {a.time}</span>
              <span>⛽ {a.fuel}</span>
              <span>↑ {a.alt}</span>
            </div>
          </div>
        );
      })}

      <div className="divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--ink-faint)' }}>{bestLabel}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onPrint}>print</button>
          <button
            className="btn primary"
            style={{ padding: '4px 12px', fontSize: 11 }}
            title="Copy a shareable link to this plan"
            onClick={async () => {
              const ok = await onShare();
              if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
            }}
          >{copied ? 'link copied ✓' : 'share'}</button>
        </div>
      </div>
    </div>
  );
}
