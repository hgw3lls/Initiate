import React from 'react';

export function BeginGate({ onStart }) {
  return (
    <div className="oracle-card">
      <div className="oracle-symbol-area" aria-hidden="true">
        <span className="oracle-shape circle" />
        <span className="oracle-shape triangle" />
        <span className="oracle-shape square" />
      </div>
      <p className="oracle-kicker">Threshold</p>
      <div className="oracle-title">INITIATE</div>
      <p className="oracle-copy">Begin.<span className="oracle-guidance">Cross the smallest possible threshold.</span></p>
      <div className="oracle-actions">
        <button className="oracle-button" onClick={onStart}>START</button>
      </div>
    </div>
  );
}
