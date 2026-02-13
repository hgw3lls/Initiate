import React from 'react';

export function ExecuteStep({ step, timerLeft, onComplete, onBreakState }) {
  return (
    <div className="oracle-card">
      <div className="oracle-symbol-area" aria-hidden="true">
        <span className="oracle-shape circle" />
        <span className="oracle-shape triangle" />
        <span className="oracle-shape square" />
      </div>
      <p className="oracle-kicker">Action</p>
      <div className="oracle-title">INITIATE</div>
      <p className="oracle-copy">{step?.card?.action?.instruction || step?.card?.name}</p>
      {typeof timerLeft === 'number' ? <div className="oracle-timer">{timerLeft}s</div> : null}
      <div className="oracle-actions">
        <button className="oracle-button" onClick={onComplete}>COMPLETE</button>
        <button className="oracle-button secondary" onClick={onBreakState}>BREAK STATE</button>
      </div>
    </div>
  );
}
