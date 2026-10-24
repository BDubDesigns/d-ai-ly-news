export function flattenArticles(edition) {
  return (edition?.sections ?? []).flatMap((section) =>
    (section.articles ?? []).map((article) => ({ ...article, sectionId: section.id, sectionTitle: section.title })),
  );
}

export function articleSpeechText(article) {
  const asides = Array.isArray(article?.asides) ? article.asides : [];
  return [article?.title, article?.dek, article?.summary, article?.whyItMatters, ...asides]
    .map((part) => typeof part === 'string' ? part.replace(/\s+/g, ' ').trim() : '')
    .filter(Boolean)
    .map((part) => /[.!?…]$/.test(part) ? part : `${part}.`)
    .join(' ');
}

export function sortEditions(editions = []) {
  return [...editions].sort((first, second) => second.date.localeCompare(first.date));
}
