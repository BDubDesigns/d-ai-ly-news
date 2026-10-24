export const CONFIDENCE_LEVELS = {
  high: { label: 'Well sourced', short: 'High', detail: 'Confirmed by more than one outlet, or by the primary record.' },
  medium: { label: 'Mostly sourced', short: 'Medium', detail: 'One solid outlet, or details that come from secondary reporting.' },
  low: { label: 'Thin sourcing', short: 'Low', detail: 'A single source or a forecast. Treat the details loosely.' },
};

export function describeConfidence(article) {
  const raw = article && article.confidence ? article.confidence : {};
  const level = CONFIDENCE_LEVELS[raw.level] ? raw.level : 'medium';
  const meta = CONFIDENCE_LEVELS[level];
  return {
    level,
    short: meta.short,
    label: meta.label,
    note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : meta.detail,
  };
}
