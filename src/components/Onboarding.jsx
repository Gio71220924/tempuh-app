export default function Onboarding({ onDismiss }) {
  return (
    <div className="onboarding">
      <div className="ob-head">
        <span className="ob-title">✈ Welcome to Tempuh</span>
        <button className="ob-close" onClick={onDismiss} title="Dismiss">×</button>
      </div>
      <ul className="ob-tips">
        <li><span className="ob-ico">⌖</span> Click the map to set origin / destination</li>
        <li><span className="kbd">⌘ K</span> search airports &amp; aircraft</li>
        <li><span className="ob-ico">✎</span> edit an aircraft's load — pax &amp; cargo</li>
        <li><span className="kbd">⤢</span> hide panels for a full-screen map</li>
      </ul>
      <button className="ob-got" onClick={onDismiss}>Got it</button>
    </div>
  );
}
