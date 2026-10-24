export function upsertFeedback(entries, entry) {
  const key = `${entry.date}|${entry.articleId}`;
  const rest = entries.filter((item) => `${item.date}|${item.articleId}` !== key);
  return [...rest, { ...entry, at: entry.at || null }];
}

export function summarize(entries) {
  const liked = entries.filter((entry) => entry.verdict === 'like');
  const disliked = entries.filter((entry) => entry.verdict === 'dislike');
  return {
    total: entries.length,
    liked: liked.map((entry) => entry.articleId),
    disliked: disliked.map((entry) => entry.articleId),
    comments: entries.filter((entry) => entry.comment && entry.comment.trim()).map((entry) => entry.comment.trim()),
  };
}

export function feedbackBrief(entries) {
  if (!entries.length) return 'No feedback yet.';
  const lines = entries.map((entry) => {
    const verdict = entry.verdict === 'like' ? 'liked' : entry.verdict === 'dislike' ? 'disliked' : 'commented';
    const note = entry.comment ? ` - "${entry.comment.trim()}"` : '';
    return `${entry.date}: ${verdict} "${entry.title}" (${entry.sectionId})${note}`;
  });
  return lines.join('\n');
}
