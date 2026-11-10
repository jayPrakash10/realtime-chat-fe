export interface TextSegment {
  text: string;
  match: boolean;
}

/** Splits text into plain and matching parts for case-insensitive highlighting (no innerHTML needed). */
export function highlightMatches(text: string, term: string): TextSegment[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return text ? [{ text, match: false }] : [];
  const haystack = text.toLowerCase();
  const segments: TextSegment[] = [];
  let index = 0;
  while (index < text.length) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      segments.push({ text: text.slice(index), match: false });
      break;
    }
    if (found > index) segments.push({ text: text.slice(index, found), match: false });
    segments.push({ text: text.slice(found, found + needle.length), match: true });
    index = found + needle.length;
  }
  return segments;
}
