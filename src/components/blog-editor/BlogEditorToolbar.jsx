/**
 * BlogEditorToolbar — MUI toolbar wired to Milkdown editor (Phases 4, 5, 6, 7, 8).
 * Must be rendered inside <MilkdownProvider>.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useInstance } from '@milkdown/react';
import { callCommand } from '@milkdown/kit/utils';
import { editorViewCtx } from '@milkdown/kit/core';
import { undo, redo } from '@milkdown/kit/prose/history';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  wrapInHeadingCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
} from '@milkdown/kit/preset/commonmark';
import { toggleStrikethroughCommand } from '@milkdown/kit/preset/gfm';
import { insertTableCommand } from '@milkdown/kit/preset/gfm';
import {
  Box,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  Popover,
  Typography,
  Button,
  Chip,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import LinkIcon from '@mui/icons-material/Link';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

import { TextSelection } from '@milkdown/kit/prose/state';

import { insertAdmonitionCommand } from './customNodes';
import {
  setTextColorCommand,
  setBgColorCommand,
  setFontSizeCommand,
  setFontFamilyCommand,
  setTextAlignCommand,
} from './customMarks';
import { DEFAULT_BLOCK_LINE_HEIGHT, setBlockLineHeightCommand } from './blockLineHeight';
import GalleryDialog from './GalleryDialog';
import InsertLinkDialog from './InsertLinkDialog';
import BlogEmojiPickerPopover from './BlogEmojiPickerPopover';

/** Add https:// when the user omits a scheme (keeps /paths, #anchors, mailto:, etc.). */
function normalizeArticleLinkHref(raw) {
  const s = raw.trim();
  if (!s) return s;
  if (/^[a-z][\w+.-]*:/i.test(s)) return s;
  if (s.startsWith('/') || s.startsWith('#')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return `https://${s}`;
}

/**
 * If the selection (or cursor inside a link) sits on link mark(s) with one href, return it.
 */
function getLinkHrefHint(state) {
  const linkType = state.schema.marks.link;
  if (!linkType) return '';

  const { from, to, empty, $from } = state.selection;

  if (!empty) {
    let href;
    let hasText = false;
    let invalid = false;
    state.doc.nodesBetween(from, to, (node) => {
      if (!node.isText) return;
      hasText = true;
      const lm = node.marks.find((m) => m.type === linkType);
      if (!lm) {
        invalid = true;
        return false;
      }
      const h = lm.attrs.href;
      if (href === undefined) href = h;
      else if (href !== h) invalid = true;
    });
    if (!hasText || invalid) return '';
    return href || '';
  }

  const atCursor = $from.marks().find((m) => m.type === linkType);
  return atCursor?.attrs?.href || '';
}

const HEADING_LEVELS = [
  { label: 'H1', level: 1 },
  { label: 'H2', level: 2 },
  { label: 'H3', level: 3 },
  { label: 'H4', level: 4 },
  { label: 'H5', level: 5 },
];
const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const FONT_FAMILIES = [
  { label: 'Default', value: 'inherit' },
  { label: 'Inter', value: 'Inter, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
];

/** Line spacing (line-height) for the current paragraph or heading */
function effectiveLineHeight(raw) {
  if (raw == null || raw === '') return DEFAULT_BLOCK_LINE_HEIGHT;
  return String(raw).trim();
}

const LINE_HEIGHT_PRESETS = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5', value: DEFAULT_BLOCK_LINE_HEIGHT },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
];

const PRESET_TEXT_COLORS = [
  '#000000', '#e53935', '#d81b60', '#8e24aa',
  '#3949ab', '#1e88e5', '#00897b', '#43a047',
  '#fb8c00', '#f4511e', '#6d4c41', '#757575',
];

const PRESET_BG_COLORS = [
  'transparent', '#fff9c4', '#c8e6c9', '#bbdefb',
  '#fce4ec', '#f3e5f5', '#e0f7fa', '#fff3e0',
];

const ColorPalette = ({ colors, onSelect, isTransparent }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1, maxWidth: 180 }}>
    {colors.map((c) => (
      <Box
        key={c}
        onClick={() => onSelect(c === 'transparent' ? null : c)}
        title={c}
        sx={{
          width: 20,
          height: 20,
          bgcolor: c === 'transparent' ? 'transparent' : c,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.5,
          cursor: 'pointer',
          backgroundImage:
            c === 'transparent'
              ? 'linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%)'
              : 'none',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0,4px 4px',
          '&:hover': { opacity: 0.7 },
        }}
      />
    ))}
  </Box>
);

