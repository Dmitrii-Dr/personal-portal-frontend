import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import CreateTagForm from '../components/CreateTagForm';
import {
  Card,
  CardContent,
  Typography,
  Alert,
  Box,
  Skeleton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  CircularProgress,
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const AdminBlogPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [articleData, setArticleData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
  });
  const [originalData, setOriginalData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [originalSelectedUserIds, setOriginalSelectedUserIds] = useState([]);
  const [addPostOpen, setAddPostOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createArticleData, setCreateArticleData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    status: 'DRAFT',
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [originalSelectedTagIds, setOriginalSelectedTagIds] = useState([]);
  const [createTagIds, setCreateTagIds] = useState([]);
  const [showCreateTagForm, setShowCreateTagForm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add timeout and signal to cancel request if component unmounts
        const response = await apiClient.get('/api/v1/admin/articles', {
          signal: controller.signal,
          timeout: 10000, // 10 second timeout
        });
        
        if (isMounted) {
          setArticles(Array.isArray(response.data) ? response.data : []);
          setLoading(false);
        }
      } catch (err) {
        // Don't set error if request was aborted (component unmounted)
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        
        console.error('Error fetching articles:', err);
        if (isMounted) {
          let errorMessage = 'Failed to load articles. Please try again later.';
          
          if (err.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (err.response) {
            // Server responded with error status
            errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
          } else if (err.request) {
            // Request was made but no response received (likely 404 or network error)
            errorMessage = 'Unable to reach the server. The API endpoint may not be available.';
          } else {
            // Something else happened
            errorMessage = err.message || errorMessage;
          }
          
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    fetchArticles();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleAccordionChange = (articleId) => (event, isExpanded) => {
    setExpandedArticle(isExpanded ? articleId : null);
  };

  const handleEditClick = (e, article) => {
    e.stopPropagation(); // Prevent accordion from expanding/collapsing
    setEditingArticle(article);
    setOriginalData({
      title: article.title || '',
      slug: article.slug || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      status: article.status || 'DRAFT',
    });
    setArticleData({
      title: article.title || '',
      slug: article.slug || '',
      content: article.content || '',
      excerpt: article.excerpt || '',
      status: article.status || 'DRAFT',
    });
    setSubmitError('');
    setEditDialogOpen(true);
    // Initialize selected users from article.users if provided
    const initialUserIds = Array.isArray(article.users)
      ? article.users.map((u) => u.id)
      : [];
    setSelectedUserIds(initialUserIds);
    setOriginalSelectedUserIds(initialUserIds);
    // Initialize selected tags from article.tags if provided
    const initialTagIds = Array.isArray(article.tags)
      ? article.tags.map((t) => t.tagId)
      : [];
    setSelectedTagIds(initialTagIds);
    setOriginalSelectedTagIds(initialTagIds);
    // Fetch users and tags for selection
    fetchUsers();
    fetchTags();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingArticle(null);
    setOriginalData(null);
    setArticleData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'DRAFT',
    });
    setSubmitError('');
    setSelectedUserIds([]);
    setOriginalSelectedUserIds([]);
    setUsersError('');
    setSelectedTagIds([]);
    setOriginalSelectedTagIds([]);
  };

  const handleFieldChange = (field) => (e) => {
    setArticleData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setSubmitError('');
  };

  const handleCreateFieldChange = (field) => (e) => {
    setCreateArticleData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
    setCreateError('');
  };

  const hasChanges = () => {
    if (!originalData) return false;
    const baseChanged = (
      articleData.title !== originalData.title ||
      articleData.slug !== originalData.slug ||
      articleData.content !== originalData.content ||
      articleData.excerpt !== originalData.excerpt ||
      articleData.status !== originalData.status
    );
    // Compare selected users as sets
    const userSetA = new Set(selectedUserIds);
    const userSetB = new Set(originalSelectedUserIds);
    let usersChanged = false;
    if (userSetA.size !== userSetB.size) {
      usersChanged = true;
    } else {
      for (const id of userSetA) {
        if (!userSetB.has(id)) {
          usersChanged = true;
          break;
        }
      }
    }
    // Compare selected tags as sets
    const tagSetA = new Set(selectedTagIds);
    const tagSetB = new Set(originalSelectedTagIds);
    let tagsChanged = false;
    if (tagSetA.size !== tagSetB.size) {
      tagsChanged = true;
    } else {
      for (const id of tagSetA) {
        if (!tagSetB.has(id)) {
          tagsChanged = true;
          break;
        }
      }
    }
    return baseChanged || usersChanged || tagsChanged;
  };

  const validateCreateForm = () => {
    if (!createArticleData.title.trim()) {
      setCreateError('Title is required');
      return false;
    }
    if (!createArticleData.slug.trim()) {
      setCreateError('Slug is required');
      return false;
    }
    if (!createArticleData.content.trim()) {
      setCreateError('Content is required');
      return false;
    }
    if (!createArticleData.status) {
      setCreateError('Status is required');
      return false;
    }
    return true;
  };

  const handleSubmitEdit = () => {
    if (!hasChanges()) {
      handleEditClose();
      return;
    }

    // Show confirmation dialog if there are changes
    setConfirmDialogOpen(true);
  };

  const handleDeleteClick = (e, article) => {
    e.stopPropagation(); // Prevent accordion from expanding/collapsing
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;

    setDeleting(true);
    try {
      const response = await apiClient.delete(`/api/v1/admin/articles/${articleToDelete.articleId}`);
      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to delete article');
      }
      // Success - close dialog and refresh articles
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      alert(err.message || 'Failed to delete article. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const response = await apiClient.get('/api/v1/admin/users', {
        timeout: 10000,
      });
      const users = Array.isArray(response.data) ? response.data : [];
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError(err.message || 'Failed to load users');
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await apiClient.get('/api/v1/admin/tags', {
        timeout: 10000,
      });
      const tags = Array.isArray(response.data) ? response.data : [];
      setAvailableTags(tags);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const userFullName = (user) => {
    const first = user.firstName || '';
    const last = user.lastName || '';
    const name = `${last} ${first}`.trim();
    return name || user.email || user.id;
  };

  const handleUsersChange = (e) => {
    const value = e.target.value || [];
    setSelectedUserIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleAddPostOpen = () => {
    setAddPostOpen(true);
    setCreateArticleData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'DRAFT',
    });
    setCreateError('');
    setSelectedUserIds([]);
    setCreateTagIds([]);
    setShowCreateTagForm(false);
    fetchUsers();
    fetchTags();
  };

  const handleAddPostClose = () => {
    setAddPostOpen(false);
    setCreateArticleData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      status: 'DRAFT',
    });
    setCreateError('');
    setSelectedUserIds([]);
    setUsersError('');
    setCreateTagIds([]);
    setShowCreateTagForm(false);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);
    setSubmitting(true);
    setSubmitError('');

    try {
      // Build update payload - send original value if unchanged, new value if changed, null/empty to remove
      // Always include selectedUserIds: empty array if PUBLISHED (erase), otherwise current selection
      const userIdsToSend = articleData.status === 'PUBLISHED' ? [] : (Array.isArray(selectedUserIds) ? selectedUserIds : []);
      
      const payload = {
        title: articleData.title !== originalData.title 
          ? articleData.title.trim() 
          : originalData.title,
        slug: articleData.slug !== originalData.slug 
          ? articleData.slug.trim() 
          : originalData.slug,
        content: articleData.content !== originalData.content 
          ? articleData.content.trim() 
          : originalData.content,
        excerpt: articleData.excerpt !== originalData.excerpt 
          ? (articleData.excerpt.trim() || null) 
          : (originalData.excerpt ? originalData.excerpt : null),
        status: articleData.status !== originalData.status 
          ? articleData.status 
          : originalData.status,
        allowedUserIds: userIdsToSend,
        tagIds: Array.isArray(selectedTagIds) ? selectedTagIds : [],
      };

      console.log('Update payload:', payload);
      const response = await apiClient.put(`/api/v1/admin/articles/${editingArticle.articleId}`, payload);

      // Success - close dialog and refresh articles
      handleEditClose();
      fetchArticles();
    } catch (err) {
      console.error('Error updating article:', err);
      setSubmitError(err.message || 'Failed to update article. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitCreate = async () => {
    if (!validateCreateForm()) {
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const response = await apiClient.post('/api/v1/admin/articles', {
        title: createArticleData.title.trim(),
        slug: createArticleData.slug.trim(),
        content: createArticleData.content.trim(),
        excerpt: createArticleData.excerpt.trim() || null,
        status: createArticleData.status,
        allowedUserIds: createArticleData.status === 'PUBLISHED' ? [] : (Array.isArray(selectedUserIds) ? selectedUserIds : []),
        tagIds: Array.isArray(createTagIds) ? createTagIds : [],
      });
      if (!response || (response.status && response.status >= 400)) {
        throw new Error('Failed to create article');
      }
      handleAddPostClose();
      fetchArticles();
    } catch (err) {
      console.error('Error creating article:', err);
      setCreateError(err.message || 'Failed to create article. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/api/v1/admin/articles', {
        timeout: 10000,
      });
      
      setArticles(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching articles:', err);
      let errorMessage = 'Failed to load articles. Please try again later.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = 'Unable to reach the server. The API endpoint may not be available.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Skeleton variant="text" width="80%" height={40} />
        <Skeleton variant="text" width="60%" height={24} />
      </CardContent>
    </Card>
  );

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Blog
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/admin/dashboard')}
            sx={{ textTransform: 'none' }}
          >
            Dashboard
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddPostOpen}
            sx={{ textTransform: 'none' }}
          >
            Add Post
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ mt: 2 }}>
          {[1, 2, 3, 4].map((index) => (
            <LoadingSkeleton key={index} />
          ))}
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : articles.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          {articles.map((article) => (
            <Accordion
              key={article.articleId}
              expanded={expandedArticle === article.articleId}
              onChange={handleAccordionChange(article.articleId)}
              sx={{
                mb: 2,
                '&:before': {
                  display: 'none',
                },
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                  {article.title || 'Untitled'}
                </Typography>
                {/* Status with colored dot */}
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      mr: 0.8,
                      bgcolor:
                        (article.status === 'PUBLISHED' && 'success.main') ||
                        (article.status === 'ARCHIVED' && 'error.main') ||
                        (article.status === 'PRIVATE' && 'info.main') ||
                        'text.disabled',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {article.status || 'DRAFT'}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => handleEditClick(e, article)}
                  sx={{ mr: 1 }}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleDeleteClick(e, article)}
                  sx={{ mr: 1 }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
                {article.publishedAt && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 2, mr: 1 }}
                  >
                    {formatDate(article.publishedAt)}
                  </Typography>
                )}
              </AccordionSummary>
              <Divider />
              <AccordionDetails>
                <Box>
                  {article.excerpt && (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ mb: 2, fontStyle: 'italic' }}
                    >
                      {article.excerpt}
                    </Typography>
                  )}
                  {article.content && (
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {article.content}
                    </Typography>
                  )}
                  {!article.content && (
                    <Typography variant="body2" color="text.secondary">
                      No content available.
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No articles available at the moment.
        </Alert>
      )}

      {/* Edit Article Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Article</DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                label="Title *"
                variant="outlined"
                value={articleData.title}
                onChange={handleFieldChange('title')}
                required
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Slug *"
                variant="outlined"
                value={articleData.slug}
                onChange={handleFieldChange('slug')}
                required
                disabled={submitting}
                helperText="URL-friendly identifier (e.g., my-article-title)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content *"
                variant="outlined"
                multiline
                rows={8}
                value={articleData.content}
                onChange={handleFieldChange('content')}
                required
                disabled={submitting}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Excerpt"
                variant="outlined"
                multiline
                rows={3}
                value={articleData.excerpt}
                onChange={handleFieldChange('excerpt')}
                disabled={submitting}
                helperText="Optional short summary. Leave empty to remove."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status *</InputLabel>
                <Select
                  value={articleData.status}
                  onChange={handleFieldChange('status')}
                  label="Status *"
                  disabled={submitting}
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="PRIVATE">Private</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {articleData.status === 'PUBLISHED' && selectedUserIds.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  Selected users will be erased when submitting a published article.
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Users (visible to)</InputLabel>
                <Select
                  multiple
                  value={selectedUserIds}
                  onChange={handleUsersChange}
                  label="Users (visible to)"
                  disabled={submitting || articleData.status === 'PUBLISHED' || loadingUsers}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    const names = selected
                      .map((id) => {
                        const u = availableUsers.find((au) => au.id === id);
                        return u ? userFullName(u) : id;
                      })
                      .join(', ');
                    return names;
                  }}
                >
                  {loadingUsers && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading users...
                    </MenuItem>
                  )}
                  {!loadingUsers &&
                    availableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {userFullName(user)}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {usersError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {usersError}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={selectedTagIds}
                  onChange={(e) => {
                    const value = e.target.value || [];
                    setSelectedTagIds(typeof value === 'string' ? value.split(',') : value);
                  }}
                  label="Tags"
                  disabled={submitting || loadingTags}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    return selected
                      .map((id) => {
                        const tag = availableTags.find((t) => t.tagId === id);
                        return tag ? tag.name : id;
                      })
                      .join(', ');
                  }}
                >
                  {loadingTags && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading tags...
                    </MenuItem>
                  )}
                  {!loadingTags &&
                    availableTags.map((tag) => (
                      <MenuItem key={tag.tagId} value={tag.tagId}>
                        {tag.name}
                      </MenuItem>
                    ))}
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateTagForm(true);
                    }}
                    sx={{ fontStyle: 'italic', color: 'primary.main' }}
                  >
                    + Create new tag
                  </MenuItem>
                </Select>
              </FormControl>
              {showCreateTagForm && (
                <CreateTagForm
                  onTagCreated={(tagId) => {
                    setSelectedTagIds((prev) => [...prev, tagId]);
                    setShowCreateTagForm(false);
                  }}
                  onCancel={() => setShowCreateTagForm(false)}
                  availableTags={availableTags}
                  setAvailableTags={setAvailableTags}
                />
              )}
              {selectedTagIds.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {selectedTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.tagId === tagId);
                    return tag ? (
                      <Chip
                        key={tagId}
                        label={tag.name}
                        size="small"
                        onDelete={() => {
                          setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
                        }}
                      />
                    ) : null;
                  })}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditClose}
            sx={{ textTransform: 'none' }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitEdit}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={
              submitting ||
              !articleData.title.trim() ||
              !articleData.slug.trim() ||
              !articleData.content.trim()
            }
          >
            {submitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Updating...
              </>
            ) : (
              'Update Article'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Changes</DialogTitle>
        <DialogContent>
          <Typography>
            You have made changes to this article. Are you sure you want to save these changes?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSubmit}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Article</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{articleToDelete?.title || 'this article'}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: 'none' }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Post Dialog */}
      <Dialog open={addPostOpen} onClose={handleAddPostClose} maxWidth="md" fullWidth>
        <DialogTitle>Add New Article</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          {createArticleData.status === 'PUBLISHED' && selectedUserIds.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Selected users will be erased when submitting a published article.
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                label="Title *"
                variant="outlined"
                value={createArticleData.title}
                onChange={handleCreateFieldChange('title')}
                required
                disabled={creating}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Slug *"
                variant="outlined"
                value={createArticleData.slug}
                onChange={handleCreateFieldChange('slug')}
                required
                disabled={creating}
                helperText="URL-friendly identifier (e.g., my-article-title)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Content *"
                variant="outlined"
                multiline
                rows={8}
                value={createArticleData.content}
                onChange={handleCreateFieldChange('content')}
                required
                disabled={creating}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Excerpt"
                variant="outlined"
                multiline
                rows={3}
                value={createArticleData.excerpt}
                onChange={handleCreateFieldChange('excerpt')}
                disabled={creating}
                helperText="Optional short summary"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Status *</InputLabel>
                <Select
                  value={createArticleData.status}
                  onChange={handleCreateFieldChange('status')}
                  label="Status *"
                  disabled={creating}
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="PRIVATE">Private</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Users (visible to)</InputLabel>
                <Select
                  multiple
                  value={selectedUserIds}
                  onChange={handleUsersChange}
                  label="Users (visible to)"
                  disabled={creating || createArticleData.status === 'PUBLISHED' || loadingUsers}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    const names = selected
                      .map((id) => {
                        const u = availableUsers.find((au) => au.id === id);
                        return u ? userFullName(u) : id;
                      })
                      .join(', ');
                    return names;
                  }}
                >
                  {loadingUsers && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading users...
                    </MenuItem>
                  )}
                  {!loadingUsers &&
                    availableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {userFullName(user)}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              {usersError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {usersError}
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tags</InputLabel>
                <Select
                  multiple
                  value={createTagIds}
                  onChange={(e) => {
                    const value = e.target.value || [];
                    setCreateTagIds(typeof value === 'string' ? value.split(',') : value);
                  }}
                  label="Tags"
                  disabled={creating || loadingTags}
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) return '';
                    return selected
                      .map((id) => {
                        const tag = availableTags.find((t) => t.tagId === id);
                        return tag ? tag.name : id;
                      })
                      .join(', ');
                  }}
                >
                  {loadingTags && (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} /> Loading tags...
                    </MenuItem>
                  )}
                  {!loadingTags &&
                    availableTags.map((tag) => (
                      <MenuItem key={tag.tagId} value={tag.tagId}>
                        {tag.name}
                      </MenuItem>
                    ))}
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateTagForm(true);
                    }}
                    sx={{ fontStyle: 'italic', color: 'primary.main' }}
                  >
                    + Create new tag
                  </MenuItem>
                </Select>
              </FormControl>
              {showCreateTagForm && (
                <CreateTagForm
                  onTagCreated={(tagId) => {
                    setCreateTagIds((prev) => [...prev, tagId]);
                    setShowCreateTagForm(false);
                  }}
                  onCancel={() => setShowCreateTagForm(false)}
                  availableTags={availableTags}
                  setAvailableTags={setAvailableTags}
                />
              )}
              {createTagIds.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {createTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.tagId === tagId);
                    return tag ? (
                      <Chip
                        key={tagId}
                        label={tag.name}
                        size="small"
                        onDelete={() => {
                          setCreateTagIds((prev) => prev.filter((id) => id !== tagId));
                        }}
                      />
                    ) : null;
                  })}
                </Stack>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleAddPostClose}
            sx={{ textTransform: 'none' }}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitCreate}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={
              creating ||
              !createArticleData.title.trim() ||
              !createArticleData.slug.trim() ||
              !createArticleData.content.trim()
            }
          >
            {creating ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Creating...
              </>
            ) : (
              'Create Article'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBlogPage;

