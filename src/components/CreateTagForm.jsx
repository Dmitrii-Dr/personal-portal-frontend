import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import apiClient from '../utils/api';

const CreateTagForm = ({ onTagCreated, onCancel, availableTags, setAvailableTags }) => {
  const [newTagData, setNewTagData] = useState({ name: '', slug: '' });
  const [creatingTag, setCreatingTag] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagData.name.trim() || !newTagData.slug.trim()) {
      return;
    }

    setCreatingTag(true);
    try {
      const response = await apiClient.post('/api/v1/admin/tags', {
        name: newTagData.name.trim(),
        slug: newTagData.slug.trim(),
      });
      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to create tag');
      }
      const newTag = response.data;
      setAvailableTags((prev) => [...prev, newTag]);
      setNewTagData({ name: '', slug: '' });
      if (onTagCreated) {
        onTagCreated(newTag.tagId);
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      alert(err.message || 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const handleCancel = () => {
    setNewTagData({ name: '', slug: '' });
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
      <Typography variant="subtitle2" gutterBottom>
        Create New Tag
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="Tag Name"
            value={newTagData.name}
            onChange={(e) =>
              setNewTagData((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={creatingTag}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="Tag Slug"
            value={newTagData.slug}
            onChange={(e) =>
              setNewTagData((prev) => ({ ...prev, slug: e.target.value }))
            }
            disabled={creatingTag}
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateTag}
              disabled={creatingTag || !newTagData.name.trim() || !newTagData.slug.trim()}
            >
              {creatingTag ? <CircularProgress size={16} /> : 'Create'}
            </Button>
            <Button size="small" onClick={handleCancel} disabled={creatingTag}>
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default CreateTagForm;

