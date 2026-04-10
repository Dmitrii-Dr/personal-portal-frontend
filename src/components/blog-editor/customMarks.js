/**
 * Custom Milkdown marks: text color, background color, font size, font family, text alignment.
 */
import { $mark } from '@milkdown/kit/utils';
import { $command } from '@milkdown/kit/utils';

export const textColorMark = $mark('textColor', () => ({
  attrs: { color: { default: '#000000' } },
  parseDOM: [
    {
      style: 'color',
      getAttrs: (value) => (value ? { color: value } : false),
    },
  ],
  toDOM: (mark) => ['span', { style: `color: ${mark.attrs.color}`, 'data-text-color': mark.attrs.color }, 0],
}));

export const bgColorMark = $mark('bgColor', () => ({
  attrs: { color: { default: '#ffff00' } },
  parseDOM: [
    {
      style: 'background-color',
      getAttrs: (value) => (value ? { color: value } : false),
    },
  ],
  toDOM: (mark) => ['span', { style: `background-color: ${mark.attrs.color}`, 'data-bg-color': mark.attrs.color }, 0],
}));

export const fontSizeMark = $mark('fontSize', () => ({
  attrs: { size: { default: '16px' } },
  parseDOM: [
    {
      style: 'font-size',
      getAttrs: (value) => (value ? { size: value } : false),
    },
  ],
  toDOM: (mark) => ['span', { style: `font-size: ${mark.attrs.size}`, 'data-font-size': mark.attrs.size }, 0],
}));

export const fontFamilyMark = $mark('fontFamily', () => ({
  attrs: { family: { default: 'inherit' } },
  parseDOM: [
    {
      style: 'font-family',
      getAttrs: (value) => (value ? { family: value } : false),
    },
  ],
  toDOM: (mark) => ['span', { style: `font-family: ${mark.attrs.family}`, 'data-font-family': mark.attrs.family }, 0],
}));

export const textAlignMark = $mark('textAlign', () => ({
  attrs: { align: { default: 'left' } },
  parseDOM: [
    {
      style: 'text-align',
      getAttrs: (value) => (value ? { align: value } : false),
    },
  ],
  // Must stay in the inline layout flow. `display:block;width:100%` on each marked
  // fragment forces a line break after bold/italic splits text into multiple nodes.
  toDOM: (mark) => [
    'span',
    {
      style: `display:contents;text-align:${mark.attrs.align};`,
      'data-text-align': mark.attrs.align,
    },
    0,
  ],
}));

/** Apply / remove textColor mark on selection */
export const setTextColorCommand = $command('SetTextColor', (ctx) => {
  return (payload) => (state, dispatch) => {
    const color = payload?.color;
    const { from, to } = state.selection;
    if (from === to) return false;
    const markType = state.schema.marks.textColor;
    if (!markType) return false;
    if (dispatch) {
      const tr = color
        ? state.tr.addMark(from, to, markType.create({ color }))
        : state.tr.removeMark(from, to, markType);
      dispatch(tr);
    }
    return true;
  };
});

/** Apply / remove bgColor mark on selection */
export const setBgColorCommand = $command('SetBgColor', (ctx) => {
  return (payload) => (state, dispatch) => {
    const color = payload?.color;
    const { from, to } = state.selection;
    if (from === to) return false;
    const markType = state.schema.marks.bgColor;
    if (!markType) return false;
    if (dispatch) {
      const tr = color
        ? state.tr.addMark(from, to, markType.create({ color }))
        : state.tr.removeMark(from, to, markType);
      dispatch(tr);
    }
    return true;
  };
});

export const setFontSizeCommand = $command('SetFontSize', (ctx) => {
  return (payload) => (state, dispatch) => {
    const size = payload?.size;
    const { from, to } = state.selection;
    if (from === to) return false;
    const markType = state.schema.marks.fontSize;
    if (!markType) return false;
    if (dispatch) {
      const tr = size
        ? state.tr.addMark(from, to, markType.create({ size }))
        : state.tr.removeMark(from, to, markType);
      dispatch(tr);
    }
    return true;
  };
});

export const setFontFamilyCommand = $command('SetFontFamily', (ctx) => {
  return (payload) => (state, dispatch) => {
    const family = payload?.family;
    const { from, to } = state.selection;
    if (from === to) return false;
    const markType = state.schema.marks.fontFamily;
    if (!markType) return false;
    if (dispatch) {
      const tr = family
        ? state.tr.addMark(from, to, markType.create({ family }))
        : state.tr.removeMark(from, to, markType);
      dispatch(tr);
    }
    return true;
  };
});

export const setTextAlignCommand = $command('SetTextAlign', (ctx) => {
  return (payload) => (state, dispatch) => {
    const align = payload?.align;
    const { from, to } = state.selection;
    if (from === to) return false;
    const markType = state.schema.marks.textAlign;
    if (!markType) return false;
    if (dispatch) {
      const tr = align
        ? state.tr.addMark(from, to, markType.create({ align }))
        : state.tr.removeMark(from, to, markType);
      dispatch(tr);
    }
    return true;
  };
});

export const colorPlugin = [
  textColorMark,
  bgColorMark,
  fontSizeMark,
  fontFamilyMark,
  textAlignMark,
  setTextColorCommand,
  setBgColorCommand,
  setFontSizeCommand,
  setFontFamilyCommand,
  setTextAlignCommand,
];
