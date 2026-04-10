/**
 * Block line-height on paragraph and heading (serialized on <p> / <h*> as line-height style).
 */
import { paragraphSchema, headingSchema } from '@milkdown/kit/preset/commonmark';
import { $command } from '@milkdown/kit/utils';

export const DEFAULT_BLOCK_LINE_HEIGHT = '1.5';

function enrichParseDOMRule(rule) {
  return {
    ...rule,
    getAttrs: (dom) => {
      const raw = rule.getAttrs ? rule.getAttrs(dom) : {};
      if (raw === false) return false;
      const prevAttrs = raw || {};
      const lh =
        dom instanceof HTMLElement && dom.style.lineHeight?.trim()
          ? dom.style.lineHeight
          : null;
      if (lh) return { ...prevAttrs, lineHeight: lh };
      return prevAttrs;
    },
  };
}

function mergeLineHeightIntoDOM(base, node) {
  const result = base.toDOM(node);
  const raw = node.attrs.lineHeight;
  const lh =
    raw != null && String(raw).trim() !== ''
      ? String(raw).trim()
      : DEFAULT_BLOCK_LINE_HEIGHT;
  if (!Array.isArray(result)) return result;
  const [tag, attrs, ...rest] = result;
  const pad = rest.length ? rest : [0];
  if (typeof attrs !== 'object' || attrs === null) {
    return [tag, { style: `line-height:${lh}` }, ...pad];
  }
  const prevStyle = attrs.style != null ? String(attrs.style) : '';
  const style = prevStyle ? `${prevStyle};line-height:${lh}` : `line-height:${lh}`;
  return [tag, { ...attrs, style }, ...pad];
}

const extendBlockLineHeight = (prev) => (ctx) => {
  const base = prev(ctx);
  return {
    ...base,
    attrs: {
      ...(base.attrs || {}),
      lineHeight: { default: DEFAULT_BLOCK_LINE_HEIGHT, validate: 'string|null' },
    },
    parseDOM: (base.parseDOM || []).map(enrichParseDOMRule),
    toDOM: (node) => mergeLineHeightIntoDOM(base, node),
  };
};

export const paragraphLineHeightSchema = paragraphSchema.extendSchema(extendBlockLineHeight);
export const headingLineHeightSchema = headingSchema.extendSchema(extendBlockLineHeight);

/** Plugins to register after `commonmark` (replaces paragraph + heading specs). */
export const blockLineHeightSchemaPlugins = [
  ...paragraphLineHeightSchema,
  ...headingLineHeightSchema,
];

const BLOCKS_WITH_LINE_HEIGHT = ['paragraph', 'heading'];

function lineHeightBlockPositions(state) {
  const { from, to, empty } = state.selection;
  const set = new Set();
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (BLOCKS_WITH_LINE_HEIGHT.includes(node.type.name)) set.add(pos);
  });
  if (set.size === 0 && empty) {
    const $from = state.selection.$from;
    for (let d = $from.depth; d > 0; d -= 1) {
      const n = $from.node(d);
      if (BLOCKS_WITH_LINE_HEIGHT.includes(n.type.name)) {
        set.add($from.before(d));
        break;
      }
    }
  }
  return [...set];
}

export const setBlockLineHeightCommand = $command('SetBlockLineHeight', () => {
  return (payload) => (state, dispatch) => {
    const lineHeight =
      payload?.lineHeight != null && String(payload.lineHeight).trim() !== ''
        ? String(payload.lineHeight).trim()
        : DEFAULT_BLOCK_LINE_HEIGHT;
    const positions = lineHeightBlockPositions(state);
    if (positions.length === 0) return false;

    if (dispatch) {
      let tr = state.tr;
      positions.forEach((pos) => {
        const node = tr.doc.nodeAt(pos);
        if (!node || !BLOCKS_WITH_LINE_HEIGHT.includes(node.type.name)) return;
        tr = tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          lineHeight,
        });
      });
      dispatch(tr.scrollIntoView());
    }
    return true;
  };
});

export const blockLineHeightPlugin = [
  ...blockLineHeightSchemaPlugins,
  setBlockLineHeightCommand,
];
