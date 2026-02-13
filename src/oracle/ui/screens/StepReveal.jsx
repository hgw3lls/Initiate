import React from 'react';

export function StepReveal({ step, onInitiate, onDefer }) {
  return (
    <div className="oracle-card">
      <div className="oracle-symbol-area" aria-hidden="true">
        <span className="oracle-shape circle" />
        <span className="oracle-shape triangle" />
        <span className="oracle-shape square" />
      </div>
      <p className="oracle-kicker">Transmission</p>
      <div className="oracle-title">INITIATE</div>
      <p className="oracle-copy">
        This is the step.
        <span className="oracle-guidance">{step?.card?.action?.instruction || step?.card?.name || 'Take one micro-task.'}</span>
      </p>
      <div className="oracle-actions">
        <button className="oracle-button" onClick={onInitiate}>INITIATE</button>
        <button className="oracle-button secondary" onClick={onDefer}>DEFER</button>
      </div>
    </div>
  );
}
