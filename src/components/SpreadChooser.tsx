import { spreads, type Spread } from "../data/spreads";

type SpreadChooserProps = {
  selectedSpreadId: Spread["id"];
  onSelect: (spreadId: Spread["id"]) => void;
};

function SpreadChooser({ selectedSpreadId, onSelect }: SpreadChooserProps) {
  return (
    <div className="spread-grid" role="radiogroup" aria-label="Choose your intervention">
      {spreads.map((spread) => (
        <button
          className={spread.id === selectedSpreadId ? "spread-option active" : "spread-option"}
          key={spread.id}
          type="button"
          aria-pressed={spread.id === selectedSpreadId}
          onClick={() => onSelect(spread.id)}
        >
          <span>{spread.shortName}</span>
          <strong>{spread.name}</strong>
          <small>{spread.description}</small>
        </button>
      ))}
    </div>
  );
}

export { SpreadChooser };
