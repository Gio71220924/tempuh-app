import { fmtNm, COLOR_HEX } from '../data/catalog.js';

export default function PrintBrief({ origin, dest, legNm, aircraft }) {
  const legKm = Math.round(legNm * 1.852);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const inRange    = aircraft.filter(a => a.range >= a.dist);
  const recommended = [...inRange].sort((a, b) => (a.dist / a.range) - (b.dist / b.range))[0];
  const fastest     = [...inRange].sort((a, b) => a.timeHours - b.timeHours)[0];
  const leastFuel   = [...inRange].sort((a, b) => a.fuelKg - b.fuelKg)[0];

  const mono = 'IBM Plex Mono, monospace';
  const sans = 'IBM Plex Sans, sans-serif';

  return (
    <div className="print-brief">
      <header style={{ borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: sans, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>TEMPUH</h1>
              <div style={{ fontFamily: sans, fontSize: 9, color: '#666', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3 }}>flight range briefing</div>
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#555' }}>generated {today}</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, marginBottom: 18, padding: '14px 0', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Origin</div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600 }}>{origin.icao} <span style={{ fontSize: 13, color: '#666' }}>{origin.iata}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{origin.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{origin.city}, {origin.country}</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#666', marginTop: 4 }}>{origin.lat.toFixed(2)}°, {origin.lng.toFixed(2)}°</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 18, color: '#999' }}>✈</div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600 }}>{fmtNm(legNm)} nm</div>
          <div style={{ fontFamily: mono, fontSize: 12, color: '#666' }}>{fmtNm(legKm)} km · great circle</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Destination</div>
          <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 600 }}>{dest.icao} <span style={{ fontSize: 13, color: '#666' }}>{dest.iata}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{dest.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{dest.city}, {dest.country}</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: '#666', marginTop: 4 }}>{dest.lat.toFixed(2)}°, {dest.lng.toFixed(2)}°</div>
        </div>
      </section>

      {/* Recommendation summary */}
      <section style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: sans, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 6 }}>Summary</div>
        {inRange.length === 0 ? (
          <div style={{ fontFamily: sans, fontSize: 13, padding: '10px 12px', border: '1px solid #c44', color: '#c44', borderRadius: 4 }}>
            ⚠ No aircraft in this comparison can complete the {fmtNm(legNm)} nm leg nonstop at the current loadout.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <SummaryTile label="Most headroom" a={recommended} value={`${Math.round((1 - recommended.dist / recommended.range) * 100)}% spare`} />
            <SummaryTile label="Fastest" a={fastest} value={fastest.time} />
            <SummaryTile label="Least fuel" a={leastFuel} value={leastFuel.fuel} />
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontFamily: sans, fontSize: 16, marginBottom: 10, marginTop: 0, fontWeight: 700 }}>AIRCRAFT COMPARISON ({aircraft.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: sans, fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              {['Aircraft', 'Type', 'Pax', 'Payload', 'Time', 'Fuel', 'Alt', 'Range', 'Used', 'Status'].map(h => (
                <th key={h} style={{ textAlign: h === 'Aircraft' || h === 'Type' ? 'left' : (h === 'Used' ? 'left' : 'right'), padding: '7px 4px', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aircraft.map(a => {
              const inR = a.range >= a.dist;
              const pct = Math.min(100, Math.round((a.dist / a.range) * 100));
              return (
                <tr key={a.tone} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '7px 4px', fontWeight: 600 }}>
                    <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: COLOR_HEX[a.tone], marginRight: 6, verticalAlign: 'middle' }} />
                    {a.short}
                  </td>
                  <td style={{ padding: '7px 4px', color: '#666' }}>{a.type}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{a.pax}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{a.payload} t</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{a.time}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{a.fuel}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{a.alt}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono }}>{fmtNm(a.range)} nm</td>
                  <td style={{ padding: '7px 4px', width: 90 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ flex: 1, height: 6, background: '#e6e6e6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: inR ? COLOR_HEX[a.tone] : '#c44' }} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 10, color: '#666' }}>{Math.round((a.dist / a.range) * 100)}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: mono, color: inR ? '#117733' : '#c44', fontWeight: 600 }}>
                    {inR ? '✓ in range' : '✗ out'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #ddd', fontFamily: mono, fontSize: 10, color: '#888' }}>
        Generated by Tempuh · Distances via haversine great-circle; performance from OpenAP + manufacturer cruise specs.
        Range model is a simplified fuel-based estimate — not for actual flight planning.
      </footer>
    </div>
  );
}

function SummaryTile({ label, a, value }) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 4, padding: '8px 10px' }}>
      <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: COLOR_HEX[a.tone] }} />
        <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, fontWeight: 700 }}>{a.short}</span>
      </div>
      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#444', marginTop: 2 }}>{value}</div>
    </div>
  );
}
