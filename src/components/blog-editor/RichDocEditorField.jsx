import React from 'react';
import { Box, Typography } from '@mui/material';
import MilkdownBlogEditor from './MilkdownBlogEditor';

/**
 * Shared label + Milkdown editor block for admin blog and agreements dialogs.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.label]
 * @param {string} props.value
 * @param {(json: string) => void} props.onChange
 * @param {boolean} [props.disabled]
 * @param {string} props.editorKey — React key so the editor remounts when opening a different doc.
 */
const RichDocEditorField = ({ label, value, onChange, disabled, editorKey }) => (
  <Box>
    {label != null && label !== '' && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
    )}
    <MilkdownBlogEditor
      key={editorKey}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  </Box>
);

export default RichDocEditorField;
