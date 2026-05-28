import { useState } from 'react';
import { fmtNm } from '../data/catalog.js';

// SVG chart dimensions
const CW = 220, CH = 68;
const ML = 4, MR = 4, MT = 6, MB = 12;
const PW = CW - ML - MR;  // plot width
const PH = CH - MT - MB;  // plot height

function PayloadRangeChart({ a, legNm }) {
  const { curve, range, maxPayload } = a;
  const { knee1Payload, knee2Payload, ferryRange, rangeAtMax } = curve;
  const color = `var(--${a.tone})`;

  const toX = p => ML + (Math.min(p, knee2Payload) / knee2Payload) * PW;
  const toY = r => MT + (1 - Math.min(r, ferryRange) / ferryRange) * PH;

  // 3-segment polyline points
  const pts = [
    [toX(0),            toY(ferryRange)],
    [toX(knee1Payload), toY(ferryRange)],
    [toX(knee2Payload), toY(rangeAtMax)],
  ].map(([x, y]) => `${x},${y}`).join(' ');

  // current loadout position on curve
  const totalPayload = a.payload + (a.pax * 100) / 1000;
  const dotX = toX(Math.min(totalPayload, knee2Payload));
  const dotY = toY(range);

  // route distance line Y
  const routeY = legNm <= ferryRange ? toY(legNm) : null;

  return (
    <svg
      viewBox={`0 0 ${CW} ${CH}`}
      width="100%"
      style={{ display: 'block', marginBottom: 6, borderRadius: 4, background: 'rgba(0,0,0,0.25)' }}
    >
      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#263040" strokeWidth="1" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#263040" strokeWidth="1" />

      {/* Route distance line */}
      {routeY && (
        <>
          <line x1={ML} y1={routeY} x2={ML + PW} y2={routeY}
            stroke="#6dd3e7" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <text x={ML + PW + 2} y={routeY + 3} fill="#6dd3e7" fontSize="7" opacity="0.8">leg</text>
        </>
      )}

      {/* Curve */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.55" />

      {/* Current loadout dot */}
      <circle cx={dotX} cy={dotY} r="3.5" fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />

      {/* Axis labels */}
      <text x={ML} y={CH - 1} fill="#445566" fontSize="7">0</text>
      <text x={ML + PW} y={CH - 1} fill="#445566" fontSize="7" textAnchor="end">
        {a.maxPayload}t
      </text>
      <text x={ML - 1} y={MT + 4} fill="#445566" fontSize="6" textAnchor="end"
        transform={`rotate(-90,${ML - 1},${MT + PH / 2})`}>nm</text>
    </svg>
  );
}

function ParamSlider({ label, value, min, max, step, unit, rightLabel, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span className="field-label" style={{ marginBottom: 0 }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
          {value}<span style={{ fontSize: 10, color: 'var(--ink-faint)', marginLeft: 2 }}>{unit}</span>
          {rightLabel && <span style={{ fontSize: 9, color: 'var(--ink-faint)', marginLeft: 6 }}>{rightLabel}</span>}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function AircraftCard({ a, fleetEntry, focused, onFocus, onEdit, onRemove, onUpdateParam, legNm }) {
  const isEditing = onEdit.isEditing;
  const inRange = a.range >= legNm;

  return (
    <div
      className={`aircraft-card ${a.tone}`}
      style={{ opacity: focused && focused !== a.tone ? 0.45 : 1 }}
    >
      {/* header row — click to focus */}
      <div onClick={() => onFocus(a.tone)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`swatch sw${a.tone[1]}`} />
          <span className="name">{a.name}</span>
          <button
            onClick={e => { e.stopPropagation(); onEdit.toggle(); }}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: `1px solid ${isEditing ? 'var(--r1)' : 'var(--stroke-dim)'}`,
              color: isEditing ? 'var(--r1)' : 'var(--ink-faint)',
              borderRadius: 5, padding: '2px 6px',
              fontSize: 9, cursor: 'pointer',
              letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 600,
            }}
          >{isEditing ? 'done' : '✎'}</button>
          <button
            onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{
              background: 'transparent',
              border: '1px solid var(--stroke-dim)',
              color: 'var(--ink-faint)',
              borderRadius: 5, padding: '2px 6px',
              fontSize: 9, cursor: 'pointer', fontWeight: 600,
            }}
          >✕</button>
        </div>
        <div className="type">{a.type}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 5, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-dim)', alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{a.pax} pax</span>
          <span style={{ color: 'var(--ink-faint)' }}>·</span>
          <span>{fmtNm(a.range)} nm range</span>
          <span className={`range-badge ${inRange ? 'ok' : 'out'}`} style={{ marginLeft: 'auto' }}>
            {inRange ? '✓ in range' : '✗ out'}
          </span>
        </div>
      </div>

      {/* loadout editor */}
      {isEditing && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--stroke-dim)' }}>
          <ParamSlider
            label="Passengers"
            value={fleetEntry.params.pax}
            min={0} max={a.maxPax} step={1} unit="pax"
            rightLabel={`max ${a.maxPax}`}
            onChange={v => onUpdateParam('pax', v)}
          />
          <ParamSlider
            label="Payload"
            value={fleetEntry.params.payload}
            min={0} max={a.maxPayload} step={0.1} unit="t"
            rightLabel={`max ${a.maxPayload} t`}
            onChange={v => onUpdateParam('payload', +v.toFixed(1))}
          />

          {/* Payload-range chart */}
          <PayloadRangeChart a={a} legNm={legNm} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
            <span className="field-label" style={{ marginBottom: 0 }}>Effective range</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: inRange ? 'var(--ink)' : '#f78ca0', fontWeight: 600 }}>
              {fmtNm(a.range)} nm
              <span style={{ fontSize: 9, color: 'var(--ink-faint)', marginLeft: 5 }}>of {fmtNm(a.maxRange)} max</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeftDock({
  origin, dest, fleet, aircraft, focused, legNm,
  onFromClick, onToClick,
  onFocus, onFleetUpdate, onRemoveAircraft, onAddClick,
}) {
  const [editingTone, setEditingTone] = useState(null);

  const updateParam = (tone, key, val) => {
    onFleetUpdate(fleet.map(f =>
      f.color === tone ? { ...f, params: { ...f.params, [key]: val } } : f
    ));
  };

  return (
    <div className="dock-left">
      {/* Route planner card */}
      <div className="card">
        <div className="card-title">✈ Plan a route</div>
        <p className="card-sub">Search or click a pill above</p>

        <label className="field-label">From</label>
        <button className="search-btn" onClick={onFromClick} style={{ marginBottom: 10 }}>
          <span className="ico">⌕</span>
          <span className="city">{origin.city}</span>
          <span className="code">{origin.icao}</span>
        </button>

        <label className="field-label">To</label>
        <button className="search-btn" onClick={onToClick}>
          <span className="ico">⌕</span>
          <span className="city">{dest.city}</span>
          <span className="code">{dest.icao}</span>
        </button>
      </div>

      {/* Aircraft list card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div className="card-title">Aircraft</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
            {aircraft.length} / 6
          </span>
        </div>
        <p className="card-sub">tap to focus · ✎ to edit loadout</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {aircraft.map(a => {
            const fleetEntry = fleet.find(f => f.color === a.tone);
            return (
              <AircraftCard
                key={a.tone}
                a={a}
                fleetEntry={fleetEntry}
                focused={focused}
                legNm={legNm}
                onFocus={(tone) => onFocus(focused === tone ? null : tone)}
                onEdit={{
                  isEditing: editingTone === a.tone,
                  toggle: () => setEditingTone(prev => prev === a.tone ? null : a.tone),
                }}
                onRemove={() => {
                  if (editingTone === a.tone) setEditingTone(null);
                  onRemoveAircraft(a.tone);
                }}
                onUpdateParam={(key, val) => updateParam(a.tone, key, val)}
              />
            );
          })}
        </div>

        {aircraft.length < 6 && (
          <button
            className="btn"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center', display: 'flex', gap: 8 }}
            onClick={onAddClick}
          >
            + add aircraft <span className="kbd">⌘ K</span>
          </button>
        )}
      </div>
    </div>
  );
}
