import validator from 'validator';

/**
 * Convert HTML produced by TipTap into a compact plain-text representation.
 * - strips tags
 * - unescapes HTML entities
 * - collapses whitespace
 */
export function htmlToPlain(html: string): string {
  if (!html || typeof html !== 'string') return '';
  // remove all tags
  const stripped = html.replace(/<[^>]+>/g, ' ');
  // unescape HTML entities (e.g. &amp; -> &)
  const unescaped = validator.unescape(stripped);
  // collapse multiple whitespace/newlines into single spaces and trim
  return unescaped.replace(/\s+/g, ' ').trim();
}
