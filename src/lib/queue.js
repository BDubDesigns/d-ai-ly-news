export function addToQueue(queue, id) {
  if (!id || queue.includes(id)) return queue;
  return [...queue, id];
}

export function removeFromQueue(queue, id) {
  return queue.filter((item) => item !== id);
}

export function toggleQueue(queue, id) {
  return queue.includes(id) ? removeFromQueue(queue, id) : addToQueue(queue, id);
}

export function afterFinish(queue, finishedId) {
  const remaining = removeFromQueue(queue, finishedId);
  if (remaining.length) {
    return { queue: remaining, playNext: true, keepPaused: false };
  }
  return { queue: remaining, playNext: false, keepPaused: true };
}
