/**
 * Normalize a name so "  BUDI   santoso." and "Budi Santoso" are treated as the same.
 * Used by the Excel import and by the search, so the rules must live in one place.
 */
export function normalizeName(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ") // remove punctuation except ' and -
    .replace(/\s+/g, " ")
    .trim();
}

/** Escape LIKE wildcard characters so user input cannot use % or _. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}
