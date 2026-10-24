// Chrome cuts long utterances off and Chrome for Android implements pause() as
// cancel(), so the player speaks short sentence chunks and manages position itself.

export function chunkText(text, maxChars = 180) {
  const clean = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
  if (!clean) return [];

  const sentences = clean.match(/[^.!?\u2026]+[.!?\u2026]*\s*/g) ?? [clean];
  const chunks = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    if (!current) current = piece;
    else if (`${current} ${piece}`.length <= maxChars) current = `${current} ${piece}`;
    else {
      flush();
      current = piece;
    }
  }
  flush();

  return chunks.flatMap((chunk) => hardWrap(chunk, maxChars));
}

function hardWrap(chunk, maxChars) {
  if (chunk.length <= maxChars) return [chunk];
  const words = chunk.split(' ');
  const parts = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxChars) line = `${line} ${word}`;
    else {
      parts.push(line);
      line = word;
    }
  }
  if (line) parts.push(line);
  return parts;
}
