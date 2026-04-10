/**
 * MilkdownBlogEditor — main rich text editor component (Phases 2-9).
 *
 * Props:
 *   value: string|null       — JSON string (current content)
 *   onChange: (json: string) => void
 *   disabled?: boolean
 *   placeholder?: string
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { Editor, rootCtx, defaultValueCtx, prosePluginsCtx } from '@milkdown/kit/core';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/kit/plugin/history';
import { Plugin } from '@milkdown/kit/prose/state';
import { Box } from '@mui/material';

import { colorPlugin } from './customMarks';
import { customImagePlugin, admonitionPlugin } from './customNodes';
import { customImageViewPlugin } from './imageNodeView';
import { admonitionBodyViewPlugin, admonitionPanelViewPlugin } from './admonitionNodeView';
import BlogEditorToolbar from './BlogEditorToolbar';
import { tableCellEnterLineBreakKeymap } from './tableCellEnterKeymap';
import { callCommand } from '@milkdown/kit/utils';
import { insertCustomImageCommand } from './customNodes';
import { blockLineHeightPlugin } from './blockLineHeight';
import { parseContentForEditor, isDocNonEmpty } from './schema';

import '@milkdown/kit/prose/view/style/prosemirror.css';
import '@milkdown/kit/prose/tables/style/tables.css';
import '@milkdown/kit/prose/gapcursor/style/gapcursor.css';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * Milkdown defaultValueCtx: `{ type: 'json', value }` or a markdown string.
 * Legacy HTML cannot be loaded; use empty doc so Editor.create() does not fail.
 */
function normalizeInitialValue(value) {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return { type: 'json', value: EMPTY_DOC };
  }
  const parsed = parseContentForEditor(value);
  if (parsed === '') {
    return { type: 'json', value: EMPTY_DOC };
  }
  if (typeof parsed === 'object' && parsed?.type === 'json') {
    return parsed;
  }
  const s = String(parsed).trimStart();
  if (s.startsWith('<')) {
    return { type: 'json', value: EMPTY_DOC };
  }
  return parsed;
}

const jsonChangePlugin = (onChangeRef, isFirstDocUpdateRef, initialSnapshotRef) =>
  new Plugin({
    view(editorView) {
      return {
        update(view, prevState) {
          if (prevState.doc.eq(view.state.doc)) return;
          const json = JSON.stringify(view.state.doc.toJSON());
          // Ignore only the very first empty emission when initial content is non-empty.
          if (isFirstDocUpdateRef.current) {
            isFirstDocUpdateRef.current = false;
            if (!isDocNonEmpty(json) && isDocNonEmpty(initialSnapshotRef.current)) {
              return;
            }
          }
          onChangeRef.current?.(json);
        },
      };
    },
  });

// ─── Single tree under MilkdownProvider (matches BlogDocumentViewer pattern) ───

