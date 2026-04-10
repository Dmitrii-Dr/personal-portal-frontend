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

      const hardbreak = schema.nodes.hardbreak;
      if (!hardbreak) return false;

      dispatch?.(state.tr.replaceSelectionWith(hardbreak.create()).scrollIntoView());
      return true;
    },
  },
});
