/**
 * BlogDocumentViewer — headless readonly Milkdown renderer (Phases 9, 10).
 * Used by ArticleContent (public) and the Preview tab (admin).
 *
 * Props:
 *   content: string — JSON string (ProseMirror doc)
 */
import React from 'react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { Box, Alert } from '@mui/material';

import { colorPlugin } from './customMarks';
import { customImagePlugin, admonitionPlugin } from './customNodes';
import { customImageReadonlyViewPlugin } from './imageNodeView';
import { admonitionBodyViewPlugin, admonitionPanelReadonlyViewPlugin } from './admonitionNodeView';
import { migrateLegacyAdmonitionPanels } from './schema';
import { editorViewOptionsCtx } from '@milkdown/kit/core';
import { blockLineHeightPlugin } from './blockLineHeight';

import '@milkdown/kit/prose/view/style/prosemirror.css';
import '@milkdown/kit/prose/tables/style/tables.css';
import '@milkdown/kit/prose/gapcursor/style/gapcursor.css';

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

function parseContent(content) {
  if (!content) return EMPTY_DOC;
  if (typeof content === 'object') return migrateLegacyAdmonitionPanels(content);
  try {
    return migrateLegacyAdmonitionPanels(JSON.parse(content));
  } catch {
    return null;
  }
}

const ReadonlyEditor = ({ doc }) => {
  useEditor((root) => {
    return Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, { type: 'json', value: doc });
        // Disable editing
        ctx.update(editorViewOptionsCtx, (prev) => ({ ...prev, editable: () => false }));
      })
      .use(commonmark)
      .use(blockLineHeightPlugin)
      .use(gfm)
      .use(colorPlugin)
      .use(customImagePlugin)
      .use(admonitionPlugin)
      .use(customImageReadonlyViewPlugin)
      .use(admonitionBodyViewPlugin)
      .use(admonitionPanelReadonlyViewPlugin);
  }, []);

  return (
    <Box
      sx={{
        '& .ProseMirror': {
          outline: 'none',
          fontSize: '1rem',
          lineHeight: 1.7,
          color: 'text.primary',
          '& h1': { fontSize: '2rem', fontWeight: 700, mt: 3, mb: 1.5 },
          '& h2': { fontSize: '1.5rem', fontWeight: 600, mt: 2.5, mb: 1 },
          '& h3': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 0.75 },
          '& p': { my: 1 },
          '& strong, & b': { display: 'inline', fontWeight: 700 },
          '& ul, & ol': { pl: 3, my: 1 },
          '& li': { my: 0.25 },
          '& blockquote': {
            borderLeft: '4px solid',
            borderColor: 'divider',
            pl: 2,
            color: 'text.secondary',
            ml: 0,
            my: 2,
          },
          '& code': {
            fontFamily: 'monospace',
            bgcolor: 'action.hover',
            px: 0.5,
            borderRadius: 0.5,
            fontSize: '0.875em',
          },
          '& pre': {
            bgcolor: 'grey.100',
            p: 2,
            borderRadius: 1,
            overflow: 'auto',
            my: 2,
            '& code': { bgcolor: 'transparent' },
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            my: 2,
            '& th, & td': {
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 0.75,
            },
            '& th': { bgcolor: 'action.hover', fontWeight: 600 },
          },
          '& input[type="checkbox"]': { pointerEvents: 'none' },
        },
      }}
    >
      <Milkdown />
    </Box>
  );
};

const BlogDocumentViewer = ({ content }) => {
  const doc = parseContent(content);

  if (!doc) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        Unable to parse article content.
      </Alert>
    );
  }

  return (
    <MilkdownProvider>
      <ReadonlyEditor doc={doc} />
    </MilkdownProvider>
  );
};

export default BlogDocumentViewer;
