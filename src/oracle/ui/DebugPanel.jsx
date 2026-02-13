import React from 'react';

export function DebugPanel({ context, spreadId, steps, currentIndex, recentOutcomes, ttfaSeconds }) {
  return (
    <aside className="oracle-debug">
      <h3>Debug</h3>
      <div><strong>state_type:</strong> {context?.state_type}</div>
      <div><strong>stuck_level:</strong> {context?.stuck_level}</div>
      <div><strong>intensity_band:</strong> {context?.intensity_band}</div>
      <div><strong>spreadId:</strong> {spreadId || '-'}</div>
      <div><strong>currentIndex:</strong> {currentIndex}</div>
      <div><strong>TTFA so far:</strong> {ttfaSeconds ?? '-'}</div>

      <div className="oracle-debug-block">
        <strong>steps</strong>
        <ul>
          {(steps || []).map((step, index) => (
            <li key={`${step?.card?.id || 'step'}-${index}`}>
              #{index} {step?.card?.id} | {step?.selected_kind} | d={step?.card?.difficulty} | t={step?.card?.duration_sec}
            </li>
          ))}
        </ul>
      </div>

      <div className="oracle-debug-block">
        <strong>recent outcomes</strong>
        <ul>
          {(recentOutcomes || []).map((entry, index) => (
            <li key={`${entry.outcome}-${index}`}>{entry.outcome} ({entry.card_id || 'n/a'})</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
