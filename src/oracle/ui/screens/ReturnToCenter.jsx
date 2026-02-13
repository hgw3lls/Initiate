import React from 'react';

export function ReturnToCenter({ onInitiate, currentStep }) {
  return (
    <div className="oracle-card">
      <div className="oracle-symbol-area" aria-hidden="true">
        <span className="oracle-shape circle" />
        <span className="oracle-shape triangle" />
        <span className="oracle-shape square" />
      </div>
      <p className="oracle-kicker">Ritual</p>
      <div className="oracle-title">INITIATE</div>
      <p className="oracle-copy">
        Return to center.
        <span className="oracle-guidance">{currentStep?.card?.oracle_text?.guidance || 'One breath. One point of contact.'}</span>
      </p>
      <div className="oracle-actions">
        <button className="oracle-button" onClick={onInitiate}>INITIATE</button>
      </div>
    </div>
  );
}
