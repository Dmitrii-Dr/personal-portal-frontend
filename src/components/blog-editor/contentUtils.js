/**
 * Shared helpers for ProseMirror JSON content (blog, agreements, etc.).
 */

import { deriveExcerpt, extractPlainText } from './schema';

/** Normalize API `content` for Milkdown (string, parsed object, BOM). */
export function contentToEditorString(content) {
  if (content == null) return '';
  if (typeof content === 'string') return content.replace(/^\uFEFF/, '');
  if (typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch {
      return '';
    }
  }
  return String(content);
}

export function looksLikeDocJson(content) {
  if (!content || typeof content !== 'string') return false;
  return content.trimStart().startsWith('{');
}

/**
 * Short plain-text preview for list UIs (JSON doc → excerpt; HTML → stripped text).
 * @param {string|null|undefined} content
 * @param {number} [maxLength=100]
 * @returns {string}
 */
export function agreementContentPreview(content, maxLength = 100) {
  if (content == null || content === '') return '';
  const s = typeof content === 'string' ? content : String(content);
  if (looksLikeDocJson(s)) {
    try {
      JSON.parse(s);
      const plain = extractPlainText(s);
      const excerpt = deriveExcerpt(s, maxLength);
      return plain.length > maxLength ? `${excerpt}…` : excerpt;
    } catch {
      return s.length > maxLength ? `${s.slice(0, maxLength)}…` : s;
    }
  }
  const stripped = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) return '';
  return stripped.length > maxLength ? `${stripped.slice(0, maxLength)}…` : stripped;
}
