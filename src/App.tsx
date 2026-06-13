import { useEffect, useMemo, useRef, useState } from "react";
import { FocusTimer } from "./components/FocusTimer";
import { OracleCardView } from "./components/OracleCardView";
import {
  blockages,
  diagnosticQuestions,
  interruptActions,
  resistanceOptions,
  type BlockageId,
  type ResistanceId,
} from "./data/blockages";
import type { ReadingSession, SessionStatus } from "./types";
import { chooseStuckIntervention, drawCardForBlockage, getDominantBlockage, getUnlockedShadowCard } from "./utils/drawCards";
import { formatTimer, formatTimerLabel } from "./utils/format";
import { makeId } from "./utils/id";
import { buildDiagnosticReading, buildReadingForCopy, buildResistanceReframe } from "./utils/reading";
import { loadHistory, saveHistory } from "./utils/storage";

const statusCopy: Record<SessionStatus, string> = {
  started: "Seal broken.",
  stuck: "Lower the bar again.",
  "done-for-now": "Exit honored.",
};
const timerChoices = [120, 300, 420, 600];

function App() {
  const [task, setTask] = useState("");
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, BlockageId>>({});
  const [estimatedDifficulty, setEstimatedDifficulty] = useState(5);
  const [estimatedMinutes, setEstimatedMinutes] = useState(10);
  const [actualDifficulty, setActualDifficulty] = useState(5);
  const [actualMinutes, setActualMinutes] = useState(10);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [history, setHistory] = useState<ReadingSession[]>(() => loadHistory());
  const [validationMessage, setValidationMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [note, setNote] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [interruptAction, setInterruptAction] = useState("");
  const readingRef = useRef<HTMLElement | null>(null);

  const answeredCount = Object.keys(diagnosticAnswers).length;
  const previewBlockageId = getDominantBlockage(diagnosticAnswers);
  const activeActionCard = currentSession?.stuckIntervention?.card ?? currentSession?.cards[0]?.card ?? null;
  const activeBlockage = currentSession?.blockageId ? blockages[currentSession.blockageId] : previewBlockageId ? blockages[previewBlockageId] : null;
  const timerLabel = activeActionCard ? formatTimerLabel(remainingSeconds || activeActionCard.timerSeconds) : "No timer";

  const memory = useMemo(() => {
    const blockageCounts = history.reduce<Record<string, number>>((counts, session) => {
      if (!session.blockageId) return counts;
      counts[session.blockageId] = (counts[session.blockageId] ?? 0) + 1;
      return counts;
    }, {});
    const cardCounts = history.reduce<Record<string, { title: string; count: number }>>((counts, session) => {
      session.cards.forEach((drawnCard) => {
        counts[drawnCard.card.id] = {
          title: drawnCard.card.title,
          count: (counts[drawnCard.card.id]?.count ?? 0) + 1,
        };
      });
      if (session.stuckIntervention) {
        counts[session.stuckIntervention.card.id] = {
          title: session.stuckIntervention.card.title,
          count: (counts[session.stuckIntervention.card.id]?.count ?? 0) + 1,
        };
      }
      return counts;
    }, {});
    const [commonBlockageId, commonBlockageCount = 0] =
      Object.entries(blockageCounts).sort(([, countA], [, countB]) => countB - countA)[0] ?? [];
    const commonCard = Object.values(cardCounts).sort((cardA, cardB) => cardB.count - cardA.count)[0];
    const activationCount = history.filter((session) => session.status === "started" || session.status === "done-for-now").length;
    const predictionSessions = history.filter((session) => session.prediction?.actualDifficulty || session.prediction?.actualMinutes);
    const shadowCard = getUnlockedShadowCard(history);

    return {
      activationCount,
      commonBlockage: commonBlockageId ? blockages[commonBlockageId as BlockageId] : null,
      commonBlockageCount,
      commonCard,
      predictionSessions,
      shadowCard,
    };
  }, [history]);

  const graveyard = history.filter((session) => session.buriedAt);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    if (!timerRunning) return;

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          setTimerRunning(false);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  function updateHistory(nextSession: ReadingSession) {
    setHistory((sessions) => {
      const withoutCurrent = sessions.filter((session) => session.id !== nextSession.id);
      return [nextSession, ...withoutCurrent].slice(0, 30);
    });
  }

  function resetFeedback() {
    setStatusMessage("");
    setCopyMessage("");
    setValidationMessage("");
  }

  function answerDiagnostic(questionId: string, blockageId: BlockageId) {
    setDiagnosticAnswers((answers) => ({ ...answers, [questionId]: blockageId }));
  }

  function revealReading() {
    const cleanedTask = task.trim().replace(/\s+/g, " ");
    if (!cleanedTask) {
      setValidationMessage("Name the thing first. Fog needs an edge.");
      return;
    }

    if (answeredCount < 2) {
      setValidationMessage("Answer two signals first. The oracle needs a pattern.");
      return;
    }

    const blockageId = getDominantBlockage(diagnosticAnswers) ?? "fog";
    const card = drawCardForBlockage(blockageId, {
      estimatedDifficulty,
      history,
    });
    const session: ReadingSession = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      userTask: cleanedTask,
      blockageId,
      diagnosticAnswers,
      spreadId: "activate",
      spreadName: blockages[blockageId].label,
      cards: [
        {
          positionLabel: blockages[blockageId].label,
          positionMeaning: blockages[blockageId].signal,
          card,
        },
      ],
      generatedReadingText: buildDiagnosticReading(cleanedTask, blockageId, card),
      actionCardId: card.id,
      prediction: {
        estimatedDifficulty,
        estimatedMinutes,
      },
    };

    setCurrentSession(session);
    setActualDifficulty(estimatedDifficulty);
    setActualMinutes(estimatedMinutes);
    setNote("");
    setRemainingSeconds(card.timerSeconds);
    setTimerRunning(false);
    setFocusMode(false);
    resetFeedback();
    updateHistory(session);
    window.requestAnimationFrame(() => readingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function updateSession(nextSession: ReadingSession, message?: string) {
    setCurrentSession(nextSession);
    updateHistory(nextSession);
    if (message) setStatusMessage(message);
  }

  function updateSessionStatus(status: SessionStatus) {
    if (!currentSession) return;

    const adaptiveIntervention = status === "stuck" ? chooseStuckIntervention(currentSession) : null;
    const stuckIntervention =
      status === "stuck" && adaptiveIntervention
        ? {
            ...adaptiveIntervention,
            createdAt: new Date().toISOString(),
          }
        : currentSession.stuckIntervention;
    const nextSession = {
      ...currentSession,
      status,
      stuckIntervention,
      stuckCount: status === "stuck" ? (currentSession.stuckCount ?? 0) + 1 : currentSession.stuckCount,
    };
    const nextActionCard = stuckIntervention?.card ?? activeActionCard;

    if (status === "stuck" && nextActionCard) {
      setRemainingSeconds(nextActionCard.timerSeconds);
      setTimerRunning(false);
      setFocusMode(false);
    }
    updateSession(nextSession, statusCopy[status]);
  }

  function saveActualPrediction() {
    if (!currentSession) return;

    updateSession(
      {
        ...currentSession,
        prediction: {
          ...currentSession.prediction,
          actualDifficulty,
          actualMinutes,
        },
      },
      "Prediction error recorded.",
    );
  }

  function chooseResistance(resistanceId: ResistanceId) {
    if (!currentSession?.blockageId) return;

    updateSession({
      ...currentSession,
      resistance: {
        id: resistanceId,
        reframe: buildResistanceReframe(currentSession.blockageId, resistanceId),
      },
    });
  }

  function saveNote() {
    if (!currentSession) return;

    updateSession({ ...currentSession, logNote: note.trim() }, note.trim() ? "Log sealed." : "Empty note cleared.");
  }

  function buryTask() {
    if (!currentSession?.blockageId) return;

    updateSession(
      {
        ...currentSession,
        buriedAt: new Date().toISOString(),
        graveCause: blockages[currentSession.blockageId].graveCause,
        status: "done-for-now",
      },
      "Task buried. The grave remains useful.",
    );
  }

  async function copyReading() {
    if (!currentSession) return;

    try {
      await navigator.clipboard.writeText(buildReadingForCopy(currentSession, currentSession.status ? statusCopy[currentSession.status] : ""));
      setCopyMessage("Reading copied.");
    } catch {
      setCopyMessage("Copy unavailable in this browser.");
    }
  }

  function startTimer() {
    if (!activeActionCard) return;

    if (remainingSeconds <= 0) setRemainingSeconds(activeActionCard.timerSeconds);
    setTimerRunning(true);
    setFocusMode(true);
  }

  function pauseTimer() {
    setTimerRunning(false);
  }

  function resetTimer() {
    if (!activeActionCard) return;

    setTimerRunning(false);
    setRemainingSeconds(activeActionCard.timerSeconds);
  }

  function loadSession(session: ReadingSession) {
    const timerCard = session.stuckIntervention?.card ?? session.cards[0].card;

    setTask(session.userTask);
    setDiagnosticAnswers(session.diagnosticAnswers ?? {});
    setCurrentSession(session);
    setNote(session.logNote ?? "");
    setActualDifficulty(session.prediction?.actualDifficulty ?? session.prediction?.estimatedDifficulty ?? 5);
    setActualMinutes(session.prediction?.actualMinutes ?? session.prediction?.estimatedMinutes ?? 10);
    setRemainingSeconds(timerCard.timerSeconds);
    setTimerRunning(false);
    setFocusMode(false);
    resetFeedback();
    window.requestAnimationFrame(() => readingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function newReading() {
    setCurrentSession(null);
    setNote("");
    setTimerRunning(false);
    setFocusMode(false);
    setRemainingSeconds(0);
    resetFeedback();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearHistory() {
    setHistory([]);
  }

  function interrupt() {
    setInterruptAction(interruptActions[Math.floor(Math.random() * interruptActions.length)]);
  }

  const prediction = currentSession?.prediction;
  const difficultyDelta = prediction?.actualDifficulty && prediction.estimatedDifficulty ? prediction.actualDifficulty - prediction.estimatedDifficulty : null;
  const minutesDelta = prediction?.actualMinutes && prediction.estimatedMinutes ? prediction.actualMinutes - prediction.estimatedMinutes : null;

  return (
    <div className="app-shell">
      {focusMode && activeActionCard ? (
        <FocusTimer
          card={activeActionCard}
          remainingSeconds={remainingSeconds}
          running={timerRunning}
          onPause={pauseTimer}
          onResume={startTimer}
          onReset={resetTimer}
          onClose={() => setFocusMode(false)}
        />
      ) : null}

      <header className="site-header">
        <a className="brand" href="/" aria-label="INITIATE home">
          <span aria-hidden="true">O+</span>
          <strong>INITIATE</strong>
        </a>
        <p>A ritualized cognitive intervention system for beginning.</p>
        <button className="interrupt-button" type="button" onClick={interrupt}>
          Interrupt
        </button>
      </header>

      <main>
        <section className="intro-grid" aria-labelledby="home-title">
          <div className="hero-copy">
            <p className="eyebrow">Oracle for Executive Function</p>
            <h1 id="home-title">Can the user begin?</h1>
          </div>
          <div className="ritual-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </section>

        {interruptAction ? (
          <aside className="interrupt-panel" role="status">
            <p className="eyebrow">Pattern disruption</p>
            <strong>{interruptAction}</strong>
            <button className="text-button" type="button" onClick={() => setInterruptAction("")}>
              Dismiss
            </button>
          </aside>
        ) : null}

        <section className="draw-surface v2" aria-labelledby="draw-title">
          <div className="task-panel">
            <div className="section-heading">
              <p className="eyebrow">01 / Name</p>
              <h2 id="draw-title">What am I trying to do?</h2>
            </div>

            <label className="sr-only" htmlFor="task-input">
              What am I trying to do?
            </label>
            <textarea
              id="task-input"
              value={task}
              onChange={(event) => setTask(event.target.value)}
              placeholder={'"write artist statement"\n"apply for grant"\n"clean apartment"\n"reply to email"'}
              rows={5}
            />

            <div className="prophecy-panel" aria-label="False prophecy estimate">
              <p className="eyebrow">False Prophecy</p>
              <label htmlFor="estimated-difficulty">Estimated difficulty: {estimatedDifficulty}/10</label>
              <input
                id="estimated-difficulty"
                type="range"
                min="1"
                max="10"
                value={estimatedDifficulty}
                onChange={(event) => setEstimatedDifficulty(Number(event.target.value))}
              />
              <label htmlFor="estimated-minutes">Estimated duration</label>
              <input
                id="estimated-minutes"
                type="number"
                min="1"
                max="240"
                value={estimatedMinutes}
                onChange={(event) => setEstimatedMinutes(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="diagnostic-panel">
            <div className="section-heading">
              <p className="eyebrow">02 / Diagnose</p>
              <h2>Find the blockage.</h2>
            </div>

            <div className="diagnostic-list">
              {diagnosticQuestions.map((question) => (
                <fieldset className="diagnostic-question" key={question.id}>
                  <legend>{question.prompt}</legend>
                  <div>
                    {question.options.map((option) => (
                      <button
                        className={diagnosticAnswers[question.id] === option.blockageId ? "diagnostic-option active" : "diagnostic-option"}
                        key={`${question.id}-${option.blockageId}`}
                        type="button"
                        data-question-id={question.id}
                        data-blockage-id={option.blockageId}
                        onClick={() => answerDiagnostic(question.id, option.blockageId)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="diagnosis-preview" aria-live="polite">
              <p className="eyebrow">Signal</p>
              <strong>{previewBlockageId ? blockages[previewBlockageId].label : "Undetermined"}</strong>
              <span>{previewBlockageId ? blockages[previewBlockageId].signal : "Answer two signals to reveal a pattern."}</span>
            </div>

            {validationMessage ? (
              <p className="validation" role="alert">
                {validationMessage}
              </p>
            ) : null}

            <button className="draw-button" type="button" onClick={revealReading}>
              <span>Reveal Reading</span>
              <b>{answeredCount}</b>
            </button>
          </div>
        </section>

        {currentSession ? (
          <section className="reading-section" aria-labelledby="reading-title" ref={readingRef}>
            <div className="reading-heading">
              <div>
                <p className="eyebrow">03 / Oracle Reading</p>
                <h2 id="reading-title">{activeBlockage?.label ?? "Oracle"} Transmission</h2>
              </div>
              <button className="text-button" type="button" onClick={newReading}>
                New Reading
              </button>
            </div>

            {activeBlockage ? (
              <section className="transmission-panel" aria-label="Diagnosis">
                <p className="eyebrow">You are experiencing</p>
                <strong>{activeBlockage.label}</strong>
                <span>{activeBlockage.objective}</span>
              </section>
            ) : null}

            <div className="card-grid">
              {currentSession.cards.map((drawnCard) => (
                <OracleCardView key={`${currentSession.id}-${drawnCard.positionLabel}`} drawnCard={drawnCard} />
              ))}
            </div>

            <div className="reading-grid">
              <article className="reading-text">
                <h3>Reading</h3>
                <pre>{currentSession.generatedReadingText}</pre>
              </article>

              <aside className={currentSession.stuckIntervention ? "action-panel second-intervention" : "action-panel"} aria-label="Micro-action">
                <p className="eyebrow">{currentSession.stuckIntervention ? "Smaller move" : "Activation"}</p>
                <h3>{activeActionCard?.title}</h3>
                <p>{activeActionCard?.microAction}</p>
                {currentSession.stuckIntervention ? (
                  <p className="intervention-note">
                    {currentSession.stuckIntervention.adapterTrace?.join(" ")}
                    {currentSession.stuckIntervention.adapterTrace?.length ? " " : ""}
                    Still stuck means the bar is still too high. This is the next smaller door.
                  </p>
                ) : null}
                <div className="timer-box">
                  <span>{timerLabel}</span>
                  <strong aria-live="polite">{formatTimer(remainingSeconds)}</strong>
                  <div className="timer-choice-row" aria-label="Timer length">
                    {timerChoices.map((seconds) => (
                      <button className="timer-choice" key={seconds} type="button" onClick={() => setRemainingSeconds(seconds)}>
                        {formatTimerLabel(seconds)}
                      </button>
                    ))}
                  </div>
                  <div className="timer-actions">
                    <button className="solid-button" type="button" onClick={startTimer}>
                      Start Timer
                    </button>
                    <button className="text-button" type="button" onClick={pauseTimer}>
                      Pause
                    </button>
                    <button className="text-button" type="button" onClick={resetTimer}>
                      Reset
                    </button>
                  </div>
                </div>
              </aside>
            </div>

            <section className="engine-grid" aria-label="Post-reading engines">
              <article className="resistance-panel">
                <p className="eyebrow">Resistance Engine</p>
                <h2>What argument is your mind making?</h2>
                <div className="resistance-options">
                  {resistanceOptions.map((option) => (
                    <button
                      className={currentSession.resistance?.id === option.id ? "diagnostic-option active" : "diagnostic-option"}
                      key={option.id}
                      type="button"
                      data-resistance-id={option.id}
                      onClick={() => chooseResistance(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {currentSession.resistance ? <p className="reframe">{currentSession.resistance.reframe}</p> : null}
              </article>

              {activeBlockage ? (
                <article className="manual-panel">
                  <p className="eyebrow">Field Manual</p>
                  <h2>Protocol: {activeBlockage.label}</h2>
                  <ol>
                    {activeBlockage.protocol.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </article>
              ) : null}
            </section>

            <section className="outcome-panel" aria-label="Outcome">
              <div>
                <p className="eyebrow">04 / Log</p>
                <h2>Did activation happen?</h2>
              </div>

              <div className="status-row">
                <button type="button" onClick={() => updateSessionStatus("started")}>
                  I Started
                </button>
                <button type="button" onClick={() => updateSessionStatus("stuck")}>
                  Still Stuck
                </button>
                <button type="button" onClick={() => updateSessionStatus("done-for-now")}>
                  Done For Now
                </button>
                <button type="button" onClick={buryTask}>
                  Bury Task
                </button>
              </div>

              {statusMessage ? (
                <p className="status-message" role="status">
                  {statusMessage}
                </p>
              ) : null}

              {currentSession.stuckIntervention ? (
                <article className="stuck-note">
                  <span>Second intervention:</span>
                  <strong>{currentSession.stuckIntervention.card.title}</strong>
                  <p>{currentSession.stuckIntervention.card.microAction}</p>
                  {currentSession.stuckIntervention.adapterTrace?.length ? (
                    <p className="adapter-trace">{currentSession.stuckIntervention.adapterTrace.join(" ")}</p>
                  ) : null}
                  {currentSession.stuckIntervention.choices?.length ? (
                    <p className="adapter-trace">Choices: {currentSession.stuckIntervention.choices.join(" / ")}</p>
                  ) : null}
                </article>
              ) : null}

              <div className="actual-panel">
                <p className="eyebrow">Prediction Error</p>
                <label htmlFor="actual-difficulty">Actual difficulty: {actualDifficulty}/10</label>
                <input
                  id="actual-difficulty"
                  type="range"
                  min="1"
                  max="10"
                  value={actualDifficulty}
                  onChange={(event) => setActualDifficulty(Number(event.target.value))}
                />
                <label htmlFor="actual-minutes">Actual duration</label>
                <input
                  id="actual-minutes"
                  type="number"
                  min="1"
                  max="240"
                  value={actualMinutes}
                  onChange={(event) => setActualMinutes(Number(event.target.value))}
                />
                <button className="solid-button" type="button" onClick={saveActualPrediction}>
                  Record Prediction Error
                </button>
                {difficultyDelta !== null || minutesDelta !== null ? (
                  <p className="prediction-result">
                    Brain forecast: difficulty {difficultyDelta !== null ? `${difficultyDelta > 0 ? "+" : ""}${difficultyDelta}` : "pending"},
                    duration {minutesDelta !== null ? `${minutesDelta > 0 ? "+" : ""}${minutesDelta} min` : "pending"}.
                  </p>
                ) : null}
              </div>

              <label htmlFor="log-note">Optional one-line log</label>
              <div className="note-row">
                <input
                  id="log-note"
                  type="text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={160}
                  placeholder="One sentence about what moved."
                />
                <button className="solid-button" type="button" onClick={saveNote}>
                  Save Note
                </button>
              </div>

              <div className="utility-row">
                <button className="text-button" type="button" onClick={copyReading}>
                  Copy Reading
                </button>
                {copyMessage ? <span role="status">{copyMessage}</span> : null}
              </div>
            </section>
          </section>
        ) : null}

        <section className="memory-section" aria-labelledby="memory-title">
          <div className="section-heading">
            <p className="eyebrow">Oracle Memory</p>
            <h2 id="memory-title">Insights, not statistics.</h2>
          </div>

          <div className="memory-grid">
            <article>
              <span>Activation Count</span>
              <strong>{memory.activationCount}</strong>
              <p>Starts, exits, and sealed beginnings.</p>
            </article>
            <article>
              <span>Common Signal</span>
              <strong>{memory.commonBlockage ? memory.commonBlockage.label : "None"}</strong>
              <p>{memory.commonBlockage ? `${memory.commonBlockageCount} recorded transmissions.` : "The archive is empty."}</p>
            </article>
            <article>
              <span>Repeated Card</span>
              <strong>{memory.commonCard ? memory.commonCard.title : "None"}</strong>
              <p>{memory.commonCard ? `${memory.commonCard.count} appearances.` : "Draw first. Meaning follows."}</p>
            </article>
            <article className="shadow-memory">
              <span>Shadow Deck</span>
              <strong>{memory.shadowCard ? memory.shadowCard.title : "Locked"}</strong>
              <p>{memory.shadowCard ? memory.shadowCard.message : "Repeated patterns reveal hidden cards."}</p>
            </article>
          </div>

          <div className="constellation" aria-label="Activation constellation">
            {history.slice(0, 18).map((session, index) => (
              <button
                className={`star-node ${session.buriedAt ? "buried" : session.status ?? "unmarked"}`}
                key={session.id}
                style={{ "--x": `${12 + ((index * 19) % 76)}%`, "--y": `${16 + ((index * 31) % 68)}%` } as React.CSSProperties}
                type="button"
                onClick={() => loadSession(session)}
                aria-label={`Review ${session.userTask}`}
              />
            ))}
          </div>
        </section>

        <section className="history-section" aria-labelledby="history-title">
          <div className="history-heading">
            <div className="section-heading">
              <p className="eyebrow">Archive</p>
              <h2 id="history-title">Previous transmissions</h2>
            </div>
            {history.length ? (
              <button className="text-button" type="button" onClick={clearHistory}>
                Clear Archive
              </button>
            ) : null}
          </div>

          {history.length ? (
            <div className="history-list">
              {history.map((session) => (
                <article className={session.buriedAt ? "history-item buried" : "history-item"} key={session.id}>
                  <div>
                    <span>{new Date(session.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    <h3>{session.userTask}</h3>
                    <p>
                      {session.blockageId ? blockages[session.blockageId].label : session.spreadName}
                      {session.status ? ` / ${statusCopy[session.status]}` : ""}
                      {session.graveCause ? ` / buried: ${session.graveCause}` : ""}
                    </p>
                    {session.logNote ? <p className="history-note">{session.logNote}</p> : null}
                  </div>
                  <button className="text-button" type="button" onClick={() => loadSession(session)}>
                    Review
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-history">No transmissions yet. Reveal once. Log nothing unless it helps.</p>
          )}
        </section>

        {graveyard.length ? (
          <section className="graveyard-section" aria-labelledby="graveyard-title">
            <div className="section-heading">
              <p className="eyebrow">Task Graveyard</p>
              <h2 id="graveyard-title">Buried, not deleted.</h2>
            </div>
            <div className="grave-list">
              {graveyard.map((session) => (
                <article key={`grave-${session.id}`}>
                  <span>{session.graveCause}</span>
                  <strong>{session.userTask}</strong>
                  <button className="text-button" type="button" onClick={() => loadSession(session)}>
                    Revisit
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <nav className="bottom-dock" aria-label="Primary tools">
        <a href="#draw-title">
          <span aria-hidden="true">[]</span>
          <strong>Oracle</strong>
          <small>Get guidance</small>
        </a>
        <a href="#memory-title">
          <span aria-hidden="true">()</span>
          <strong>Memory</strong>
          <small>Your patterns</small>
        </a>
        <button type="button" onClick={interrupt}>
          <span aria-hidden="true">!!</span>
          <strong>Interrupt</strong>
          <small>Emergency</small>
        </button>
        <a href="#graveyard-title">
          <span aria-hidden="true">__</span>
          <strong>Graveyard</strong>
          <small>Buried tasks</small>
        </a>
        <a className="dock-cta" href="#draw-title">
          <strong>Begin.</strong>
          <small>Not perfect.</small>
        </a>
      </nav>

      <footer>
        <p>
          INITIATE is a creative activation tool for moments of task paralysis. It is not medical advice, diagnosis,
          therapy, or crisis support. If you feel unsafe or in crisis, contact emergency services or a trusted person
          immediately.
        </p>
      </footer>
    </div>
  );
}

export { App };
