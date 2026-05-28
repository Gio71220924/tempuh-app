import { fmtNm } from '../data/catalog.js';

export default function PrintBrief({ origin, dest, legNm, aircraft }) {
  const legKm = Math.round(legNm * 1.852);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="print-brief">
      <header style={{ borderBottom: '2px solid #000', paddingBottom: 12, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>TEMPUH</h1>
              <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 9, color: '#666', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3 }}>flight range briefing</div>
            </div>
          </div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#555' }}>generated {today}</div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, marginBottom: 20, padding: '14px 0', borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd' }}>
        <div>
          <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Origin</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>{origin.icao} <span style={{ fontSize: 13, color: '#666' }}>{origin.iata}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{origin.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{origin.city}, {origin.country}</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#666', marginTop: 4 }}>{origin.lat.toFixed(2)}°, {origin.lng.toFixed(2)}°</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>{fmtNm(legNm)} nm</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#666' }}>{fmtNm(legKm)} km · great circle</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666', marginBottom: 4 }}>Destination</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 22, fontWeight: 600 }}>{dest.icao} <span style={{ fontSize: 13, color: '#666' }}>{dest.iata}</span></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{dest.name}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{dest.city}, {dest.country}</div>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#666', marginTop: 4 }}>{dest.lat.toFixed(2)}°, {dest.lng.toFixed(2)}°</div>
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 16, marginBottom: 10, marginTop: 0, fontWeight: 700 }}>AIRCRAFT COMPARISON ({aircraft.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000' }}>
              {['Aircraft', 'Type', 'Pax', 'Payload', 'Time', 'Fuel', 'Cruise Alt', 'Range', 'Status'].map(h => (
                <th key={h} style={{ textAlign: h === 'Aircraft' || h === 'Type' ? 'left' : 'right', padding: '7px 4px', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aircraft.map(a => {
              const inRange = a.range >= a.dist;
              return (
                <tr key={a.tone} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '7px 4px', fontWeight: 600 }}>{a.short}</td>
                  <td style={{ padding: '7px 4px', color: '#666' }}>{a.type}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{a.pax}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{a.payload} t</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{a.time}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{a.fuel}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{a.alt}</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{fmtNm(a.range)} nm</td>
                  <td style={{ padding: '7px 4px', textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', color: inRange ? '#117733' : '#c44' }}>
                    {inRange ? '✓ in range' : '✗ out'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer style={{ marginTop: 28, paddingTop: 10, borderTop: '1px solid #ddd', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#888' }}>
        Generated by Tempuh · Distances via haversine great-circle. Performance values are simplified estimates from manufacturer cruise specs — not for actual flight planning.
      </footer>
    </div>
  );
}