const BlogEditorInner = ({ initialValue, onChange, disabled }) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const isFirstDocUpdateRef = useRef(true);
  const initialSnapshotRef = useRef(initialValue);

  // Freeze initial doc for useEditor([]): parent content updates every keystroke; do not recreate factory.
  const frozenDefaultRef = useRef(null);
  if (frozenDefaultRef.current === null) {
    frozenDefaultRef.current = normalizeInitialValue(initialValue);
  }
  const frozenDefault = frozenDefaultRef.current;

  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, frozenDefault);
        })
        .config((ctx) => {
          ctx.update(prosePluginsCtx, (prev) => [
            ...prev,
            jsonChangePlugin(onChangeRef, isFirstDocUpdateRef, initialSnapshotRef),
          ]);
        })
        .use(commonmark)
        .use(blockLineHeightPlugin)
        .use(gfm)
        .use(tableCellEnterLineBreakKeymap)
        .use(history)
        .use(colorPlugin)
        .use(customImagePlugin)
        .use(admonitionPlugin)
        .use(customImageViewPlugin)
        .use(admonitionBodyViewPlugin)
        .use(admonitionPanelViewPlugin),
    [],
  );

  const [loading, getInstance] = useInstance();

  useEffect(() => {
    const handler = (e) => {
      const { mediaId } = e.detail || {};
      if (!mediaId || loading) return;
      getInstance()?.action(callCommand(insertCustomImageCommand.key, { mediaId }));
    };
    document.addEventListener('milkdown-insert-image', handler);
    return () => document.removeEventListener('milkdown-insert-image', handler);
  }, [loading, getInstance]);

  const handleImageUpload = useCallback(async (file) => {
    const { default: apiClient } = await import('../../utils/api');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/v1/admin/media/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const mediaId = response.data?.mediaId;
      if (mediaId) {
        document.dispatchEvent(new CustomEvent('milkdown-insert-image', { detail: { mediaId } }));
      }
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  }, []);

  const handleImageFromGallery = useCallback((mediaId) => {
    document.dispatchEvent(new CustomEvent('milkdown-insert-image', { detail: { mediaId } }));
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 340,
        // Cap height so scrolling happens inside the prose area, not the dialog — toolbar stays visible.
        maxHeight: 'min(640px, calc(100vh - 320px))',
      }}
    >
      <BlogEditorToolbar
        disabled={disabled}
        onImageUpload={handleImageUpload}
        onImageFromGallery={handleImageFromGallery}
      />
      <Box
        component="div"
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'auto',
          cursor: disabled ? 'not-allowed' : 'text',
          '& [data-milkdown-root]': { minHeight: 280, display: 'block' },
          '& .ProseMirror': {
            minHeight: 260,
            padding: '12px 16px',
            outline: 'none',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'text.primary',
            pointerEvents: disabled ? 'none' : 'auto',
            '& h1, & h2, & h3': { mt: 2, mb: 1 },
            '& p': { my: 0.5 },
            '& strong, & b': { display: 'inline', fontWeight: 700 },
            '& ul, & ol': { pl: 3 },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'divider',
              pl: 2,
              color: 'text.secondary',
              ml: 0,
            },
            '& code': {
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              px: 0.5,
              borderRadius: 0.5,
            },
            '& pre': {
              bgcolor: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
            },
            '& table': {
              borderCollapse: 'collapse',
              width: '100%',
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.32)',
              // Keep table perimeter visible even when collapsed cell borders blend.
              outline: '2px solid rgba(0, 0, 0, 0.45)',
              outlineOffset: '-1px',
              tableLayout: 'fixed',
              my: 1.5,

              '& th, & td': {
                border: '1px solid rgba(0, 0, 0, 0.32) !important',
                px: 1.5,
                py: 1,
                minWidth: 80,
                verticalAlign: 'top',
                position: 'relative',
                fontSize: '0.9rem',
              },

              '& th': {
                bgcolor: 'grey.100',
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.02em',
                color: 'text.primary',
                textAlign: 'left',
                borderBottom: '2px solid rgba(0, 0, 0, 0.4)',
              },

              '& thead th': {
                bgcolor: 'grey.100',
              },

              '& tbody tr': {
                transition: 'background-color 0.1s',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                '&:nth-of-type(even)': {
                  bgcolor: 'rgba(0,0,0,0.018)',
                },
              },

              '& .selectedCell': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '-2px',
                bgcolor: 'rgba(25, 118, 210, 0.1) !important',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(25, 118, 210, 0.06)',
                  pointerEvents: 'none',
                },
              },

              '& .column-resize-handle': {
                position: 'absolute',
                right: -2,
                top: 0,
                bottom: 0,
                width: 4,
                cursor: 'col-resize',
                bgcolor: 'primary.light',
                opacity: 0,
                transition: 'opacity 0.15s',
                zIndex: 1,
              },

              '&:hover .column-resize-handle': {
                opacity: 1,
              },
            },

            '& .resize-cursor': {
              cursor: 'col-resize !important',
            },
          },
        }}
      >
        <Milkdown />
      </Box>
    </Box>
  );
};

// ─── Public component ─────────────────────────────────────────────────────────

const MilkdownBlogEditor = ({ value, onChange, disabled, placeholder }) => {
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        minHeight: 340,
      }}
    >
      <MilkdownProvider>
        <BlogEditorInner initialValue={value} onChange={onChange} disabled={disabled} />
      </MilkdownProvider>
    </Box>
  );
};

export default MilkdownBlogEditor;
