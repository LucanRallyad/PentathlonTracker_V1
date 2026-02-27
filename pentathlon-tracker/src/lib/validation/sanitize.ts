/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_ENTITY_REGEX = /[&<>"'`/]/g;

/**
 * Escape HTML special characters to prevent XSS.
 */
export function escapeHtml(str: string): string {
  return str.replace(HTML_ENTITY_REGEX, (char) => HTML_ENTITY_MAP[char] || char);
}

/**
 * Strip HTML tags from a string.
 */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize a string for safe storage and display.
 * Strips HTML tags and trims whitespace.
 */
export function sanitizeString(str: string): string {
  return stripHtmlTags(str).trim();
}

/**
 * Sanitize a string for safe HTML rendering.
 * Escapes HTML entities (use this when rendering in innerHTML contexts).
 */
export function sanitizeForHtml(str: string): string {
  return escapeHtml(str);
}

/**
 * Sanitize a search query — removes potentially dangerous characters
 * while preserving useful search functionality.
 */
export function sanitizeSearchQuery(str: string): string {
  return str
    .replace(/<[^>]*>/g, '')      // Strip HTML
    .replace(/[^\w\s\-.']/g, '')  // Only allow word chars, spaces, hyphens, dots, apostrophes
    .trim()
    .substring(0, 100);           // Limit length
}

/**
 * Validate and sanitize a date string (ISO format).
 */
export function sanitizeDate(str: string): string | null {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(str)) return null;

  const date = new Date(str);
  if (isNaN(date.getTime())) return null;

  // Ensure reasonable date range
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) return null;

  return str;
}

/**
 * Validate and sanitize a numeric value within bounds.
 */
export function sanitizeNumber(
  value: unknown,
  min: number = -Infinity,
  max: number = Infinity
): number | null {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return null;
  if (num < min || num > max) return null;
  return num;
}
