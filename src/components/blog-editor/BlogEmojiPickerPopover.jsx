/**
 * BlogEmojiPickerPopover — Unicode emoji grid (emoji-picker-react, MIT).
 * Uses native emoji glyphs so inserted content is plain text, not image URLs.
 */
import React from 'react';
import { Popover, Box, useTheme } from '@mui/material';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';

const BlogEmojiPickerPopover = ({ open, anchorEl, onClose, onSelect }) => {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{
        elevation: 8,
        sx: { overflow: 'hidden', maxWidth: { xs: 'calc(100vw - 16px)', sm: 360 } },
      }}
    >
      {open ? (
        <Box
          sx={{
            '& .EmojiPickerReact': {
              '--epr-bg-color': muiTheme.palette.background.paper,
              '--epr-category-label-bg-color': muiTheme.palette.background.paper,
            },
          }}
        >
          <EmojiPicker
            onEmojiClick={(data) => {
              onSelect?.(data.emoji);
              onClose?.();
            }}
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            width={340}
            height={400}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
            autoFocusSearch
          />
        </Box>
      ) : null}
    </Popover>
  );
};

export default BlogEmojiPickerPopover;
