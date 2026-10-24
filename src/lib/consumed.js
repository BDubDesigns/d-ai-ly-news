export const CONSUME_THRESHOLD = 0.75;

export function isConsumed(entries, id) {
  return entries.includes(id);
}

export function markConsumed(entries, id) {
  if (!id || entries.includes(id)) return entries;
  return [...entries, id];
}

export function unmarkConsumed(entries, id) {
  return entries.filter((entry) => entry !== id);
}

export function reachedThreshold(chunkIndex, chunkCount, threshold = CONSUME_THRESHOLD) {
  if (!chunkCount || chunkCount < 1) return false;
  const spoken = Math.min(Math.max(chunkIndex, 0), chunkCount);
  return spoken / chunkCount >= threshold;
}

export function tally(entries, total) {
  const consumed = entries.length;
  return { consumed, total, remaining: Math.max(0, total - consumed) };
}
