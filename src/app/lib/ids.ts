/**
 * MongoDB ObjectIds are 24-char lowercase hex strings that start with a timestamp,
 * so plain string comparison gives creation order.
 */
export function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
