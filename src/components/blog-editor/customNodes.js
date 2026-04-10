/**
 * Custom Milkdown nodes: customImage, admonitionPanel, admonitionBody
 * Phases 4 (image stub), 6 (admonition), 8 (image full)
 */
import { $node } from '@milkdown/kit/utils';
import { $command } from '@milkdown/kit/utils';
import { TextSelection } from '@milkdown/kit/prose/state';

// ─── customImage ──────────────────────────────────────────────────────────────

export const customImageNode = $node('customImage', () => ({
  inline: false,
  group: 'block',
  attrs: {
    mediaId: { default: null },
    width: { default: null },
    height: { default: null },
    alignment: { default: 'center' },
  },
  draggable: true,
  parseDOM: [
    {
      tag: 'figure[data-custom-image]',
      getAttrs: (dom) => ({
        mediaId: dom.getAttribute('data-media-id') || null,
        width: dom.getAttribute('data-width') ? parseInt(dom.getAttribute('data-width'), 10) : null,
        height: dom.getAttribute('data-height') ? parseInt(dom.getAttribute('data-height'), 10) : null,
        alignment: dom.getAttribute('data-alignment') || 'center',
      }),
    },
  ],
  toDOM: (node) => [
    'figure',
    {
      'data-custom-image': '',
      'data-media-id': node.attrs.mediaId || '',
      'data-width': node.attrs.width !== null ? String(node.attrs.width) : '',
      'data-height': node.attrs.height !== null ? String(node.attrs.height) : '',
      'data-alignment': node.attrs.alignment || 'center',
    },
  ],
}));

/** Insert a customImage node at the current selection */
export const insertCustomImageCommand = $command('InsertCustomImage', () => {
  return (payload) => (state, dispatch) => {
    const { mediaId, width = null, height = null, alignment = 'center' } = payload || {};
    if (!mediaId) return false;
    const nodeType = state.schema.nodes.customImage;
    if (!nodeType) return false;
    const node = nodeType.create({ mediaId, width, height, alignment });
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(node));
    }
    return true;
  };
});

/** Update attrs on an existing customImage node (by absolute position) */
export const updateCustomImageAttrsCommand = $command('UpdateCustomImageAttrs', () => {
  return (payload) => (state, dispatch) => {
    const { pos, attrs } = payload || {};
    if (pos === undefined || pos === null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'customImage') return false;
    if (dispatch) {
      dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
    }
    return true;
  };
});

// ─── admonitionPanel ─────────────────────────────────────────────────────────

export const admonitionBodyNode = $node('admonitionBody', () => ({
  content: 'block+',
  parseDOM: [{ tag: 'div[data-admonition-body]' }],
  toDOM: () => ['div', { 'data-admonition-body': '' }, 0],
}));

export const admonitionPanelNode = $node('admonitionPanel', () => ({
  content: 'admonitionBody',
  group: 'block',
  attrs: {
    fontSize: { default: null },
    textColor: { default: null },
    bgColor: { default: '#e3f2fd' },
  },
  parseDOM: [
    {
      tag: 'div[data-admonition-panel]',
      getAttrs: (dom) => ({
        fontSize: dom.getAttribute('data-font-size') || null,
        textColor: dom.getAttribute('data-text-color') || null,
        bgColor: dom.getAttribute('data-bg-color') || '#e3f2fd',
      }),
    },
  ],
  toDOM: (node) => [
    'div',
    {
      'data-admonition-panel': '',
      'data-font-size': node.attrs.fontSize || '',
      'data-text-color': node.attrs.textColor || '',
      'data-bg-color': node.attrs.bgColor || '#e3f2fd',
    },
    0,
  ],
}));

/** Insert a new admonition panel at the current selection */
export const insertAdmonitionCommand = $command('InsertAdmonition', () => {
  return () => (state, dispatch) => {
    const { schema } = state;
    const panelType = schema.nodes.admonitionPanel;
    const bodyType = schema.nodes.admonitionBody;
    const paragraphType = schema.nodes.paragraph;
    if (!panelType || !bodyType) return false;
    try {
      const bodyNode = bodyType.create(null, schema.nodes.paragraph.create());
      const panelNode = panelType.create(null, [bodyNode]);
      if (dispatch) {
        const startPos = state.selection.from;
        let tr = state.tr.replaceSelectionWith(panelNode);
        if (paragraphType) {
          let panelPos = tr.mapping.map(startPos, -1);
          let insertedPanel = tr.doc.nodeAt(panelPos);

          // Fallback for edge mappings where position may land adjacent.
          if (!insertedPanel || insertedPanel.type !== panelType) {
            const prevPos = Math.max(0, panelPos - 1);
            const prevNode = tr.doc.nodeAt(prevPos);
            if (prevNode && prevNode.type === panelType) {
              panelPos = prevPos;
              insertedPanel = prevNode;
            }
          }

          if (insertedPanel && insertedPanel.type === panelType) {
            const afterPanelPos = panelPos + insertedPanel.nodeSize;
            tr = tr.insert(afterPanelPos, paragraphType.create());
            tr = tr.setSelection(TextSelection.create(tr.doc, afterPanelPos + 1));
          }
        }
        dispatch(tr.scrollIntoView());
      }
      return true;
    } catch {
      return false;
    }
  };
});

/** Update admonition panel attrs (fontSize, textColor, bgColor) by position */
export const updateAdmonitionAttrsCommand = $command('UpdateAdmonitionAttrs', () => {
  return (payload) => (state, dispatch) => {
    const { pos, attrs } = payload || {};
    if (pos === undefined || pos === null) return false;
    const node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'admonitionPanel') return false;
    if (dispatch) {
      dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
    }
    return true;
  };
});

export const customImagePlugin = [customImageNode, insertCustomImageCommand, updateCustomImageAttrsCommand];
export const admonitionPlugin = [
  admonitionBodyNode,
  admonitionPanelNode,
  insertAdmonitionCommand,
  updateAdmonitionAttrsCommand,
];
