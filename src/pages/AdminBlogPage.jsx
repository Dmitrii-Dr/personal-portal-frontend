import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { fetchWithAuth } from '../utils/api';
import CreateTagForm from '../components/CreateTagForm';
import ArticleContent from '../components/ArticleContent';
import { loadImageWithCache } from '../utils/imageCache';
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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import Slider from '@mui/material/Slider';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

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
  const [createMediaIds, setCreateMediaIds] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editMediaIds, setEditMediaIds] = useState([]);
  const [imageUrls, setImageUrls] = useState({}); // Cache for image URLs
  const [imageSizeDialogOpen, setImageSizeDialogOpen] = useState(false);
  const [editingImageMediaId, setEditingImageMediaId] = useState(null);
  const [imageWidth, setImageWidth] = useState(100);
  const [imageHeight, setImageHeight] = useState(100);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [originalImageSize, setOriginalImageSize] = useState({ width: 100, height: 100 });
  const [imageAlignment, setImageAlignment] = useState('center');
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Cleanup image URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

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

  const extractMediaIdsFromContent = (content) => {
    if (!content) return [];
    const imgTagRegex = /<img[^>]*mediaId="([^"]+)"[^>]*>/g;
    const mediaIds = [];
    let match;
    while ((match = imgTagRegex.exec(content)) !== null) {
      mediaIds.push(match[1]);
    }
    return mediaIds;
  };

  const parseImageAttributes = (content, mediaId) => {
    const imgTagRegex = new RegExp(`<img[^>]*mediaId=["']${mediaId}["'][^>]*>`, 'i');
    const match = content.match(imgTagRegex);
    if (!match) return null;
    
    const imgTag = match[0];
    const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
    const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
    
    // Parse alignment from style attribute or align attribute
    let alignment = 'center';
    const styleMatch = imgTag.match(/style=["']([^"']*)["']/i);
    if (styleMatch) {
      const style = styleMatch[1];
      if (style.includes('float:left') || style.includes('float: left')) {
        alignment = 'left';
      } else if (style.includes('float:right') || style.includes('float: right')) {
        alignment = 'right';
      } else if (style.includes('margin-left:auto') && style.includes('margin-right:auto')) {
        alignment = 'center';
      }
    }
    const alignMatch = imgTag.match(/align=["']?(left|center|right)["']?/i);
    if (alignMatch) {
      alignment = alignMatch[1].toLowerCase();
    }
    
    return {
      width: widthMatch ? parseInt(widthMatch[1], 10) : null,
      height: heightMatch ? parseInt(heightMatch[1], 10) : null,
      alignment: alignment,
      imgTag: imgTag,
    };
  };

  const handleImageSizeClick = (mediaId) => {
    const attrs = parseImageAttributes(articleData.content, mediaId);
    if (attrs) {
      setEditingImageMediaId(mediaId);
      setImageAlignment(attrs.alignment || 'center');
      // Get original image dimensions if available
      if (imageUrls[mediaId]) {
        const img = new Image();
        img.onload = () => {
          setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight });
          setImageWidth(attrs.width || img.naturalWidth);
          setImageHeight(attrs.height || img.naturalHeight);
          setImageSizeDialogOpen(true);
        };
        img.src = imageUrls[mediaId];
      } else {
        setImageWidth(attrs.width || 100);
        setImageHeight(attrs.height || 100);
        setImageSizeDialogOpen(true);
      }
    }
  };

  const handleImageSizeSave = () => {
    if (!editingImageMediaId) return;
    
    const attrs = parseImageAttributes(articleData.content, editingImageMediaId);
    if (!attrs) return;
    
    // Build new img tag with updated dimensions and alignment
    let newImgTag = attrs.imgTag;
    
    // Update or add width attribute
    if (newImgTag.includes('width=')) {
      newImgTag = newImgTag.replace(/width=["']?\d+["']?/i, `width="${imageWidth}"`);
    } else {
      newImgTag = newImgTag.replace(/mediaId=["']([^"']+)["']/, `mediaId="$1" width="${imageWidth}"`);
    }
    
    // Update or add height attribute
    if (newImgTag.includes('height=')) {
      newImgTag = newImgTag.replace(/height=["']?\d+["']?/i, `height="${imageHeight}"`);
    } else {
      newImgTag = newImgTag.replace(/mediaId=["']([^"']+)["']/, `mediaId="$1" height="${imageHeight}"`);
    }
    
    // Update alignment in style attribute
    let styleValue = '';
    if (imageAlignment === 'left') {
      styleValue = 'float:left;';
    } else if (imageAlignment === 'right') {
      styleValue = 'float:right;';
    } else {
      styleValue = 'display:block;margin-left:auto;margin-right:auto;';
    }
    
    // Remove old style and align attributes
    newImgTag = newImgTag.replace(/style=["'][^"']*["']/gi, '');
    newImgTag = newImgTag.replace(/align=["'][^"']*["']/gi, '');
    
    // Add new style attribute
    if (newImgTag.includes('style=')) {
      newImgTag = newImgTag.replace(/style=["']([^"']*)["']/i, `style="${styleValue}$1"`);
    } else {
      newImgTag = newImgTag.replace(/mediaId=["']([^"']+)["']/, `mediaId="$1" style="${styleValue}"`);
    }
    
    // Replace img tag in content
    const imgTagRegex = new RegExp(`<img[^>]*mediaId=["']${editingImageMediaId}["'][^>]*>`, 'gi');
    setArticleData((prev) => ({
      ...prev,
      content: prev.content.replace(imgTagRegex, newImgTag),
    }));
    
    setImageSizeDialogOpen(false);
    setEditingImageMediaId(null);
  };

  const handleImageSizeCancel = () => {
    setImageSizeDialogOpen(false);
    setEditingImageMediaId(null);
    setIsResizing(false);
  };

  // Handle mouse move for resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Calculate new dimensions
      let newWidth = resizeStart.width + deltaX;
      let newHeight = resizeStart.height + deltaY;
      
      // Apply constraints
      newWidth = Math.max(50, Math.min(2000, newWidth));
      newHeight = Math.max(50, Math.min(2000, newHeight));
      
      if (maintainAspectRatio && originalImageSize.width > 0) {
        const ratio = originalImageSize.height / originalImageSize.width;
        newHeight = Math.round(newWidth * ratio);
      }
      
      setImageWidth(Math.round(newWidth));
      setImageHeight(Math.round(newHeight));
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, resizeStart, maintainAspectRatio, originalImageSize]);

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
    // Initialize mediaIds from article content if it contains <img> tags
    const mediaIdsFromContent = extractMediaIdsFromContent(article.content || '');
    setEditMediaIds(mediaIdsFromContent);
    // Load image URLs for display
    loadImageUrls(mediaIdsFromContent);
    // Fetch users and tags for selection
    fetchUsers();
    fetchTags();
  };

  const loadImageUrls = async (mediaIds) => {
    const urls = {};
    for (const mediaId of mediaIds) {
      try {
        const objectUrl = await loadImageWithCache(mediaId);
        urls[mediaId] = objectUrl;
      } catch (err) {
        console.error(`Error loading image ${mediaId}:`, err);
      }
    }
    setImageUrls((prev) => ({ ...prev, ...urls }));
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
    setEditMediaIds([]);
    // Clean up image URLs
    Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    setImageUrls({});
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
    setCreateMediaIds([]);
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
    setCreateMediaIds([]);
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
      
      // Extract mediaIds from current content - this ensures we only send IDs that are actually in content
      const mediaIdsFromContent = extractMediaIdsFromContent(articleData.content);
      // Always send an empty array if no images, never null or undefined
      const mediaIdsToSend = Array.isArray(mediaIdsFromContent) && mediaIdsFromContent.length > 0 
        ? mediaIdsFromContent 
        : [];
      
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
        mediaIds: Array.isArray(mediaIdsToSend) ? mediaIdsToSend : [],
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

  const handleImageUpload = async (file, isEdit = false) => {
    if (!file) return;
    
    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      setCreateError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/v1/admin/media/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.mediaId) {
        const mediaId = response.data.mediaId;
        
        // Insert <img> tag into content at cursor position or at the end
        const imgTag = `<img mediaId="${mediaId}" alt="Uploaded image" />`;
        
        if (isEdit) {
          setArticleData((prev) => ({
            ...prev,
            content: prev.content + '\n' + imgTag,
          }));
          setEditMediaIds((prev) => [...prev, mediaId]);
          // Load image URL for display
          loadImageUrls([mediaId]);
        } else {
          setCreateArticleData((prev) => ({
            ...prev,
            content: prev.content + '\n' + imgTag,
          }));
          setCreateMediaIds((prev) => [...prev, mediaId]);
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to upload image. Please try again.';
      if (isEdit) {
        setSubmitError(errorMsg);
      } else {
        setCreateError(errorMsg);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFileSelect = (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file, isEdit);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDeleteImage = (mediaId) => {
    // Remove mediaId from editMediaIds
    setEditMediaIds((prev) => prev.filter((id) => id !== mediaId));
    
    // Remove img tag from content
    const imgTagRegex = new RegExp(`<img[^>]*mediaId=["']${mediaId}["'][^>]*/?>\\s*`, 'gi');
    setArticleData((prev) => ({
      ...prev,
      content: prev.content.replace(imgTagRegex, ''),
    }));
    
    // Clean up image URL
    if (imageUrls[mediaId]) {
      URL.revokeObjectURL(imageUrls[mediaId]);
      setImageUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[mediaId];
        return newUrls;
      });
    }
  };

  const handleSubmitCreate = async () => {
    if (!validateCreateForm()) {
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      // Extract mediaIds from content
      const mediaIdsFromContent = extractMediaIdsFromContent(createArticleData.content);
      const createMediaIdsArray = Array.isArray(createMediaIds) ? createMediaIds : [];
      const mediaIdsFromContentArray = Array.isArray(mediaIdsFromContent) ? mediaIdsFromContent : [];
      const allMediaIds = [...new Set([...createMediaIdsArray, ...mediaIdsFromContentArray])];
      // Always send an empty array if no images, never null or undefined
      const mediaIdsToSend = Array.isArray(allMediaIds) && allMediaIds.length > 0 ? allMediaIds : [];
      
      const response = await apiClient.post('/api/v1/admin/articles', {
        title: createArticleData.title.trim(),
        slug: createArticleData.slug.trim(),
        content: createArticleData.content.trim(),
        excerpt: createArticleData.excerpt.trim() || null,
        status: createArticleData.status,
        allowedUserIds: createArticleData.status === 'PUBLISHED' ? [] : (Array.isArray(selectedUserIds) ? selectedUserIds : []),
        tagIds: Array.isArray(createTagIds) ? createTagIds : [],
        mediaIds: mediaIdsToSend,
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
                    <ArticleContent content={article.content} />
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="edit-image-upload"
                  type="file"
                  onChange={(e) => handleImageFileSelect(e, true)}
                  disabled={submitting || uploadingImage}
                />
                <label htmlFor="edit-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={submitting || uploadingImage}
                    sx={{ textTransform: 'none' }}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </label>
                {uploadingImage && (
                  <CircularProgress size={20} />
                )}
              </Box>
              {/* Display existing images with delete option */}
              {(() => {
                const mediaIdsInContent = extractMediaIdsFromContent(articleData.content);
                if (mediaIdsInContent.length === 0) return null;
                
                return (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Uploaded Images:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {mediaIdsInContent.map((mediaId) => {
                      
                      return (
                        <Box
                          key={mediaId}
                          sx={{
                            position: 'relative',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            overflow: 'hidden',
                            width: 120,
                            height: 120,
                            '&:hover .image-action-button': {
                              opacity: 1,
                            },
                          }}
                        >
                          {imageUrls[mediaId] ? (
                            <Box
                              component="img"
                              src={imageUrls[mediaId]}
                              alt="Article image"
                              sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'action.hover',
                              }}
                            >
                              <CircularProgress size={24} />
                            </Box>
                          )}
                          <IconButton
                            className="image-action-button"
                            size="small"
                            onClick={() => handleDeleteImage(mediaId)}
                            disabled={submitting}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              bgcolor: 'error.main',
                              color: 'white',
                              opacity: 0.8,
                              '&:hover': {
                                bgcolor: 'error.dark',
                                opacity: 1,
                              },
                              transition: 'opacity 0.2s',
                            }}
                            aria-label="Delete image"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            className="image-action-button"
                            size="small"
                            onClick={() => handleImageSizeClick(mediaId)}
                            disabled={submitting}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              bgcolor: 'primary.main',
                              color: 'white',
                              opacity: 0.8,
                              '&:hover': {
                                bgcolor: 'primary.dark',
                                opacity: 1,
                              },
                              transition: 'opacity 0.2s',
                            }}
                            aria-label="Adjust image size"
                          >
                            <SettingsIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      );
                      })}
                    </Box>
                  </Box>
                );
              })()}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="create-image-upload"
                  type="file"
                  onChange={(e) => handleImageFileSelect(e, false)}
                  disabled={creating || uploadingImage}
                />
                <label htmlFor="create-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    disabled={creating || uploadingImage}
                    sx={{ textTransform: 'none' }}
                  >
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </label>
                {uploadingImage && (
                  <CircularProgress size={20} />
                )}
              </Box>
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

      {/* Image Size Adjustment Dialog */}
      <Dialog open={imageSizeDialogOpen} onClose={handleImageSizeCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Image Size</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography gutterBottom>Width (pixels)</Typography>
                <Slider
                  value={imageWidth}
                  onChange={(e, newValue) => {
                    setImageWidth(newValue);
                    if (maintainAspectRatio && originalImageSize.width > 0) {
                      const ratio = originalImageSize.height / originalImageSize.width;
                      setImageHeight(Math.round(newValue * ratio));
                    }
                  }}
                  min={50}
                  max={2000}
                  step={10}
                  valueLabelDisplay="auto"
                  disabled={submitting}
                />
                <TextField
                  fullWidth
                  type="number"
                  value={imageWidth}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 50;
                    setImageWidth(Math.max(50, Math.min(2000, value)));
                    if (maintainAspectRatio && originalImageSize.width > 0) {
                      const ratio = originalImageSize.height / originalImageSize.width;
                      setImageHeight(Math.round(value * ratio));
                    }
                  }}
                  inputProps={{ min: 50, max: 2000 }}
                  sx={{ mt: 1 }}
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Height (pixels)</Typography>
                <Slider
                  value={imageHeight}
                  onChange={(e, newValue) => {
                    setImageHeight(newValue);
                    if (maintainAspectRatio && originalImageSize.height > 0) {
                      const ratio = originalImageSize.width / originalImageSize.height;
                      setImageWidth(Math.round(newValue * ratio));
                    }
                  }}
                  min={50}
                  max={2000}
                  step={10}
                  valueLabelDisplay="auto"
                  disabled={submitting}
                />
                <TextField
                  fullWidth
                  type="number"
                  value={imageHeight}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10) || 50;
                    setImageHeight(Math.max(50, Math.min(2000, value)));
                    if (maintainAspectRatio && originalImageSize.height > 0) {
                      const ratio = originalImageSize.width / originalImageSize.height;
                      setImageWidth(Math.round(value * ratio));
                    }
                  }}
                  inputProps={{ min: 50, max: 2000 }}
                  sx={{ mt: 1 }}
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={maintainAspectRatio}
                      onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                      disabled={submitting}
                    />
                  }
                  label="Maintain aspect ratio"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Alignment</Typography>
                <ToggleButtonGroup
                  value={imageAlignment}
                  exclusive
                  onChange={(e, newAlignment) => {
                    if (newAlignment !== null) {
                      setImageAlignment(newAlignment);
                    }
                  }}
                  aria-label="image alignment"
                  disabled={submitting}
                >
                  <ToggleButton value="left" aria-label="left aligned">
                    <FormatAlignLeftIcon />
                  </ToggleButton>
                  <ToggleButton value="center" aria-label="center aligned">
                    <FormatAlignCenterIcon />
                  </ToggleButton>
                  <ToggleButton value="right" aria-label="right aligned">
                    <FormatAlignRightIcon />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              {editingImageMediaId && imageUrls[editingImageMediaId] && (
                <Grid item xs={12}>
                  <Box 
                    sx={{ 
                      mt: 2,
                      display: 'flex',
                      justifyContent: imageAlignment === 'left' ? 'flex-start' : 
                                     imageAlignment === 'right' ? 'flex-end' : 'center',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'inline-block',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        p: 0.5,
                      }}
                    >
                      <Box
                        component="img"
                        src={imageUrls[editingImageMediaId]}
                        alt="Preview"
                        sx={{
                          display: 'block',
                          width: `${Math.min(imageWidth, 400)}px`,
                          height: `${Math.min(imageHeight, 400)}px`,
                          objectFit: 'contain',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                        draggable={false}
                      />
                      {/* Resize handles */}
                      <Box
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsResizing(true);
                          setResizeStart({
                            x: e.clientX,
                            y: e.clientY,
                            width: imageWidth,
                            height: imageHeight,
                          });
                        }}
                        sx={{
                          position: 'absolute',
                          bottom: -4,
                          right: -4,
                          width: 16,
                          height: 16,
                          bgcolor: 'primary.main',
                          border: '2px solid white',
                          borderRadius: '50%',
                          cursor: 'nwse-resize',
                          zIndex: 1,
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            transform: 'scale(1.2)',
                          },
                          transition: 'all 0.2s',
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    Preview: {imageWidth} × {imageHeight}px • Drag corner to resize
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleImageSizeCancel}
            sx={{ textTransform: 'none' }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImageSizeSave}
            variant="contained"
            sx={{ textTransform: 'none' }}
            disabled={submitting}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBlogPage;

