/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcule un score de similarité (0-1, 1 = identique)
 */
export function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Recherche fuzzy dans une liste d'événements
 */
export function fuzzySearch(
  query: string,
  text: string,
  threshold = 0.6
): boolean {
  const queryLower = query.toLowerCase().trim();
  const textLower = text.toLowerCase();

  // Correspondance exacte
  if (textLower.includes(queryLower)) return true;

  // Recherche par mots
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);

  // Au moins un mot doit correspondre avec un score > threshold
  return queryWords.some((qWord) =>
    textWords.some((tWord) => similarityScore(qWord, tWord) >= threshold)
  );
}
