import validator from 'validator';

/**
 * Convert HTML produced by TipTap into a readable plain-text representation.
 * Preserves basic structure by converting block elements to newlines and list items
 * to bullets, unescaping HTML entities and collapsing excessive whitespace.
 */
export function htmlToPlain(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Normalize some block tags to newlines
  let s = html
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<\/div>/gi, '\n');

  // Remove remaining tags
  s = s.replace(/<[^>]+>/g, '');

  // Unescape HTML entities
  s = validator.unescape(s);

  // Collapse multiple blank lines to maximum two, and trim
  s = s.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n');
  // Collapse excessive spaces but preserve line breaks
  s = s.split('\n').map(line => line.replace(/\s+/g, ' ').trim()).join('\n');
  return s.trim();
}
