import type { OracleCard } from "../data/cards";
import { formatTimer } from "../utils/format";

type FocusTimerProps = {
  card: OracleCard;
  remainingSeconds: number;
  running: boolean;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
};

function FocusTimer({ card, remainingSeconds, running, onPause, onResume, onReset, onClose }: FocusTimerProps) {
  return (
    <section className="focus-mode" aria-label="Focused timer">
      <div className="focus-card">
        <p className="eyebrow">Contact only</p>
        <h2>{card.title}</h2>
        <p>{card.microAction}</p>
        <strong aria-live="polite">{formatTimer(remainingSeconds)}</strong>
        <div className="focus-actions">
          {running ? (
            <button className="solid-button" type="button" onClick={onPause}>
              Pause
            </button>
          ) : (
            <button className="solid-button" type="button" onClick={onResume}>
              Resume
            </button>
          )}
          <button className="text-button" type="button" onClick={onReset}>
            Reset
          </button>
          <button className="text-button" type="button" onClick={onClose}>
            Exit Focus
          </button>
        </div>
      </div>
    </section>
  );
}

export { FocusTimer };
