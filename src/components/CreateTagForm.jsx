import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import apiClient from '../utils/api';

const CreateTagForm = ({ onTagCreated, onCancel, availableTags, setAvailableTags }) => {
  const { t } = useTranslation();
  const [newTagData, setNewTagData] = useState({ name: '', slug: '' });
  const [creatingTag, setCreatingTag] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateTag = async () => {
    if (!newTagData.name.trim() || !newTagData.slug.trim()) {
      return;
    }

    setCreatingTag(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/api/v1/admin/tags', {
        name: newTagData.name.trim(),
        slug: newTagData.slug.trim(),
      });
      if (!response || (response.status && response.status >= 400)) {
        throw new Error(t('admin.blog.failedToCreateTag'));
      }
      const newTag = response.data;
      setAvailableTags((prev) => [...prev, newTag]);
      setNewTagData({ name: '', slug: '' });
      if (onTagCreated) {
        onTagCreated(newTag.tagId);
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || t('admin.blog.failedToCreateTag');
      setErrorMessage(msg);
      setSnackbarOpen(true);
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
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label={t('admin.blog.tagName')}
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
            label={t('admin.blog.tagSlug')}
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
              {creatingTag ? <CircularProgress size={16} /> : t('admin.blog.create')}
            </Button>
            <Button size="small" onClick={handleCancel} disabled={creatingTag}>
              {t('common.cancel')}
            </Button>
          </Box>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%' }}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default CreateTagForm;

