/**
 * ArticleContent — renders article content for public readers (Phase 10).
 * If content is valid JSON (ProseMirror doc), renders via BlogDocumentViewer.
 * Falls back to legacy text rendering for non-JSON content (dev guard only).
 */
import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import BlogDocumentViewer from './blog-editor/BlogDocumentViewer';

const isJsonContent = (content) => {
  if (!content || typeof content !== 'string') return false;
  return content.trimStart().startsWith('{');
};

const LegacyContent = ({ content }) => (
  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
    {content}
  </Typography>
);

const ArticleContent = ({ content }) => {
  if (!content) return null;

  if (isJsonContent(content)) {
    try {
      JSON.parse(content);
      return <BlogDocumentViewer content={content} />;
    } catch (err) {
      console.error('ArticleContent: failed to parse JSON content', err);
      return (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Unable to render article content (invalid format).
          </Alert>
        </Box>
      );
    }
  }

  // Legacy plain-text fallback (dev guard — no production articles expected)
  return <LegacyContent content={content} />;
};

export default ArticleContent;
