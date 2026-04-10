/**
 * GalleryDialog — self-contained gallery + upload (Phase 8, decision #11).
 * All gallery state (pagination, thumbnail cache, fetch, upload) lives here.
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   onInsert: (mediaId: string) => void
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Pagination,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import apiClient from '../../utils/api';
import { loadThumbnailWithCache } from '../../utils/imageCache';

const GALLERY_PAGE_SIZE = 20;

const GalleryDialog = ({ open, onClose, onInsert }) => {
  const { t } = useTranslation();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [thumbnailUrls, setThumbnailUrls] = useState({});
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const uploadInputRef = useRef(null);

  const fetchImages = useCallback(async (pageNum) => {
    let isMounted = true;
    const controller = new AbortController();

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/v1/admin/media', {
        params: { page: pageNum, size: GALLERY_PAGE_SIZE },
        signal: controller.signal,
        timeout: 10000,
      });

      if (!isMounted) return;

      const data = response.data;
      const items = Array.isArray(data.content) ? data.content : [];
      setImages(items);
      setTotalPages(data.totalPages || 1);

      // Load thumbnails
      items.forEach(async (item) => {
        if (!item.mediaId) return;
        try {
          const url = await loadThumbnailWithCache(item.mediaId);
          if (isMounted) {
            setThumbnailUrls((prev) => ({ ...prev, [item.mediaId]: url }));
          }
        } catch {
          // thumbnail load failure is non-fatal
        }
      });
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (!isMounted) return;
      const msg = err.response?.data?.message || err.message || 'Failed to load gallery.';
      setError(msg);
    } finally {
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setPage(0);
    setThumbnailUrls({});
    setError(null);
    setUploadError(null);
    fetchImages(0);
  }, [open, fetchImages]);

  const handlePageChange = (_, value) => {
    const newPage = value - 1;
    setPage(newPage);
    fetchImages(newPage);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please select a JPEG, PNG, GIF or WebP image.');
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/api/v1/admin/media/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal,
      });

      if (!isMounted) return;

      const mediaId = response.data?.mediaId;
      if (mediaId) {
        // Insert immediately and refresh gallery
        onInsert(mediaId);
        fetchImages(page);
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (!isMounted) return;
      const msg = err.response?.data?.message || err.message || 'Failed to upload image.';
      setUploadError(msg);
    } finally {
      if (isMounted) setUploading(false);
    }

    return () => {
      isMounted = false;
      controller.abort();
    };
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('admin.blog.selectImageFromGallery')}</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Upload area */}
        <Box sx={{ mb: 2 }}>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            sx={{ textTransform: 'none' }}
          >
            {uploading ? t('admin.blog.uploadingImage') : t('admin.blog.uploadImage')}
          </Button>
          {uploadError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {uploadError}
            </Alert>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : images.length === 0 ? (
          <Alert severity="info">{t('admin.blog.noImagesFound')}</Alert>
        ) : (
          <>
            <Grid container spacing={2}>
              {images.map((item) => (
                <Grid item xs={6} sm={4} md={3} key={item.mediaId}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}
                    onClick={() => {
                      onInsert(item.mediaId);
                      onClose();
                    }}
                  >
                    {thumbnailUrls[item.mediaId] ? (
                      <CardMedia
                        component="img"
                        image={thumbnailUrls[item.mediaId]}
                        alt={item.altText || 'Gallery image'}
                        sx={{ height: 120, objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 120,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'grey.100',
                        }}
                      >
                        <CircularProgress size={20} />
                      </Box>
                    )}
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
                        {item.fileUrl || item.mediaId}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination count={totalPages} page={page + 1} onChange={handlePageChange} color="primary" />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          {t('admin.blog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GalleryDialog;
