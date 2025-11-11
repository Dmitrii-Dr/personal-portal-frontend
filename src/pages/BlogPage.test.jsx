import React from 'react';
import { Box, Typography } from '@mui/material';

// Minimal test component to verify rendering works
const BlogPageTest = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Blog Test Page
      </Typography>
      <Typography variant="body1">
        If you can see this, the component is rendering correctly.
      </Typography>
    </Box>
  );
};

export default BlogPageTest;

