import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../utils/api';
import CreateTagForm from '../components/CreateTagForm';
import ArticleContent from '../components/ArticleContent';
import RichDocEditorField from '../components/blog-editor/RichDocEditorField';
import { extractMediaIdsFromDoc, deriveExcerpt, isDocNonEmpty } from '../components/blog-editor/schema';
import { contentToEditorString } from '../components/blog-editor/contentUtils';
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
  Checkbox,
  Pagination,
  Snackbar,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

const AdminBlogPage = () => {
  const { t } = useTranslation();

  const getStatusLabel = (status) => {
    if (!status) return t('admin.blog.statusDraft');
    const map = {
      DRAFT: t('admin.blog.statusDraft'),
      PUBLISHED: t('admin.blog.statusPublished'),
      PRIVATE: t('admin.blog.statusPrivate'),
      ARCHIVED: t('admin.blog.statusArchived'),
    };
    return map[status] || status;
  };

  // ── Articles list ────────────────────────────────────────────────────────
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedArticle, setExpandedArticle] = useState(null);

  // ── Edit dialog ──────────────────────────────────────────────────────────
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
  const [editExcerptTouched, setEditExcerptTouched] = useState(false);
  /** Bumps on each Edit click so Milkdown remounts with a fresh frozen initial doc (see MilkdownBlogEditor). */
  const [editEditorKey, setEditEditorKey] = useState(0);

  // ── Delete dialog ────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Users / Tags ─────────────────────────────────────────────────────────
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [originalSelectedUserIds, setOriginalSelectedUserIds] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [originalSelectedTagIds, setOriginalSelectedTagIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showCreateTagForm, setShowCreateTagForm] = useState(false);

  // ── Create dialog ────────────────────────────────────────────────────────
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
  const [createTagIds, setCreateTagIds] = useState([]);
  const [createExcerptTouched, setCreateExcerptTouched] = useState(false);

  // ── Misc ─────────────────────────────────────────────────────────────────
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // ─── Excerpt auto-derive (debounced 500 ms) ──────────────────────────────
  const editExcerptTimerRef = useRef(null);
  const createExcerptTimerRef = useRef(null);

  useEffect(() => {
    if (editExcerptTouched) return;
    clearTimeout(editExcerptTimerRef.current);
    editExcerptTimerRef.current = setTimeout(() => {
      const derived = deriveExcerpt(articleData.content);
      setArticleData((prev) => ({ ...prev, excerpt: derived }));
    }, 500);
    return () => clearTimeout(editExcerptTimerRef.current);
  }, [articleData.content, editExcerptTouched]);

  useEffect(() => {
    if (createExcerptTouched) return;
    clearTimeout(createExcerptTimerRef.current);
    createExcerptTimerRef.current = setTimeout(() => {
      const derived = deriveExcerpt(createArticleData.content);
      setCreateArticleData((prev) => ({ ...prev, excerpt: derived }));
    }, 500);
    return () => clearTimeout(createExcerptTimerRef.current);
  }, [createArticleData.content, createExcerptTouched]);

  // ─── Fetch articles ──────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/api/v1/admin/articles', {
          signal: controller.signal,
          timeout: 10000,
        });
        if (isMounted) {
          setArticles(Array.isArray(response.data) ? response.data : []);
          setLoading(false);
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        if (!isMounted) return;
        let msg = t('admin.blog.failedToLoadArticles');
        if (err.code === 'ECONNABORTED') msg = t('admin.blog.requestTimeout');
        else if (err.response) msg = err.response.data?.message || `Server error: ${err.response.status}`;
        else if (err.request) msg = t('admin.blog.unableToReachServer');
        else msg = err.message || msg;
        setError(msg);
        setLoading(false);
      }
    };

    fetchArticles();
    return () => { isMounted = false; controller.abort(); };
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/v1/admin/articles', { timeout: 10000 });
      setArticles(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (err) {
      let msg = t('admin.blog.failedToLoadArticles');
      if (err.code === 'ECONNABORTED') msg = t('admin.blog.requestTimeout');
      else if (err.response) msg = err.response.data?.message || `Server error: ${err.response.status}`;
      else if (err.request) msg = t('admin.blog.unableToReachServer');
      else msg = err.message || msg;
      setError(msg);
      setLoading(false);
    }
  };

  const handleAccordionChange = (articleId) => (_, isExpanded) => {
    setExpandedArticle(isExpanded ? articleId : null);
  };

  // ─── Users / Tags helpers ────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const response = await apiClient.get('/api/v1/admin/users', { timeout: 10000 });
      setAvailableUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setUsersError(err.message || 'Failed to load users');
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await apiClient.get('/api/v1/admin/tags', { timeout: 10000 });
      setAvailableTags(Array.isArray(response.data) ? response.data : []);
    } catch {
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  const userFullName = (user) => {
    const name = `${user.lastName || ''} ${user.firstName || ''}`.trim();
    return name || user.email || user.id;
  };

  // ─── Edit dialog ─────────────────────────────────────────────────────────
  const handleEditClick = (e, article) => {
    e.stopPropagation();
    setEditEditorKey((k) => k + 1);
    setEditingArticle(article);
    const initialContent = contentToEditorString(article.content);
    setOriginalData({
      title: article.title || '',
      slug: article.slug || '',
      content: initialContent,
      excerpt: article.excerpt || '',
      status: article.status || 'DRAFT',
    });
    setArticleData({
      title: article.title || '',
      slug: article.slug || '',
      content: initialContent,
      excerpt: article.excerpt || '',
      status: article.status || 'DRAFT',
    });
    setEditExcerptTouched(!!article.excerpt);
    setSubmitError('');
    setEditDialogOpen(true);
    const initialUserIds = Array.isArray(article.users) ? article.users.map((u) => u.id) : [];
    setSelectedUserIds(initialUserIds);
    setOriginalSelectedUserIds(initialUserIds);
    const initialTagIds = Array.isArray(article.tags) ? article.tags.map((t) => t.tagId).filter(Boolean) : [];
    setSelectedTagIds(initialTagIds);
    setOriginalSelectedTagIds(initialTagIds);
    fetchUsers();
    fetchTags();
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingArticle(null);
    setOriginalData(null);
    setArticleData({ title: '', slug: '', content: '', excerpt: '', status: 'DRAFT' });
    setSubmitError('');
    setSelectedUserIds([]);
    setOriginalSelectedUserIds([]);
    setUsersError('');
    setSelectedTagIds([]);
    setOriginalSelectedTagIds([]);
    setEditExcerptTouched(false);
  };

  const handleFieldChange = (field) => (e) => {
    setArticleData((prev) => ({ ...prev, [field]: e.target.value }));
    setSubmitError('');
    if (field === 'excerpt') setEditExcerptTouched(true);
  };

  const handleContentChange = (newContent) => {
    setArticleData((prev) => ({ ...prev, content: newContent }));
    setSubmitError('');
  };

  const hasChanges = () => {
    if (!originalData) return false;
    const baseChanged =
      articleData.title !== originalData.title ||
      articleData.slug !== originalData.slug ||
      articleData.content !== originalData.content ||
      articleData.excerpt !== originalData.excerpt ||
      articleData.status !== originalData.status;
    const userSetA = new Set(selectedUserIds);
    const userSetB = new Set(originalSelectedUserIds);
    const usersChanged =
      userSetA.size !== userSetB.size || [...userSetA].some((id) => !userSetB.has(id));
    const tagSetA = new Set(selectedTagIds);
    const tagSetB = new Set(originalSelectedTagIds);
    const tagsChanged =
      tagSetA.size !== tagSetB.size || [...tagSetA].some((id) => !tagSetB.has(id));
    return baseChanged || usersChanged || tagsChanged;
  };

  const handleSubmitEdit = () => {
    if (!hasChanges()) { handleEditClose(); return; }
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false);
    setSubmitting(true);
    setSubmitError('');
    try {
      const userIdsToSend =
        articleData.status === 'PUBLISHED' ? [] : Array.isArray(selectedUserIds) ? selectedUserIds : [];
      const mediaIds = extractMediaIdsFromDoc(articleData.content);
      const payload = {
        title: articleData.title.trim(),
        slug: articleData.slug.trim(),
        content: articleData.content,
        excerpt: articleData.excerpt.trim() || null,
        status: articleData.status,
        allowedUserIds: userIdsToSend,
        tagIds: Array.isArray(selectedTagIds) ? selectedTagIds.filter(Boolean) : [],
        mediaIds,
      };
      await apiClient.put(`/api/v1/admin/articles/${editingArticle.articleId}`, payload);
      handleEditClose();
      fetchArticles();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update article.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDeleteClick = (e, article) => {
    e.stopPropagation();
    setArticleToDelete(article);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/articles/${articleToDelete.articleId}`);
      setDeleteDialogOpen(false);
      setArticleToDelete(null);
      fetchArticles();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete article.';
      setSnackbarMessage(msg);
      setSnackbarOpen(true);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Create dialog ───────────────────────────────────────────────────────
  const handleAddPostOpen = () => {
    setAddPostOpen(true);
    setCreateArticleData({ title: '', slug: '', content: '', excerpt: '', status: 'DRAFT' });
    setCreateError('');
    setSelectedUserIds([]);
    setCreateTagIds([]);
    setCreateExcerptTouched(false);
    setShowCreateTagForm(false);
    fetchUsers();
    fetchTags();
  };

  const handleAddPostClose = () => {
    setAddPostOpen(false);
    setCreateArticleData({ title: '', slug: '', content: '', excerpt: '', status: 'DRAFT' });
    setCreateError('');
    setSelectedUserIds([]);
    setUsersError('');
    setCreateTagIds([]);
    setCreateExcerptTouched(false);
    setShowCreateTagForm(false);
  };

  const handleCreateFieldChange = (field) => (e) => {
    setCreateArticleData((prev) => ({ ...prev, [field]: e.target.value }));
    setCreateError('');
    if (field === 'excerpt') setCreateExcerptTouched(true);
  };

  const handleCreateContentChange = (newContent) => {
    setCreateArticleData((prev) => ({ ...prev, content: newContent }));
    setCreateError('');
  };

  const validateCreateForm = () => {
    if (!createArticleData.title.trim()) { setCreateError(t('admin.blog.titleRequired')); return false; }
    if (!createArticleData.slug.trim()) { setCreateError(t('admin.blog.slugRequired')); return false; }
    if (!isDocNonEmpty(createArticleData.content)) { setCreateError(t('admin.blog.contentRequired')); return false; }
    if (!createArticleData.status) { setCreateError(t('admin.blog.statusRequired')); return false; }
    return true;
  };

  const handleSubmitCreate = async () => {
    if (!validateCreateForm()) return;
    setCreating(true);
    setCreateError('');
    try {
      const mediaIds = extractMediaIdsFromDoc(createArticleData.content);
      await apiClient.post('/api/v1/admin/articles', {
        title: createArticleData.title.trim(),
        slug: createArticleData.slug.trim(),
        content: createArticleData.content,
        excerpt: createArticleData.excerpt.trim() || null,
        status: createArticleData.status,
        allowedUserIds:
          createArticleData.status === 'PUBLISHED' ? [] : Array.isArray(selectedUserIds) ? selectedUserIds : [],
        tagIds: Array.isArray(createTagIds) ? createTagIds.filter(Boolean) : [],
        mediaIds,
      });
      handleAddPostClose();
      fetchArticles();
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create article.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch { return null; }
  };

  const navigate = useNavigate();

  const LoadingSkeleton = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Skeleton variant="text" width="80%" height={40} />
        <Skeleton variant="text" width="60%" height={24} />
      </CardContent>
    </Card>
  );

  // ─── Shared tag select section ────────────────────────────────────────────
  const renderTagSelect = (tagIds, setTagIds, isCreate = false) => (
    <Grid item xs={12}>
      <FormControl fullWidth>
        <InputLabel>{t('admin.blog.tagsLabel')}</InputLabel>
        <Select
          multiple
          value={tagIds}
          onChange={(e) => {
            const value = e.target.value || [];
            setTagIds(typeof value === 'string' ? value.split(',') : value);
          }}
          label={t('admin.blog.tagsLabel')}
          disabled={(isCreate ? creating : submitting) || loadingTags}
          renderValue={(selected) =>
            selected
              .map((id) => availableTags.find((t) => t.tagId === id)?.name || id)
              .join(', ')
          }
        >
          {loadingTags && (
            <MenuItem disabled>
              <CircularProgress size={16} sx={{ mr: 1 }} /> {t('admin.blog.loadingTags')}
            </MenuItem>
          )}
          {!loadingTags &&
            availableTags.map((tag) => {
              const isSelected = tagIds.includes(tag.tagId);
              return (
                <MenuItem
                  key={tag.tagId}
                  value={tag.tagId}
                  sx={{
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
                  }}
                >
                  <Checkbox checked={isSelected} />
                  {tag.name}
                </MenuItem>
              );
            })}
          <MenuItem
            onClick={(e) => { e.stopPropagation(); setShowCreateTagForm(true); }}
            sx={{ fontStyle: 'italic', color: 'primary.main' }}
          >
            {t('admin.blog.createNewTag')}
          </MenuItem>
        </Select>
      </FormControl>
      {tagIds.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {tagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.tagId === tagId);
            return tag ? (
              <Chip
                key={tagId}
                label={tag.name}
                size="small"
                onDelete={() => setTagIds((prev) => prev.filter((id) => id !== tagId))}
              />
            ) : null;
          })}
        </Stack>
      )}
    </Grid>
  );

  const renderUserSelect = (isCreate = false) => (
    <Grid item xs={12}>
      <FormControl fullWidth>
        <InputLabel>{t('admin.blog.usersLabel')}</InputLabel>
        <Select
          multiple
          value={selectedUserIds}
          onChange={(e) => {
            const value = e.target.value || [];
            setSelectedUserIds(typeof value === 'string' ? value.split(',') : value);
          }}
          label={t('admin.blog.usersLabel')}
          disabled={
            (isCreate ? creating : submitting) ||
            (isCreate ? createArticleData.status : articleData.status) === 'PUBLISHED' ||
            loadingUsers
          }
          renderValue={(selected) =>
            selected.map((id) => {
              const u = availableUsers.find((au) => au.id === id);
              return u ? userFullName(u) : id;
            }).join(', ')
          }
        >
          {loadingUsers && (
            <MenuItem disabled>
              <CircularProgress size={16} sx={{ mr: 1 }} /> {t('admin.blog.loadingUsers')}
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
      {usersError && <Alert severity="error" sx={{ mt: 1 }}>{usersError}</Alert>}
    </Grid>
  );

  const renderExcerptField = (value, onChange, touched, onResetAuto, isCreate = false) => (
    <Grid item xs={12}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <TextField
          fullWidth
          label={t('admin.blog.excerpt')}
          variant="outlined"
          multiline
          rows={3}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          disabled={isCreate ? creating : submitting}
          helperText={`${t('common.symbols')} (${value?.length || 0}/250)${touched ? '' : ' — auto-derived'}`}
          inputProps={{ maxLength: 250 }}
        />
        {touched && (
          <Tooltip title="Reset to auto-derived excerpt">
            <span>
              <IconButton
                size="small"
                onClick={onResetAuto}
                disabled={isCreate ? creating : submitting}
                sx={{ mt: 1 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Grid>
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('admin.blog.adminBlog')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button variant="contained" color="primary" onClick={handleAddPostOpen} sx={{ textTransform: 'none' }}>
            {t('admin.blog.addPost')}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ mt: 2 }}>{[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} />)}</Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      ) : articles.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          {articles.map((article) => (
            <Accordion
              key={article.articleId}
              expanded={expandedArticle === article.articleId}
              onChange={handleAccordionChange(article.articleId)}
              sx={{ mb: 2, boxShadow: 2, '&:before': { display: 'none' }, '&:hover': { boxShadow: 4 } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '&:hover': { backgroundColor: 'action.hover' },
                  '& .MuiAccordionSummary-content': { width: '100%', overflow: 'hidden' },
                }}
              >
                <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <Typography
                      variant="subtitle1"
                      component="h2"
                      noWrap={expandedArticle !== article.articleId}
                      title={article.title}
                      sx={{ fontWeight: 500 }}
                    >
                      {article.title || t('pages.article.untitled')}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      flexShrink: 0,
                      width: { xs: 'auto', md: '420px' },
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 100, justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          width: 8, height: 8, borderRadius: '50%', mr: 1,
                          bgcolor:
                            (article.status === 'PUBLISHED' && 'success.main') ||
                            (article.status === 'ARCHIVED' && 'error.main') ||
                            (article.status === 'PRIVATE' && 'info.main') ||
                            'text.disabled',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        {getStatusLabel(article.status)}
                      </Typography>
                    </Box>
                    {article.publishedAt && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ whiteSpace: 'nowrap', width: 120, textAlign: 'right', display: { xs: 'none', sm: 'block' } }}
                      >
                        {formatDate(article.publishedAt)}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small" onClick={(e) => handleEditClick(e, article)} color="primary" title={t('common.edit')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleDeleteClick(e, article)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <Divider />
              <AccordionDetails>
                <Box>
                  {article.excerpt && (
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                      {article.excerpt}
                    </Typography>
                  )}
                  {article.content ? (
                    <ArticleContent content={article.content} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.blog.noContentAvailable')}
                    </Typography>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>{t('admin.blog.noArticlesAvailable')}</Alert>
      )}

      {/* ── Edit Article Dialog ───────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('admin.blog.editArticle')}</DialogTitle>
        <DialogContent>
          {submitError && <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus fullWidth label={t('admin.blog.titleLabel')} variant="outlined"
                value={articleData.title} onChange={handleFieldChange('title')}
                required disabled={submitting} inputProps={{ maxLength: 150 }}
                helperText={`${t('common.symbols')} (${articleData.title?.length || 0}/150)`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label={t('admin.blog.slugLabel')} variant="outlined"
                value={articleData.slug} onChange={handleFieldChange('slug')}
                required disabled={submitting} helperText={t('admin.blog.slugHelper')}
              />
            </Grid>
            <Grid item xs={12}>
              <RichDocEditorField
                label={t('admin.blog.contentPlaceholder')}
                value={articleData.content}
                onChange={handleContentChange}
                disabled={submitting}
                editorKey={`edit-${editingArticle?.articleId ?? 'article'}-${editEditorKey}`}
              />
            </Grid>
            {renderExcerptField(
              articleData.excerpt,
              (val) => { setArticleData((p) => ({ ...p, excerpt: val })); setEditExcerptTouched(true); },
              editExcerptTouched,
              () => {
                setEditExcerptTouched(false);
                const derived = deriveExcerpt(articleData.content);
                setArticleData((p) => ({ ...p, excerpt: derived }));
              },
            )}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>{t('admin.blog.statusLabel')}</InputLabel>
                <Select
                  value={articleData.status} onChange={handleFieldChange('status')}
                  label={t('admin.blog.statusLabel')} disabled={submitting}
                >
                  <MenuItem value="DRAFT">{t('admin.blog.statusDraft')}</MenuItem>
                  <MenuItem value="PUBLISHED">{t('admin.blog.statusPublished')}</MenuItem>
                  <MenuItem value="PRIVATE">{t('admin.blog.statusPrivate')}</MenuItem>
                  <MenuItem value="ARCHIVED">{t('admin.blog.statusArchived')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {articleData.status === 'PUBLISHED' && selectedUserIds.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning">{t('admin.blog.usersWarning')}</Alert>
              </Grid>
            )}
            {renderUserSelect(false)}
            {renderTagSelect(selectedTagIds, setSelectedTagIds, false)}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose} sx={{ textTransform: 'none' }} disabled={submitting}>
            {t('admin.blog.cancel')}
          </Button>
          <Button
            onClick={handleSubmitEdit}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={submitting || !articleData.title.trim() || !articleData.slug.trim()}
          >
            {submitting ? (
              <><CircularProgress size={16} sx={{ mr: 1 }} />{t('admin.blog.updating')}</>
            ) : (
              t('admin.blog.updateArticle')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm changes dialog ────────────────────────────────────── */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>{t('admin.blog.confirmChanges')}</DialogTitle>
        <DialogContent>
          <Typography>{t('admin.blog.confirmChangesMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} sx={{ textTransform: 'none' }}>
            {t('admin.blog.cancel')}
          </Button>
          <Button onClick={handleConfirmSubmit} variant="contained" sx={{ textTransform: 'none' }}>
            {t('admin.blog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete dialog ─────────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>{t('admin.blog.deleteArticle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {articleToDelete?.title
              ? t('admin.blog.deleteArticleMessage', { title: articleToDelete.title })
              : t('admin.blog.deleteArticleMessageFallback')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }} disabled={deleting}>
            {t('admin.blog.cancel')}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ textTransform: 'none' }} disabled={deleting}>
            {deleting ? <><CircularProgress size={16} sx={{ mr: 1 }} />{t('admin.blog.deleting')}</> : t('admin.blog.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Post Dialog ───────────────────────────────────────────── */}
      <Dialog open={addPostOpen} onClose={handleAddPostClose} maxWidth="md" fullWidth>
        <DialogTitle>{t('admin.blog.addNewArticle')}</DialogTitle>
        <DialogContent>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          {createArticleData.status === 'PUBLISHED' && selectedUserIds.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>{t('admin.blog.usersWarning')}</Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus fullWidth label={t('admin.blog.titleLabel')} variant="outlined"
                value={createArticleData.title} onChange={handleCreateFieldChange('title')}
                required disabled={creating} inputProps={{ maxLength: 150 }}
                helperText={`${t('common.symbols')} (${createArticleData.title?.length || 0}/150)`}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label={t('admin.blog.slugLabel')} variant="outlined"
                value={createArticleData.slug} onChange={handleCreateFieldChange('slug')}
                required disabled={creating} helperText={t('admin.blog.slugHelper')}
              />
            </Grid>
            <Grid item xs={12}>
              <RichDocEditorField
                label={t('admin.blog.contentPlaceholder')}
                value={createArticleData.content}
                onChange={handleCreateContentChange}
                disabled={creating}
                editorKey="admin-blog-new"
              />
            </Grid>
            {renderExcerptField(
              createArticleData.excerpt,
              (val) => { setCreateArticleData((p) => ({ ...p, excerpt: val })); setCreateExcerptTouched(true); },
              createExcerptTouched,
              () => {
                setCreateExcerptTouched(false);
                const derived = deriveExcerpt(createArticleData.content);
                setCreateArticleData((p) => ({ ...p, excerpt: derived }));
              },
              true,
            )}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>{t('admin.blog.statusLabel')}</InputLabel>
                <Select
                  value={createArticleData.status} onChange={handleCreateFieldChange('status')}
                  label={t('admin.blog.statusLabel')} disabled={creating}
                >
                  <MenuItem value="DRAFT">{t('admin.blog.statusDraft')}</MenuItem>
                  <MenuItem value="PUBLISHED">{t('admin.blog.statusPublished')}</MenuItem>
                  <MenuItem value="PRIVATE">{t('admin.blog.statusPrivate')}</MenuItem>
                  <MenuItem value="ARCHIVED">{t('admin.blog.statusArchived')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {renderUserSelect(true)}
            {renderTagSelect(createTagIds, setCreateTagIds, true)}
            {showCreateTagForm && (
              <Grid item xs={12}>
                <CreateTagForm
                  onTagCreated={(tagId) => { setCreateTagIds((prev) => [...prev, tagId]); setShowCreateTagForm(false); }}
                  onCancel={() => setShowCreateTagForm(false)}
                  availableTags={availableTags}
                  setAvailableTags={setAvailableTags}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddPostClose} sx={{ textTransform: 'none' }} disabled={creating}>
            {t('admin.blog.cancel')}
          </Button>
          <Button
            onClick={handleSubmitCreate}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={creating || !createArticleData.title.trim() || !createArticleData.slug.trim()}
          >
            {creating ? (
              <><CircularProgress size={16} sx={{ mr: 1 }} />{t('admin.blog.creating')}</>
            ) : (
              t('admin.blog.createArticle')
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Create Tag Dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreateTagForm} onClose={() => setShowCreateTagForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin.blog.createTag')}</DialogTitle>
        <DialogContent>
          <CreateTagForm
            onTagCreated={(tagId) => { setSelectedTagIds((prev) => [...prev, tagId]); setShowCreateTagForm(false); }}
            onCancel={() => setShowCreateTagForm(false)}
            availableTags={availableTags}
            setAvailableTags={setAvailableTags}
          />
        </DialogContent>
      </Dialog>

      {/* ── Snackbar ──────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity="error" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminBlogPage;
