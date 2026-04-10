/**
 * InsertLinkDialog — set link URL and display text, then insert at the current selection.
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';

const InsertLinkDialog = ({ open, onClose, onConfirm, initialText = '', initialHref = '' }) => {
  const [displayText, setDisplayText] = useState('');
  const [href, setHref] = useState('');

  useEffect(() => {
    if (!open) return;
    setDisplayText(initialText);
    setHref(initialHref);
  }, [open, initialText, initialHref]);

  const handleSubmit = () => {
    onConfirm?.({ displayText: displayText.trim(), href: href.trim() });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Insert link</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Text to display"
            value={displayText}
            onChange={(e) => setDisplayText(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            placeholder="Visible label"
          />
          <TextField
            label="URL"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            fullWidth
            size="small"
            placeholder="https://…"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ textTransform: 'none' }} disabled={!href.trim()}>
          Insert
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InsertLinkDialog;
