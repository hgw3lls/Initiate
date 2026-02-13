import React from 'react';

export function Transmitted({ rewardPayload, onContinue, onReturn }) {
  return (
    <div className="oracle-card">
      <div className="oracle-symbol-area" aria-hidden="true">
        <span className="oracle-shape circle" />
        <span className="oracle-shape triangle" />
        <span className="oracle-shape square" />
      </div>
      <p className="oracle-kicker">Seal</p>
      <div className="oracle-title">INITIATE</div>
      <p className="oracle-copy">
        Transmitted.
        <span className="oracle-guidance">{rewardPayload?.copy_pool?.[0] || 'Signal received.'}</span>
      </p>
      <div className="oracle-actions">
        <button className="oracle-button" onClick={onContinue}>CONTINUE</button>
        <button className="oracle-button secondary" onClick={onReturn}>RETURN</button>
      </div>
    </div>
  );
}
