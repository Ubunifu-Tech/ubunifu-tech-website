/**
 * How many [TO CONFIRM: …] markers a document body holds.
 *
 * The editor saves a literal bracket as "\[", and someone may have put the
 * marker, or part of it, in bold. Both still count: a marker that slipped past
 * the count is a document sent with a gap in it.
 */
export function toConfirmCount(markdown: string): number {
  const plain = markdown.replace(/\\([*_~`[\]\\])/g, '$1').replace(/[*_~`]/g, '');
  return (plain.match(/\[\s*TO\s+CONFIRM\b/g) ?? []).length;
}