const BlogEditorToolbar = ({ disabled, onImageUpload, onImageFromGallery, showImageButtons = true }) => {
  const [loading, getInstance] = useInstance();
  const [textColorAnchor, setTextColorAnchor] = useState(null);
  const [bgColorAnchor, setBgColorAnchor] = useState(null);
  const [headingAnchor, setHeadingAnchor] = useState(null);
  const [fontSizeAnchor, setFontSizeAnchor] = useState(null);
  const [fontFamilyAnchor, setFontFamilyAnchor] = useState(null);
  const [lineHeightAnchor, setLineHeightAnchor] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogInitial, setLinkDialogInitial] = useState({ text: '', href: '' });
  const [emojiPickerAnchor, setEmojiPickerAnchor] = useState(null);
  const [inTable, setInTable] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strike: false,
    bulletList: false,
    orderedList: false,
    headingLevel: null,
    fontSize: null,
    fontFamily: null,
    textAlign: null,
    textColor: null,
    bgColor: null,
    lineHeight: null,
    hasLineHeightBlock: false,
  });
  const uploadInputRef = useRef(null);

  const run = (cmd, payload) => {
    if (loading) return;
    getInstance()?.action(callCommand(cmd.key, payload));
  };
  const runInView = (callback) => {
    if (loading) return;
    getInstance()?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      callback(view);
    });
  };

  const runTableCommand = async (commandName) => {
    const tableCommands = await import('prosemirror-tables');
    const tableCommand = tableCommands[commandName];
    if (typeof tableCommand !== 'function') return;
    runInView((view) => {
      // Run only when the command is valid for the current selection.
      // This avoids accidental structural edits when focus/selection moved.
      const canRun = tableCommand(view.state);
      if (!canRun) {
        view.focus();
        return;
      }
      tableCommand(view.state, view.dispatch);
      view.focus();
    });
  };

  const runMergeCellsCommand = async () => {
    const tableCommands = await import('prosemirror-tables');
    const { mergeCells, CellSelection, selectedRect, addColSpan } = tableCommands;
    if (typeof mergeCells !== 'function') return;

    runInView((view) => {
      const { state } = view;
      const { selection, schema } = state;

      // Use the built-in check (validates CellSelection, rectangle, no overlap).
      if (!mergeCells(state)) {
        view.focus();
        return;
      }

      // Milkdown GFM cells have cellContent:'paragraph' (exactly one paragraph),
      // so the built-in mergeCells would violate the schema when appending content
      // from multiple cells. We implement the merge manually, joining all cell text
      // into a single paragraph with hard breaks between values.
      const rect = selectedRect(state);
      const { map, tableStart, table } = rect;

      const tr = state.tr;
      const seen = {};
      let mergedPos = null;
      let mergedCell = null;
      const cellTexts = [];

      for (let row = rect.top; row < rect.bottom; row++) {
        for (let col = rect.left; col < rect.right; col++) {
          const cellPos = map.map[row * map.width + col];
          const cell = table.nodeAt(cellPos);
          if (seen[cellPos] || !cell) continue;
          seen[cellPos] = true;

          const text = cell.textBetween(0, cell.content.size, '\n', '').trim();
          if (text) cellTexts.push(text);

          if (mergedPos == null) {
            mergedPos = cellPos;
            mergedCell = cell;
          } else {
            const mapped = tr.mapping.map(cellPos + tableStart);
            tr.delete(mapped, mapped + cell.nodeSize);
          }
        }
      }

      if (mergedPos == null || mergedCell == null) {
        view.focus();
        return;
      }

      tr.setNodeMarkup(tr.mapping.map(mergedPos + tableStart), null, {
        ...addColSpan(
          mergedCell.attrs,
          mergedCell.attrs.colspan,
          rect.right - rect.left - mergedCell.attrs.colspan,
        ),
        rowspan: rect.bottom - rect.top,
      });

      const mappedMergedPos = tr.mapping.map(mergedPos + tableStart);
      const mergedNode = tr.doc.nodeAt(mappedMergedPos);

      if (mergedNode) {
        const inlineContent = [];
        const hardBreak = schema.nodes.hardbreak;

        for (let i = 0; i < cellTexts.length; i++) {
          if (i > 0 && hardBreak) inlineContent.push(hardBreak.create());
          if (cellTexts[i]) inlineContent.push(schema.text(cellTexts[i]));
        }

        const para = schema.nodes.paragraph.create(
          null,
          inlineContent.length > 0 ? inlineContent : undefined,
        );

        tr.replaceWith(
          mappedMergedPos + 1,
          mappedMergedPos + mergedNode.nodeSize - 1,
          para,
        );
      }

      const finalPos = tr.mapping.map(mergedPos + tableStart);
      tr.setSelection(new CellSelection(tr.doc.resolve(finalPos)));
      view.dispatch(tr.scrollIntoView());
      view.focus();
    });
  };

  const updateActiveFormats = useCallback(() => {
    if (loading) return;
    getInstance()?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { schema, selection } = state;
      const { from, to, empty, $from } = selection;

      const marks = [];
      if (empty) {
        if (state.storedMarks?.length) {
          marks.push(...state.storedMarks);
        }
        marks.push(...$from.marks());
      } else {
        state.doc.nodesBetween(from, to, (node) => {
          if (node.isText && node.marks?.length) {
            marks.push(...node.marks);
          }
        });
      }

      const hasAnyMark = (names) => {
        const markTypes = names
          .map((name) => schema.marks[name])
          .filter(Boolean);
        return markTypes.length > 0 && marks.some((mark) => markTypes.includes(mark.type));
      };

      const findAncestorNode = (typeName) => {
        for (let depth = $from.depth; depth >= 0; depth -= 1) {
          const node = $from.node(depth);
          if (node.type.name === typeName) return node;
        }
        return null;
      };

      const headingNode = findAncestorNode('heading');
      const paragraphNode = findAncestorNode('paragraph');
      const lineHeightBlock = headingNode || paragraphNode;
      const textColorMark = schema.marks.textColor
        ? marks.find((mark) => mark.type === schema.marks.textColor)
        : null;
      const bgColorMark = schema.marks.bgColor
        ? marks.find((mark) => mark.type === schema.marks.bgColor)
        : null;
      const fontSizeMark = schema.marks.fontSize
        ? marks.find((mark) => mark.type === schema.marks.fontSize)
        : null;
      const fontFamilyMark = schema.marks.fontFamily
        ? marks.find((mark) => mark.type === schema.marks.fontFamily)
        : null;
      const textAlignMark = schema.marks.textAlign
        ? marks.find((mark) => mark.type === schema.marks.textAlign)
        : null;

      setActiveFormats({
        bold: hasAnyMark(['strong', 'bold']),
        italic: hasAnyMark(['em', 'emphasis', 'italic']),
        strike: hasAnyMark(['strike_through', 'strikethrough', 'strike']),
        bulletList: Boolean(findAncestorNode('bullet_list')),
        orderedList: Boolean(findAncestorNode('ordered_list')),
        headingLevel: headingNode?.attrs?.level ?? null,
        fontSize: fontSizeMark?.attrs?.size ?? null,
        fontFamily: fontFamilyMark?.attrs?.family ?? null,
        textAlign: textAlignMark?.attrs?.align ?? null,
        textColor: textColorMark?.attrs?.color ?? null,
        bgColor: bgColorMark?.attrs?.color ?? null,
        lineHeight: lineHeightBlock?.attrs?.lineHeight ?? null,
        hasLineHeightBlock: Boolean(lineHeightBlock),
      });
    });
  }, [loading, getInstance]);

  const updateInTable = useCallback(() => {
    if (loading) return;
    getInstance()?.action((ctx) => {
      try {
        const view = ctx.get(editorViewCtx);
        const { $from } = view.state.selection;
        let found = false;
        for (let depth = $from.depth; depth >= 0; depth -= 1) {
          if ($from.node(depth).type.name === 'table') {
            found = true;
            break;
          }
        }
        setInTable(found);
      } catch {
        setInTable(false);
      }
    });
  }, [loading, getInstance]);

  useEffect(() => {
    if (loading) return undefined;

    let cleanup;
    getInstance()?.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const refresh = () => {
        updateActiveFormats();
        updateInTable();
      };

      refresh();
      view.dom.addEventListener('mouseup', refresh);
      view.dom.addEventListener('keyup', refresh);
      view.dom.addEventListener('input', refresh);
      document.addEventListener('selectionchange', refresh);

      cleanup = () => {
        view.dom.removeEventListener('mouseup', refresh);
        view.dom.removeEventListener('keyup', refresh);
        view.dom.removeEventListener('input', refresh);
        document.removeEventListener('selectionchange', refresh);
      };
    });

    return () => cleanup?.();
  }, [loading, getInstance, updateActiveFormats, updateInTable]);

  const handleTextColor = (color) => {
    setTextColorAnchor(null);
    run(setTextColorCommand, color ? { color } : { color: null });
  };

  const handleBgColor = (color) => {
    setBgColorAnchor(null);
    run(setBgColorCommand, color ? { color } : { color: null });
  };

  const handleInsertImage = (mediaId) => {
    if (onImageFromGallery) {
      onImageFromGallery(mediaId);
    }
  };

  const handleOpenLinkDialog = () => {
    runInView((view) => {
      const { state } = view;
      const { from, to, empty } = state.selection;
      const selectedText = empty ? '' : state.doc.textBetween(from, to, '');
      const hrefHint = getLinkHrefHint(state);
      setLinkDialogInitial({
        text: selectedText,
        href: hrefHint,
      });
      setLinkDialogOpen(true);
    });
  };

  const handleConfirmInsertLink = ({ displayText, href: rawHref }) => {
    const href = normalizeArticleLinkHref(rawHref);
    if (!href) return;
    const label = displayText || href;
    runInView((view) => {
      const { state } = view;
      const linkType = state.schema.marks.link;
      if (!linkType) return;
      const mark = linkType.create({ href, title: null });
      const textNode = state.schema.text(label, [mark]);
      const { from, to } = state.selection;
      let tr = state.tr.replaceWith(from, to, textNode);
      const cursorAfter = from + textNode.nodeSize;
      tr = tr.setSelection(TextSelection.create(tr.doc, cursorAfter));
      view.dispatch(tr.scrollIntoView());
      view.focus();
    });
    setLinkDialogOpen(false);
  };

  const handleInsertEmoji = (emoji) => {
    if (!emoji) return;
    runInView((view) => {
      const { state } = view;
      const { from, to } = state.selection;
      const textNode = state.schema.text(emoji);
      let tr = state.tr.replaceWith(from, to, textNode);
      const after = from + textNode.nodeSize;
      tr = tr.setSelection(TextSelection.create(tr.doc, after));
      view.dispatch(tr.scrollIntoView());
      view.focus();
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file && onImageUpload) {
      onImageUpload(file);
    }
  };

  const handleUndo = () => {
    runInView((view) => {
      undo(view.state, view.dispatch);
      view.focus();
    });
  };

  const handleRedo = () => {
    runInView((view) => {
      redo(view.state, view.dispatch);
      view.focus();
    });
  };

  const handleClearFormatting = () => {
    runInView((view) => {
      const { state } = view;
      const { from, to, empty } = state.selection;
      if (empty) return;

      let tr = state.tr;
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isText || node.marks.length === 0) return;
        const markFrom = Math.max(pos, from);
        const markTo = Math.min(pos + node.nodeSize, to);
        node.marks.forEach((mark) => {
          tr = tr.removeMark(markFrom, markTo, mark.type);
        });
      });

      if (tr.docChanged) {
        view.dispatch(tr.scrollIntoView());
      }
      view.focus();
    });
  };

  const handleParagraph = () => {
    runInView((view) => {
      const { state } = view;
      const { from, to } = state.selection;
      const paragraph = state.schema.nodes.paragraph;
      if (!paragraph) return;
      const tr = state.tr.setBlockType(from, to, paragraph);
      if (tr.docChanged) {
        view.dispatch(tr.scrollIntoView());
      }
      view.focus();
    });
  };

  const handleHeadingChange = (level) => {
    setHeadingAnchor(null);
    if (level == null) {
      handleParagraph();
      return;
    }
    run(wrapInHeadingCommand, level);
  };

  const handleFontSize = (size) => {
    setFontSizeAnchor(null);
    run(setFontSizeCommand, size === 'inherit' ? { size: null } : { size });
  };

  const handleFontFamily = (family) => {
    setFontFamilyAnchor(null);
    run(setFontFamilyCommand, family === 'inherit' ? { family: null } : { family });
  };

  const handleTextAlign = (align) => {
    run(setTextAlignCommand, align ? { align } : { align: null });
  };

  const handleLineHeight = (value) => {
    setLineHeightAnchor(null);
    run(setBlockLineHeightCommand, { lineHeight: value });
  };

  const lineHeightButtonLabel = (() => {
    const eff = effectiveLineHeight(activeFormats.lineHeight);
    const preset = LINE_HEIGHT_PRESETS.find((p) => p.value === eff);
    return preset?.label ?? eff;
  })();

  const ToolbarBtn = ({ title, onClick, children, active }) => (
    <Tooltip title={title} arrow>
      <span>
        <IconButton
          size="small"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled || loading}
          sx={{
            borderRadius: 1,
            bgcolor: active ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  /** Compact icon button for the table toolbar row */
  const TableBtn = ({ title, onClick, danger, children }) => (
    <Tooltip title={title} arrow placement="top">
      <span>
        <IconButton
          size="small"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled || loading}
          sx={{
            borderRadius: 0.75,
            width: 28,
            height: 28,
            color: danger ? 'error.main' : 'text.secondary',
            '&:hover': {
              bgcolor: danger ? 'rgba(211,47,47,0.08)' : 'action.hover',
              color: danger ? 'error.dark' : 'text.primary',
            },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Box
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {/* ── Main toolbar row ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.25,
          p: 0.5,
        }}
      >
        {/* Headings dropdown */}
        <Tooltip title="Text type: paragraph or heading" arrow>
          <span>
            <Button
              size="small"
              onClick={(e) => setHeadingAnchor(e.currentTarget)}
              disabled={disabled || loading}
              endIcon={<ArrowDropDownIcon fontSize="small" />}
              sx={{
                borderRadius: 1,
                minWidth: 72,
                px: 1,
                fontSize: '12px',
                textTransform: 'none',
                color: 'text.primary',
                bgcolor: activeFormats.headingLevel != null ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {activeFormats.headingLevel ? `H${activeFormats.headingLevel}` : 'P'}
            </Button>
          </span>
        </Tooltip>
        <Menu
          anchorEl={headingAnchor}
          open={Boolean(headingAnchor)}
          onClose={() => setHeadingAnchor(null)}
        >
          <MenuItem selected={activeFormats.headingLevel == null} onClick={() => handleHeadingChange(null)}>
            Paragraph (P)
          </MenuItem>
          {HEADING_LEVELS.map(({ label, level }) => (
            <MenuItem key={level} selected={activeFormats.headingLevel === level} onClick={() => handleHeadingChange(level)}>
              {label}
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Font size for regular text" arrow>
          <span>
            <Button
              size="small"
              onClick={(e) => setFontSizeAnchor(e.currentTarget)}
              disabled={disabled || loading || activeFormats.headingLevel != null}
              endIcon={<ArrowDropDownIcon fontSize="small" />}
              sx={{
                borderRadius: 1,
                minWidth: 78,
                px: 1,
                fontSize: '12px',
                textTransform: 'none',
                color: 'text.primary',
              }}
            >
              {activeFormats.fontSize || '16px'}
            </Button>
          </span>
        </Tooltip>
        <Menu
          anchorEl={fontSizeAnchor}
          open={Boolean(fontSizeAnchor)}
          onClose={() => setFontSizeAnchor(null)}
        >
          <MenuItem selected={!activeFormats.fontSize} onClick={() => handleFontSize('inherit')}>
            Default
          </MenuItem>
          {FONT_SIZES.map((size) => (
            <MenuItem key={size} selected={activeFormats.fontSize === size} onClick={() => handleFontSize(size)}>
              {size}
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Font style (font family) for regular text" arrow>
          <span>
            <Button
              size="small"
              onClick={(e) => setFontFamilyAnchor(e.currentTarget)}
              disabled={disabled || loading || activeFormats.headingLevel != null}
              endIcon={<ArrowDropDownIcon fontSize="small" />}
              sx={{
                borderRadius: 1,
                minWidth: 96,
                px: 1,
                fontSize: '12px',
                textTransform: 'none',
                color: 'text.primary',
              }}
            >
              {FONT_FAMILIES.find((f) => f.value === activeFormats.fontFamily)?.label || 'Default'}
            </Button>
          </span>
        </Tooltip>
        <Menu
          anchorEl={fontFamilyAnchor}
          open={Boolean(fontFamilyAnchor)}
          onClose={() => setFontFamilyAnchor(null)}
        >
          {FONT_FAMILIES.map((font) => (
            <MenuItem
              key={font.value}
              selected={(activeFormats.fontFamily || 'inherit') === font.value}
              onClick={() => handleFontFamily(font.value)}
              sx={{ fontFamily: font.value === 'inherit' ? 'inherit' : font.value }}
            >
              {font.label}
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Line spacing (paragraph or heading)" arrow>
          <span>
            <Button
              size="small"
              onClick={(e) => setLineHeightAnchor(e.currentTarget)}
              disabled={disabled || loading || !activeFormats.hasLineHeightBlock}
              endIcon={<ArrowDropDownIcon fontSize="small" />}
              sx={{
                borderRadius: 1,
                minWidth: 72,
                px: 1,
                fontSize: '12px',
                textTransform: 'none',
                color: 'text.primary',
                bgcolor:
                  effectiveLineHeight(activeFormats.lineHeight) !== DEFAULT_BLOCK_LINE_HEIGHT
                    ? 'action.selected'
                    : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {lineHeightButtonLabel}
            </Button>
          </span>
        </Tooltip>
        <Menu
          anchorEl={lineHeightAnchor}
          open={Boolean(lineHeightAnchor)}
          onClose={() => setLineHeightAnchor(null)}
        >
          {LINE_HEIGHT_PRESETS.map(({ label, value }) => (
            <MenuItem
              key={label}
              selected={effectiveLineHeight(activeFormats.lineHeight) === value}
              onClick={() => handleLineHeight(value)}
            >
              {label}
            </MenuItem>
          ))}
        </Menu>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Inline formatting */}
        <ToolbarBtn title="Bold (Ctrl+B)" onClick={() => run(toggleStrongCommand)} active={activeFormats.bold}>
          <FormatBoldIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic (Ctrl+I)" onClick={() => run(toggleEmphasisCommand)} active={activeFormats.italic}>
          <FormatItalicIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Strikethrough" onClick={() => run(toggleStrikethroughCommand)} active={activeFormats.strike}>
          <StrikethroughSIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Insert link" onClick={handleOpenLinkDialog}>
          <LinkIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Insert emoji" onClick={(e) => setEmojiPickerAnchor(e.currentTarget)}>
          <EmojiEmotionsIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Clear formatting" onClick={handleClearFormatting}>
          <FormatClearIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Align left" onClick={() => handleTextAlign('left')} active={activeFormats.textAlign === 'left'}>
          <FormatAlignLeftIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Align center" onClick={() => handleTextAlign('center')} active={activeFormats.textAlign === 'center'}>
          <FormatAlignCenterIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Align right" onClick={() => handleTextAlign('right')} active={activeFormats.textAlign === 'right'}>
          <FormatAlignRightIcon fontSize="small" />
        </ToolbarBtn>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <ToolbarBtn title="Undo (Ctrl+Z)" onClick={handleUndo}>
          <UndoIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo (Ctrl+Y / Ctrl+Shift+Z)" onClick={handleRedo}>
          <RedoIcon fontSize="small" />
        </ToolbarBtn>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <ToolbarBtn title="Bullet list" onClick={() => run(wrapInBulletListCommand)} active={activeFormats.bulletList}>
          <FormatListBulletedIcon fontSize="small" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" onClick={() => run(wrapInOrderedListCommand)} active={activeFormats.orderedList}>
          <FormatListNumberedIcon fontSize="small" />
        </ToolbarBtn>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Colors */}
        <Tooltip title="Text color" arrow>
          <span>
            <IconButton
              size="small"
              onClick={(e) => setTextColorAnchor(e.currentTarget)}
              disabled={disabled || loading}
              sx={{
                borderRadius: 1,
                bgcolor: activeFormats.textColor ? 'action.selected' : 'transparent',
                color: activeFormats.textColor || 'inherit',
              }}
            >
              <FormatColorTextIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Popover
          open={Boolean(textColorAnchor)}
          anchorEl={textColorAnchor}
          onClose={() => setTextColorAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Typography variant="caption" sx={{ p: 1, display: 'block' }}>
            Text color
          </Typography>
          <ColorPalette colors={PRESET_TEXT_COLORS} onSelect={handleTextColor} />
          <Box sx={{ p: 1, pt: 0 }}>
            <Button size="small" onClick={() => handleTextColor(null)} sx={{ textTransform: 'none', fontSize: 11 }}>
              Remove color
            </Button>
          </Box>
        </Popover>

        <Tooltip title="Highlight / background color" arrow>
          <span>
            <IconButton
              size="small"
              onClick={(e) => setBgColorAnchor(e.currentTarget)}
              disabled={disabled || loading}
              sx={{
                borderRadius: 1,
                bgcolor: activeFormats.bgColor ? activeFormats.bgColor : 'transparent',
              }}
            >
              <BorderColorIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Popover
          open={Boolean(bgColorAnchor)}
          anchorEl={bgColorAnchor}
          onClose={() => setBgColorAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Typography variant="caption" sx={{ p: 1, display: 'block' }}>
            Background color
          </Typography>
          <ColorPalette colors={PRESET_BG_COLORS} onSelect={handleBgColor} />
          <Box sx={{ p: 1, pt: 0 }}>
            <Button size="small" onClick={() => handleBgColor(null)} sx={{ textTransform: 'none', fontSize: 11 }}>
              Remove color
            </Button>
          </Box>
        </Popover>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Table */}
        <ToolbarBtn title="Insert table (3×3)" onClick={() => run(insertTableCommand, { row: 3, col: 3 })}>
          <TableChartIcon fontSize="small" />
        </ToolbarBtn>

        {/* Admonition panel */}
        <ToolbarBtn title="Insert info panel" onClick={() => run(insertAdmonitionCommand)}>
          <InfoOutlinedIcon fontSize="small" />
        </ToolbarBtn>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Image upload/gallery */}
        {showImageButtons && (
          <>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <ToolbarBtn
              title="Upload image"
              onClick={() => uploadInputRef.current?.click()}
            >
              <CloudUploadIcon fontSize="small" />
            </ToolbarBtn>
            <ToolbarBtn title="Select from gallery" onClick={() => setGalleryOpen(true)}>
              <PhotoLibraryIcon fontSize="small" />
            </ToolbarBtn>
            <GalleryDialog
              open={galleryOpen}
              onClose={() => setGalleryOpen(false)}
              onInsert={handleInsertImage}
            />
          </>
        )}

        <BlogEmojiPickerPopover
          open={Boolean(emojiPickerAnchor)}
          anchorEl={emojiPickerAnchor}
          onClose={() => setEmojiPickerAnchor(null)}
          onSelect={handleInsertEmoji}
        />
        <InsertLinkDialog
          open={linkDialogOpen}
          onClose={() => setLinkDialogOpen(false)}
          onConfirm={handleConfirmInsertLink}
          initialText={linkDialogInitial.text}
          initialHref={linkDialogInitial.href}
        />
      </Box>

      {/* ── Contextual table toolbar row — visible when cursor is inside a table ── */}
      {inTable && !disabled && !loading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            px: 1,
            py: 0.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(99,179,237,0.08)'
                : 'rgba(25,118,210,0.05)',
          }}
        >
          {/* Label */}
          <Chip
            icon={<TableChartIcon sx={{ fontSize: '14px !important' }} />}
            label="Table"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '11px', height: 22, fontWeight: 600, mr: 0.5 }}
          />

          {/* ── Rows ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: '10px', color: 'text.disabled', userSelect: 'none', mr: 0.25 }}
            >
              Row
            </Typography>
            <TableBtn title="Insert row above" onClick={() => runTableCommand('addRowBefore')}>
              <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
            </TableBtn>
            <TableBtn title="Insert row below" onClick={() => runTableCommand('addRowAfter')}>
              <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
            </TableBtn>
            <TableBtn
              title="Delete row"
              onClick={() => runTableCommand('deleteRow')}
              danger
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </TableBtn>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* ── Columns ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: '10px', color: 'text.disabled', userSelect: 'none', mr: 0.25 }}
            >
              Col
            </Typography>
            <TableBtn title="Insert column to the left" onClick={() => runTableCommand('addColumnBefore')}>
              <KeyboardArrowLeftIcon sx={{ fontSize: 16 }} />
            </TableBtn>
            <TableBtn title="Insert column to the right" onClick={() => runTableCommand('addColumnAfter')}>
              <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
            </TableBtn>
            <TableBtn
              title="Delete column"
              onClick={() => runTableCommand('deleteColumn')}
              danger
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </TableBtn>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* ── Cell operations ── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: '10px', color: 'text.disabled', userSelect: 'none', mr: 0.25 }}
            >
              Cell
            </Typography>
            <TableBtn title="Merge selected cells (select multiple cells first)" onClick={runMergeCellsCommand}>
              <MergeTypeIcon sx={{ fontSize: 16 }} />
            </TableBtn>
          </Box>

          {/* ── Delete table — pushed to the right ── */}
          <Box sx={{ ml: 'auto' }}>
            <Tooltip title="Delete entire table" arrow placement="top">
              <span>
                <IconButton
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => runTableCommand('deleteTable')}
                  disabled={disabled || loading}
                  sx={{
                    borderRadius: 0.75,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.50', color: 'error.dark' },
                  }}
                >
                  <DeleteForeverIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BlogEditorToolbar;
