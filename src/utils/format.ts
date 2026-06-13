export function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.max(0, seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function formatTimerLabel(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds % 60 === 0) return `${seconds / 60} minutes`;
  return `${Math.floor(seconds / 60)}.5 minutes`;
}
