/**
 * GFM table keymap binds Enter to exitTable. This runs first (higher priority)
 * and inserts a hard break inside table cells so Enter creates a new line.
 * Mod-Enter still exits the table via the default table keymap.
 *
 * Milkdown's insertHardbreakCommand sets meta `hardbreak`, which hardbreakFilterPlugin
 * uses to block inserts inside `table`. We insert the same node without that meta so
 * the filter allows it (same idea as a manual line break in a table cell).
 */
import { isInTable } from '@milkdown/kit/prose/tables';
import { TextSelection } from '@milkdown/kit/prose/state';
import { $useKeymap } from '@milkdown/kit/utils';

export const tableCellEnterLineBreakKeymap = $useKeymap('tableCellEnterLineBreak', {
  LineBreakInTableCell: {
    priority: 101,
    shortcuts: 'Enter',
    command: () => (state, dispatch) => {
      if (!isInTable(state)) return false;
      const { selection, schema } = state;
      if (!(selection instanceof TextSelection)) return false;

      const hardbreak = schema.nodes.hardbreak || schema.nodes.hard_break;
      if (!hardbreak) return false;

      dispatch?.(state.tr.replaceSelectionWith(hardbreak.create()).scrollIntoView());
      return true;
    },
  },
  NormalEnterSplitsBlock: {
    // Fires before GFM/commonmark Enter handlers (higher priority number = runs first).
    // Explicitly splits into a paragraph to prevent inheriting fence/code_block type
    // from the current node — the root cause of the "gray container on Enter" bug.
    priority: 120,
    shortcuts: 'Enter',
    command: () => (state, dispatch) => {
      if (isInTable(state)) return false;
      if (!(state.selection instanceof TextSelection)) return false;

      const { $from, empty } = state.selection;
      if (!empty) return false;

      const parentName = $from.parent.type.name;
      // Let default handlers deal with Enter inside intentional code blocks.
      if (parentName === 'code_block' || parentName === 'fence') return false;
      if (!$from.parent.isTextblock) return false;

      const paragraphType = state.schema.nodes.paragraph;
      if (!paragraphType) return false;

      try {
        // Passing [{ type: paragraphType }] as typesAfter forces the new block to
        // always be a paragraph regardless of what the current node's type is.
        const tr = state.tr
          .split(state.selection.from, 1, [{ type: paragraphType }])
          .scrollIntoView();
        if (tr.docChanged) {
          dispatch?.(tr);
          return true;
        }
      } catch {
        // Fall through to default handlers.
      }
      return false;
    },
  },
});
