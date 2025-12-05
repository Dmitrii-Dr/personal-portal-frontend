import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../utils/api';
import { loadImageWithCache, loadThumbnailWithCache, clearCachedImage } from '../utils/imageCache';
import {
  Box,
  Typography,
  Alert,
  Grid,
  CircularProgress,
  Card,
  CardMedia,
  CardContent,
  Pagination,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Checkbox,
  DialogActions,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

const AdminGalleryPage = () => {
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.only('xs'));
  const isSm = useMediaQuery(theme.breakpoints.only('sm'));
  const isMd = useMediaQuery(theme.breakpoints.only('md'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));

  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0); // 0-based indexing for API
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // mediaId -> thumbnail objectUrl
  const [fullImageUrls, setFullImageUrls] = useState({}); // mediaId -> full image objectUrl
  const [loadingThumbnails, setLoadingThumbnails] = useState({}); // mediaId -> boolean
  const [loadingFullImages, setLoadingFullImages] = useState({}); // mediaId -> boolean
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Calculate dynamic page size based on screen size
  // Grid layout: xs=1, sm=2, md=3, lg=4 per row
  // Aim for 2-3 rows of images visible at once
  const calculatePageSize = React.useCallback(() => {
    if (isXs) {
      return 6; // 1 per row, 6 rows
    } else if (isSm) {
      return 12; // 2 per row, 6 rows
    } else if (isMd) {
      return 15; // 3 per row, 5 rows
    } else {
      return 20; // 4 per row, 5 rows
    }
  }, [isXs, isSm, isMd, isLg]);

  const [pageSize, setPageSize] = useState(() => {
    // Initial calculation - will be updated by useEffect
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < theme.breakpoints.values.sm) return 6;
      if (width < theme.breakpoints.values.md) return 12;
      if (width < theme.breakpoints.values.lg) return 15;
      return 20;
    }
    return 10;
  });

  // Update page size when screen size changes
  useEffect(() => {
    const newPageSize = calculatePageSize();
    setPageSize((prevSize) => {
      if (prevSize !== newPageSize) {
        // Reset to first page when page size changes
        setPage(0);
        return newPageSize;
      }
      return prevSize;
    });
  }, [calculatePageSize]);

  // Load all thumbnails for media items using cache
  const loadAllThumbnails = async (items) => {
    const newThumbnailUrls = { ...thumbnailUrls };
    const newLoadingThumbnails = { ...loadingThumbnails };

    // Mark all as loading initially
    items.forEach((item) => {
      if (item.mediaId && !newThumbnailUrls[item.mediaId]) {
        newLoadingThumbnails[item.mediaId] = true;
      }
    });
    setLoadingThumbnails(newLoadingThumbnails);

    // Load thumbnails in parallel
    const thumbnailPromises = items.map(async (item) => {
      if (!item.mediaId) return;

      try {
        // Load thumbnail using cache utility
        const thumbnailUrl = await loadThumbnailWithCache(item.mediaId);
        newThumbnailUrls[item.mediaId] = thumbnailUrl;
      } catch (err) {
        console.error(`Error loading thumbnail for mediaId ${item.mediaId}:`, err);
        // Set a placeholder or error image
        newThumbnailUrls[item.mediaId] = null;
      } finally {
        newLoadingThumbnails[item.mediaId] = false;
      }
    });

    await Promise.all(thumbnailPromises);
    setThumbnailUrls(newThumbnailUrls);
    setLoadingThumbnails(newLoadingThumbnails);
  };

  // Fetch media when page changes
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchMedia = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get('/api/v1/admin/media', {
          params: {
            page: page,
            size: pageSize,
          },
          signal: controller.signal,
          timeout: 10000, // 10 second timeout
        });

        if (!isMounted) return;

        const data = response.data;
        setMediaItems(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);

        // Load thumbnails for all media items
        if (data.content && data.content.length > 0) {
          loadAllThumbnails(data.content);
        }
      } catch (err) {
        // Don't set error if request was aborted (component unmounted or page changed)
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }

        console.error('Error fetching media:', err);
        
        if (!isMounted) return;

        let errorMessage = 'Failed to load gallery images. Please try again later.';

        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.response) {
          errorMessage =
            err.response.data?.message ||
            `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = 'Unable to reach the server. Please check your connection.';
        } else {
          errorMessage = err.message || errorMessage;
        }

        setError(errorMessage);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMedia();

    return () => {
      isMounted = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  // Handle page change
  // Material-UI Pagination uses 1-based indexing, so convert to 0-based for API
  const handlePageChange = (event, value) => {
    setPage(value - 1); // Convert from 1-based (UI) to 0-based (API)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle image click to show in dialog - load full image if not already loaded
  const handleImageClick = async (item) => {
    if (!item.mediaId) return;

    // Open dialog immediately with thumbnail or loading state
    setSelectedImage({
      url: thumbnailUrls[item.mediaId] || null,
      altText: item.altText || item.fileUrl || 'Gallery image',
      createdAt: item.createdAt,
      fileType: item.fileType,
      mediaId: item.mediaId,
    });

    // Load full image if not already loaded
    let fullImageUrl = fullImageUrls[item.mediaId];
    if (!fullImageUrl) {
      // Set loading state
      setLoadingFullImages((prev) => ({ ...prev, [item.mediaId]: true }));
      
      try {
        fullImageUrl = await loadImageWithCache(item.mediaId);
        setFullImageUrls((prev) => ({ ...prev, [item.mediaId]: fullImageUrl }));
        
        // Update dialog with full image
        setSelectedImage((prev) => ({
          ...prev,
          url: fullImageUrl,
        }));
      } catch (err) {
        console.error(`Error loading full image for mediaId ${item.mediaId}:`, err);
      } finally {
        setLoadingFullImages((prev) => ({ ...prev, [item.mediaId]: false }));
      }
    } else {
      // Full image already loaded, update dialog immediately
      setSelectedImage((prev) => ({
        ...prev,
        url: fullImageUrl,
      }));
    }
  };

  // Close image dialog
  const handleCloseDialog = () => {
    setSelectedImage(null);
  };

  // Handle file upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Reset file input
    event.target.value = '';

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await apiClient.post('/api/v1/admin/media/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadResponse.data || !uploadResponse.data.mediaId) {
        throw new Error('Failed to upload image: No mediaId returned');
      }

      setSuccessMessage('Image uploaded successfully!');
      
      // Refresh the current page to show the new image
      // Reset to first page if we're not already there
      if (page !== 0) {
        setPage(0);
      } else {
        // If already on first page, refetch
        const response = await apiClient.get('/api/v1/admin/media', {
          params: {
            page: 0,
            size: pageSize,
          },
        });
        const data = response.data;
        setMediaItems(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
        if (data.content && data.content.length > 0) {
          loadAllThumbnails(data.content);
        }
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      let errorMessage = 'Failed to upload image. Please try again.';
      
      if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // Handle selection toggle
  const toggleSelection = (mediaId) => {
    setSelectedMediaIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMediaIds.size === mediaItems.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(mediaItems.map((item) => item.mediaId)));
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) {
      setSelectedMediaIds(new Set());
    }
  };

  // Handle delete
  const handleDeleteClick = () => {
    if (selectedMediaIds.size === 0) return;
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedMediaIds.size === 0) return;

    setDeleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Delete all selected images
      const deletePromises = Array.from(selectedMediaIds).map(async (mediaId) => {
        try {
          await apiClient.delete(`/api/v1/admin/media/image/${mediaId}`);
          // Clear cached images
          await clearCachedImage(mediaId);
          await clearCachedImage(`${mediaId}_thumb`);
          return { success: true, mediaId };
        } catch (err) {
          console.error(`Error deleting media ${mediaId}:`, err);
          
          // Extract error message from response
          let errorMessage = 'Failed to delete image.';
          if (err.response) {
            if (err.response.status === 400 && err.response.data?.error) {
              errorMessage = err.response.data.error;
            } else if (err.response.data?.message) {
              errorMessage = err.response.data.message;
            } else {
              errorMessage = `Server error: ${err.response.status}`;
            }
          } else if (err.request) {
            errorMessage = 'Unable to reach the server. Please check your connection.';
          } else if (err.message) {
            errorMessage = err.message;
          }
          
          return { success: false, mediaId, error: errorMessage };
        }
      });

      const results = await Promise.all(deletePromises);
      const succeeded = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

        // Build error messages for failed deletions
      if (failed.length > 0) {
        const errorMessages = failed.map((f) => f.error).filter(Boolean);
        
        if (errorMessages.length === 1) {
          setError(errorMessages[0]);
        } else {
          // Join multiple error messages with line breaks
          setError(errorMessages.join('\n\n'));
        }
      }

      if (succeeded.length > 0) {
        setSuccessMessage(`Successfully deleted ${succeeded.length} image(s).`);
      }

      // Close dialog and reset selection
      setDeleteDialogOpen(false);
      
      // Only reset selection and refresh if some deletions succeeded
      if (succeeded.length > 0) {
        // Remove successfully deleted items from selection
        const remainingSelected = new Set(
          Array.from(selectedMediaIds).filter(
            (id) => !succeeded.some((r) => r.mediaId === id)
          )
        );
        setSelectedMediaIds(remainingSelected);
        
        // If all items were deleted, exit selection mode
        if (remainingSelected.size === 0) {
          setSelectionMode(false);
        }

        // Refresh the current page
        const response = await apiClient.get('/api/v1/admin/media', {
          params: {
            page: page,
            size: pageSize,
          },
        });
        const data = response.data;
        setMediaItems(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
        
        // Clear thumbnail URLs for successfully deleted items
        setThumbnailUrls((prev) => {
          const updated = { ...prev };
          succeeded.forEach((r) => {
            delete updated[r.mediaId];
          });
          return updated;
        });
        setFullImageUrls((prev) => {
          const updated = { ...prev };
          succeeded.forEach((r) => {
            delete updated[r.mediaId];
          });
          return updated;
        });

        if (data.content && data.content.length > 0) {
          loadAllThumbnails(data.content);
        }
      } else if (page > 0) {
        // If current page is empty, go to previous page
        setPage(page - 1);
      }
    } catch (err) {
      console.error('Error deleting images:', err);
      setError('Failed to delete images. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Loading skeleton component
  const ImageSkeleton = () => (
    <Card>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
          <PhotoLibraryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" component="h1">
              Gallery
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {totalElements > 0
                ? `Total: ${totalElements} image${totalElements !== 1 ? 's' : ''}`
                : 'No images uploaded yet'}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {selectionMode ? (
            <>
              <Button
                variant="outlined"
                size="medium"
                onClick={toggleSelectionMode}
                sx={{
                  textTransform: 'none',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                  color: 'text.primary',
                  bgcolor: 'transparent',
                  minWidth: 110,
                  '&:hover': {
                    borderColor: 'rgba(0, 0, 0, 0.87)',
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<DeleteIcon />}
                onClick={handleDeleteClick}
                disabled={selectedMediaIds.size === 0 || deleting}
                sx={{
                  textTransform: 'none',
                  borderWidth: 1,
                  borderColor:
                    selectedMediaIds.size > 0
                      ? 'error.main'
                      : 'rgba(0, 0, 0, 0.23)',
                  color:
                    selectedMediaIds.size > 0
                      ? 'error.main'
                      : 'text.secondary',
                  bgcolor: 'transparent',
                  minWidth: 120,
                  '&:hover': {
                    borderColor: 'error.dark',
                    bgcolor: 'rgba(211, 47, 47, 0.08)',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                {selectedMediaIds.size > 0
                  ? `Delete (${selectedMediaIds.size})`
                  : 'Delete'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                size="medium"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={toggleSelectionMode}
                sx={{
                  textTransform: 'none',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                  color: 'text.primary',
                  bgcolor: 'transparent',
                  minWidth: 110,
                  '&:hover': {
                    borderColor: 'rgba(0, 0, 0, 0.87)',
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                Select
              </Button>
              <Button
                variant="outlined"
                size="medium"
                startIcon={uploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
                onClick={handleUploadClick}
                disabled={uploading}
                sx={{
                  textTransform: 'none',
                  borderWidth: 1,
                  borderColor: 'rgba(0, 0, 0, 0.23)',
                  color: 'text.primary',
                  bgcolor: 'transparent',
                  minWidth: 120,
                  '&:hover': {
                    borderColor: 'rgba(0, 0, 0, 0.87)',
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                  '&.Mui-disabled': {
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                  },
                }}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          <Typography component="div" sx={{ whiteSpace: 'pre-line' }}>
            {error}
          </Typography>
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {[...Array(pageSize)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <ImageSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : mediaItems.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          No images found in the gallery. Upload images to see them here.
        </Alert>
      ) : (
        <>
          <Grid container spacing={1.5}>
            {mediaItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.mediaId}>
                <Card
                  sx={{
                    cursor: selectionMode || !thumbnailUrls[item.mediaId] ? 'default' : 'pointer',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: selectedMediaIds.has(item.mediaId) ? '2px solid' : '1px solid transparent',
                    borderColor: selectedMediaIds.has(item.mediaId) ? 'primary.main' : 'divider',
                    '&:hover': thumbnailUrls[item.mediaId] && !selectionMode
                      ? {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                        }
                      : {},
                  }}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(item.mediaId);
                    } else {
                      handleImageClick(item);
                    }
                  }}
                >
                  {selectionMode && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        zIndex: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 0.5,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedMediaIds.has(item.mediaId)}
                        icon={<CheckBoxOutlineBlankIcon />}
                        checkedIcon={<CheckBoxIcon />}
                        size="small"
                        sx={{ p: 0.25 }}
                        onChange={() => toggleSelection(item.mediaId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Box>
                  )}
                  {loadingThumbnails[item.mediaId] ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : thumbnailUrls[item.mediaId] ? (
                    <CardMedia
                      component="img"
                      image={thumbnailUrls[item.mediaId]}
                      alt={item.altText || item.fileUrl || 'Gallery image'}
                      sx={{
                        height: 120,
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        console.error(`Error displaying thumbnail for mediaId ${item.mediaId}`);
                        e.target.src = ''; // Remove broken image
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 120,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.200',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Failed to load
                      </Typography>
                    </Box>
                  )}
                  <CardContent sx={{ flexGrow: 1, p: 1, '&:last-child': { pb: 1 } }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      sx={{ 
                        fontSize: '0.7rem',
                        display: 'block',
                        mb: 0.25,
                      }}
                    >
                      {item.fileUrl || 'Untitled'}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '0.65rem',
                        opacity: 0.7,
                      }}
                    >
                      {formatDate(item.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 4,
                mb: 2,
              }}
            >
              <Pagination
                count={totalPages}
                page={page + 1} // Convert from 0-based (API) to 1-based (UI)
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Image preview dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6">Image Preview</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box>
              {loadingFullImages[selectedImage.mediaId] ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '50vh',
                  }}
                >
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Box
                    component="img"
                    src={selectedImage.url}
                    alt={selectedImage.altText}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '70vh',
                      objectFit: 'contain',
                      mb: 2,
                    }}
                    onError={(e) => {
                      console.error(`Error displaying full image for mediaId ${selectedImage.mediaId}`);
                      e.target.style.display = 'none';
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Type:</strong> {selectedImage.fileType || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Uploaded:</strong> {formatDate(selectedImage.createdAt)}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete}>
        <DialogTitle>Delete Images</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedMediaIds.size} image{selectedMediaIds.size !== 1 ? 's' : ''}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminGalleryPage;

