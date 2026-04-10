/**
 * Blog Editor — content contract (Phase 1)
 *
 * Defines node/mark type names, JSDoc types, and utility functions for the
 * ProseMirror/Milkdown document JSON used as the single `content` field.
 */

/** Custom node type names */
export const NODE_TYPES = {
  CUSTOM_IMAGE: 'customImage',
  ADMONITION_PANEL: 'admonitionPanel',
  ADMONITION_TITLE: 'admonitionTitle',
  ADMONITION_BODY: 'admonitionBody',
};

/** Custom mark type names */
export const MARK_TYPES = {
  TEXT_COLOR: 'textColor',
  BG_COLOR: 'bgColor',
  FONT_SIZE: 'fontSize',
  FONT_FAMILY: 'fontFamily',
  TEXT_ALIGN: 'textAlign',
};

/**
 * @typedef {'left'|'center'|'right'} ImageAlignment
 *
 * @typedef {{
 *   type: 'customImage',
 *   attrs: {
 *     mediaId: string,
 *     width: number|null,
 *     height: number|null,
 *     alignment: ImageAlignment
 *   }
 * }} CustomImageNode
 *
 * @typedef {{
 *   type: 'admonitionPanel',
 *   attrs: {
 *     fontSize: string|null,
 *     textColor: string|null,
 *     bgColor: string|null
 *   },
 *   content?: [{ type: 'admonitionBody', content: unknown[] }]
 * }} AdmonitionPanelNode
 *
 * @typedef {{ type: 'admonitionBody' }} AdmonitionBodyNode
 * Legacy `admonitionTitle` in saved JSON is merged into body by migrateLegacyAdmonitionPanels.
 *
 * @typedef {{ type: 'textColor', attrs: { color: string } }} TextColorMark
 * @typedef {{ type: 'bgColor', attrs: { color: string } }} BgColorMark
 * @typedef {{ type: 'fontSize', attrs: { size: string } }} FontSizeMark
 * @typedef {{ type: 'fontFamily', attrs: { family: string } }} FontFamilyMark
 * @typedef {{ type: 'textAlign', attrs: { align: 'left'|'center'|'right' } }} TextAlignMark
 */

/**
 * Walk a ProseMirror doc JSON tree and collect all `customImage` mediaIds.
 * @param {string|object|null} docJson - JSON string or parsed doc object
 * @returns {string[]}
 */
export function extractMediaIdsFromDoc(docJson) {
  if (!docJson) return [];
  let doc;
  try {
    doc = typeof docJson === 'string' ? JSON.parse(docJson) : docJson;
  } catch {
    return [];
  }
  const ids = [];
  walkNode(doc, ids);
  return [...new Set(ids)];
}

function walkNode(node, ids) {
  if (!node || typeof node !== 'object') return;
  if (node.type === NODE_TYPES.CUSTOM_IMAGE && node.attrs?.mediaId) {
    ids.push(node.attrs.mediaId);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      walkNode(child, ids);
    }
  }
}

/**
 * Extract plain text from a ProseMirror doc JSON, skipping code fences and images.
 * @param {string|object|null} docJson
 * @returns {string}
 */
export function extractPlainText(docJson) {
  if (!docJson) return '';
  let doc;
  try {
    doc = typeof docJson === 'string' ? JSON.parse(docJson) : docJson;
  } catch {
    return '';
  }
  const parts = [];
  collectText(doc, parts);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function collectText(node, parts) {
  if (!node || typeof node !== 'object') return;
  const skip = ['code_block', 'fence', NODE_TYPES.CUSTOM_IMAGE];
  if (skip.includes(node.type)) return;
  if (node.type === 'text' && typeof node.text === 'string') {
    parts.push(node.text);
    return;
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectText(child, parts);
    }
  }
}

/**
 * Auto-derive excerpt: first `maxLength` chars of plain text.
 * @param {string|object|null} docJson
 * @param {number} [maxLength=250]
 * @returns {string}
 */
export function deriveExcerpt(docJson, maxLength = 250) {
  const text = extractPlainText(docJson);
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/**
 * Returns true if the doc JSON contains meaningful text content.
 * @param {string|object|null} docJson
 * @returns {boolean}
 */
export function isDocNonEmpty(docJson) {
  return extractPlainText(docJson).length > 0;
}

function collectInlineText(node) {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(collectInlineText).join('');
  }
  return '';
}

/**
 * Legacy panels stored `admonitionTitle` + `admonitionBody`. Merge title text into the body
 * so older saved JSON still loads after the schema dropped the title node.
 * @param {object} node
 * @returns {object}
 */
export function migrateLegacyAdmonitionPanels(node) {
  if (!node || typeof node !== 'object') return node;
  if (node.type === NODE_TYPES.ADMONITION_PANEL && Array.isArray(node.content)) {
    const titleNode = node.content.find((c) => c?.type === NODE_TYPES.ADMONITION_TITLE);
    const bodyNode = node.content.find((c) => c?.type === NODE_TYPES.ADMONITION_BODY);
    if (titleNode && bodyNode) {
      const titleText = collectInlineText(titleNode).trim();
      const bodyParas = Array.isArray(bodyNode.content)
        ? bodyNode.content.map(migrateLegacyAdmonitionPanels)
        : [];
      let newBodyContent = bodyParas;
      if (titleText) {
        const first = bodyParas[0];
        if (first?.type === 'paragraph') {
          const inner = Array.isArray(first.content) ? [...first.content] : [];
          const t0 = inner[0];
          const newInner =
            t0?.type === 'text'
              ? [{ ...t0, text: titleText + (t0.text ? `\n${t0.text}` : '') }, ...inner.slice(1)]
              : [{ type: 'text', text: titleText }, ...inner];
          newBodyContent = [{ ...first, content: newInner }, ...bodyParas.slice(1)];
        } else {
          newBodyContent = [
            { type: 'paragraph', content: [{ type: 'text', text: titleText }] },
            ...bodyParas,
          ];
        }
      }
      return {
        ...node,
        content: [{ type: NODE_TYPES.ADMONITION_BODY, content: newBodyContent }],
      };
    }
  }
  if (Array.isArray(node.content)) {
    return { ...node, content: node.content.map(migrateLegacyAdmonitionPanels) };
  }
  return node;
}

/**
 * Parse a content value: if it looks like JSON (object or starts with '{'),
 * return `{ type: 'json', value }` for Milkdown defaultValueCtx.
 * Otherwise return the raw string (treated as Markdown by Milkdown).
 * @param {string|null|undefined} content
 * @returns {{ type: 'json', value: object }|string}
 */
export function parseContentForEditor(content) {
  if (!content) return '';
  if (typeof content === 'object') {
    return { type: 'json', value: migrateLegacyAdmonitionPanels(content) };
  }
  if (typeof content === 'string') {
    const withoutBom = content.replace(/^\uFEFF/, '');
    const trimmed = withoutBom.trimStart();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(withoutBom);
        return { type: 'json', value: migrateLegacyAdmonitionPanels(parsed) };
      } catch {
        // not valid JSON
      }
    }
    return withoutBom;
  }
  return content;
}
