import type { DrawnCard } from "../types";

function OracleCardView({ drawnCard }: { drawnCard: DrawnCard }) {
  return (
    <article className="oracle-card">
      <div className="card-index">
        <span>{drawnCard.positionLabel}</span>
        <b>{String(drawnCard.card.number).padStart(2, "0")}</b>
      </div>
      <div className="card-symbol" aria-hidden="true">
        <span>{drawnCard.card.symbol}</span>
      </div>
      <h3>{drawnCard.card.title}</h3>
      <p>{drawnCard.card.shortText}</p>
      <dl>
        <div>
          <dt>Prompt</dt>
          <dd>{drawnCard.card.prompt}</dd>
        </div>
        <div>
          <dt>Action</dt>
          <dd>{drawnCard.card.action}</dd>
        </div>
      </dl>
    </article>
  );
}

export { OracleCardView };
