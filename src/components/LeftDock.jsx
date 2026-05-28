import { useState } from 'react';
import { fmtNm } from '../data/catalog.js';

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
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
