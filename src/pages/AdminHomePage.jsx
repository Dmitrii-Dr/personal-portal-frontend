import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWithAuth } from '../utils/api';
import apiClient from '../utils/api';
import { loadImageWithCache, loadThumbnailWithCache } from '../utils/imageCache';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Container,
  Avatar,
  Divider,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  CardMedia,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowLeftRoundedIcon from '@mui/icons-material/KeyboardArrowLeftRounded';
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { ContactPlatformIcon } from '../components/icons';

const AdminHomePage = () => {
  const { t } = useTranslation();
  const [welcomeData, setWelcomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSiteActive, setIsSiteActive] = useState(true);

  // Welcome message state
  const [aboutMeContent, setAboutMeContent] = useState('');
  const [educationContent, setEducationContent] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  // Blog articles state
  const [welcomeArticleIds, setWelcomeArticleIds] = useState([]);
  const [availableArticles, setAvailableArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articlesError, setArticlesError] = useState(null);
  const [invalidArticleIdsError, setInvalidArticleIdsError] = useState(null);
  const [moreAboutMeArticleId, setMoreAboutMeArticleId] = useState('');
  const [invalidMoreAboutMeArticleIdError, setInvalidMoreAboutMeArticleIdError] = useState(null);

  // Media IDs state
  const [welcomeRightMediaId, setWelcomeRightMediaId] = useState(null);
  const [welcomeLeftMediaId, setWelcomeLeftMediaId] = useState(null);
  const [welcomeMobileMediaId, setWelcomeMobileMediaId] = useState(null);
  const [aboutMediaId, setAboutMediaId] = useState(null);
  const [educationMediaIds, setEducationMediaIds] = useState([]);
  const [reviewMediaIds, setReviewMediaIds] = useState([]);

  // Hero frame background colours (customisable, stored in extendedParameters)
  const [welcomeLeftColour, setWelcomeLeftColour] = useState('#d6baab');
  const [welcomeRightColour, setWelcomeRightColour] = useState('#7f7d72');
  const [welcomeButtonColour, setWelcomeButtonColour] = useState('#ffffff');
  const [welcomeButtonTextColour, setWelcomeButtonTextColour] = useState('#2C5F5F');
  const [mainThemeColourHex, setMainThemeColourHex] = useState('#2C5F5F');
  /** Legal / billing text shown in landing footer (stored in extendedParameters.footerMessage) */
  const [footerMessage, setFooterMessage] = useState('');
  /** Agreement / policy links in landing footer (extendedParameters.footerLinks) */
  const [footerLinks, setFooterLinks] = useState([]);
  const [newFooterLink, setNewFooterLink] = useState({ linkDisplayName: '', linkUrl: '' });

  // Image upload states
  const [uploadingWelcomeRightImage, setUploadingWelcomeRightImage] = useState(false);
  const [uploadingWelcomeLeftImage, setUploadingWelcomeLeftImage] = useState(false);
  const [uploadingWelcomeMobileImage, setUploadingWelcomeMobileImage] = useState(false);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [uploadingEducationImage, setUploadingEducationImage] = useState(false);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);

  // Image preview URLs
  const [welcomeRightImageUrl, setWelcomeRightImageUrl] = useState(null);
  const [welcomeLeftImageUrl, setWelcomeLeftImageUrl] = useState(null);
  const [welcomeMobileImageUrl, setWelcomeMobileImageUrl] = useState(null);
  const [aboutImageUrl, setAboutImageUrl] = useState(null);
  const [educationImageUrls, setEducationImageUrls] = useState([]);
  const [reviewImageUrls, setReviewImageUrls] = useState([]);
  const [educationPreviewIndex, setEducationPreviewIndex] = useState(0);
  const [draggedEducationIndex, setDraggedEducationIndex] = useState(null);
  const [reviewPreviewIndex, setReviewPreviewIndex] = useState(0);
  const [draggedReviewIndex, setDraggedReviewIndex] = useState(null);

  // Contact links state
  // Supported platforms: Telegram, LinkedIn, GitHub, Email, Phone, Instagram, Twitter, Facebook, YouTube, VK.com, WhatsApp, Website, B17
  // Expected backend format in /welcome response:
  // {
  //   "contact": [
  //     {
  //       "platform": "Telegram",  // Required: Platform name
  //       "value": "https://t.me/username"  // Required: URL or contact value
  //     },
  //     {
  //       "platform": "Telegram",
  //       "value": "https://t.me/channel"
  //     }
  //   ]
  // }
  const [contactLinks, setContactLinks] = useState([
    {
      platform: 'Telegram',
      value: 'https://t.me/example',
      description: 'Personal Account',
    },
    {
      platform: 'LinkedIn',
      value: 'https://www.linkedin.com/in/example',
      description: '',
    },
  ]);
  const [editingContactIndex, setEditingContactIndex] = useState(null);
  const [newContactLink, setNewContactLink] = useState({
    platform: 'Telegram',
    value: '',
    description: '',
  });

  const supportedPlatforms = [
    'Telegram',
    'LinkedIn',
    'GitHub',
    'Email',
    'Phone',
    'Instagram',
    'Twitter',
    'Facebook',
    'YouTube',
    'VK.com',
    'WhatsApp',
    'Website',
    'B17',
  ];

  // Gallery dialog state
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [galleryError, setGalleryError] = useState(null);
  const [galleryThumbnailUrls, setGalleryThumbnailUrls] = useState({});
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryTotalPages, setGalleryTotalPages] = useState(1);
  const [galleryTarget, setGalleryTarget] = useState('review');



  // Fetch welcome data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchWithAuth('/api/v1/public/welcome');
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status}`);
        }
        const data = await response.json();
        setWelcomeData(data);
        setIsSiteActive(typeof data.isActive === 'boolean' ? data.isActive : true);
        setAboutMeContent(data.aboutMessage || '');
        setEducationContent(data.educationMessage || '');
        setReviewMessage(data.reviewMessage || '');
        setWelcomeRightMediaId(data.welcomeRightMediaId || null);
        setWelcomeLeftMediaId(data.welcomeLeftMediaId || null);
        setWelcomeMobileMediaId(data.welcomeMobileMediaId || null);
        setAboutMediaId(data.aboutMediaId || null);
        const nextEducationMediaIds = Array.isArray(data.educationMediaIds)
          ? data.educationMediaIds
          : (data.educationMediaId ? [data.educationMediaId] : []);
        setEducationMediaIds(nextEducationMediaIds);
        setReviewMediaIds(data.reviewMediaIds || []);
        setWelcomeArticleIds(data.welcomeArticleIds || []);

        // Read hero frame colours from extendedParameters
        const ep = data.extendedParameters || {};
        setWelcomeLeftColour(ep.welcomeLeftColourHex || '#d6baab');
        setWelcomeRightColour(ep.welcomeRightColourHex || '#7f7d72');
        setWelcomeButtonColour(ep.welcomeBookSessionButtonColourHex || '#ffffff');
        setWelcomeButtonTextColour(ep.welcomeBookSessionButtonTextColourHex || '#2C5F5F');
        setMainThemeColourHex(ep.mainThemeColourHex || '#2C5F5F');
        setMoreAboutMeArticleId(ep.moreAboutMeArticleId || '');
        setFooterMessage(typeof ep.footerMessage === 'string' ? ep.footerMessage : '');
        if (Array.isArray(ep.footerLinks)) {
          setFooterLinks(
            ep.footerLinks
              .filter((item) => item && typeof item === 'object')
              .map((item) => ({
                linkDisplayName: typeof item.linkDisplayName === 'string' ? item.linkDisplayName : '',
                linkUrl: typeof item.linkUrl === 'string' ? item.linkUrl : '',
              }))
          );
        } else {
          setFooterLinks([]);
        }

        // Load contact links if available
        if (data.contact && Array.isArray(data.contact)) {
          setContactLinks(data.contact.map(link => ({
            platform: link.platform || 'Website',
            value: link.value || '',
            description: link.description || '',
          })));
        }

        // Load images if mediaIds exist
        if (data.welcomeRightMediaId) {
          loadImage(data.welcomeRightMediaId, 'welcome-right').catch(err => {
            console.error('Error loading welcome right image:', err);
          });
        }
        if (data.welcomeLeftMediaId) {
          loadImage(data.welcomeLeftMediaId, 'welcome-left').catch(err => {
            console.error('Error loading welcome left image:', err);
          });
        }
        if (data.welcomeMobileMediaId) {
          loadImage(data.welcomeMobileMediaId, 'welcome-mobile').catch(err => {
            console.error('Error loading welcome mobile image:', err);
          });
        }
        if (data.aboutMediaId) {
          loadImage(data.aboutMediaId, 'about').catch(err => {
            console.error('Error loading about image:', err);
          });
        }
        if (nextEducationMediaIds.length > 0) {
          loadEducationImages(nextEducationMediaIds);
        }

        // Load review images if reviewMediaIds exist
        if (data.reviewMediaIds && Array.isArray(data.reviewMediaIds) && data.reviewMediaIds.length > 0) {
          loadReviewImages(data.reviewMediaIds);
        }
      } catch (err) {
        console.error('Error fetching welcome data:', err);
        setError(err.message || t('admin.home.failedToLoadWelcomeData'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch all available articles for selection
  useEffect(() => {
    const fetchArticles = async () => {
      setLoadingArticles(true);
      setArticlesError(null);
      try {
        const response = await apiClient.get('/api/v1/public/articles', {
          timeout: 10000,
        });
        if (response.data && Array.isArray(response.data)) {
          setAvailableArticles(response.data);
        } else {
          setAvailableArticles([]);
        }
      } catch (err) {
        console.error('Error fetching articles:', err);
        setArticlesError(err.message || t('admin.home.failedToLoadArticles'));
        setAvailableArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArticles();
  }, []);

  // Validate welcomeArticleIds against available articles
  // This runs when both welcome data and articles are loaded
  useEffect(() => {
    // Only validate if both data sources are loaded
    if (loading || loadingArticles || !welcomeData || availableArticles.length === 0) {
      return;
    }

    // Get current welcomeArticleIds from state
    setWelcomeArticleIds((currentArticleIds) => {
      // If no article IDs to validate, return as is
      if (!currentArticleIds || currentArticleIds.length === 0) {
        setInvalidArticleIdsError(null);
        return currentArticleIds;
      }

      // Check if any welcomeArticleIds are invalid (not in availableArticles)
      const availableArticleIds = new Set(availableArticles.map(article => article.articleId));
      const invalidArticleIds = currentArticleIds.filter(
        articleId => articleId && !availableArticleIds.has(articleId)
      );

      if (invalidArticleIds.length > 0) {
        // Show error message above Blog section
        const errorMessage = t('admin.home.invalidArticleIds', { ids: invalidArticleIds.join(', ') });
        setInvalidArticleIdsError(errorMessage);

        // Clear invalid article IDs - keep only valid ones
        const validArticleIds = currentArticleIds.filter(
          articleId => !articleId || availableArticleIds.has(articleId)
        );

        console.warn('Invalid welcomeArticleIds detected and cleared:', invalidArticleIds);
        return validArticleIds;
      }

      // Clear error if no invalid IDs found
      setInvalidArticleIdsError(null);
      return currentArticleIds;
    });
  }, [loading, loadingArticles, welcomeData, availableArticles]);

  // Validate moreAboutMeArticleId against available articles (extendedParameters)
  useEffect(() => {
    if (loading || loadingArticles || !welcomeData || articlesError) {
      return;
    }
    if (!moreAboutMeArticleId) {
      return;
    }
    const availableIds = new Set(availableArticles.map((article) => article.articleId));
    if (!availableIds.has(moreAboutMeArticleId)) {
      const invalidId = moreAboutMeArticleId;
      setInvalidMoreAboutMeArticleIdError(
        t('admin.home.invalidMoreAboutMeArticleId', { id: invalidId })
      );
      console.warn('Invalid moreAboutMeArticleId detected and cleared:', invalidId);
      setMoreAboutMeArticleId('');
    } else {
      setInvalidMoreAboutMeArticleIdError(null);
    }
  }, [
    loading,
    loadingArticles,
    welcomeData,
    availableArticles,
    articlesError,
    moreAboutMeArticleId,
    t,
  ]);

  // Load image from mediaId with caching
  const loadImage = async (mediaId, type) => {
    if (!mediaId) return;

    try {
      const objectUrl = await loadImageWithCache(mediaId);

      if (type === 'welcome-right') {
        setWelcomeRightImageUrl(objectUrl);
      } else if (type === 'welcome-left') {
        setWelcomeLeftImageUrl(objectUrl);
      } else if (type === 'welcome-mobile') {
        setWelcomeMobileImageUrl(objectUrl);
      } else if (type === 'about') {
        setAboutImageUrl(objectUrl);
      }
    } catch (err) {
      console.error(`Error loading image for ${type}:`, err);
    }
  };

  // Load multiple education images
  const loadEducationImages = async (mediaIds) => {
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) return;

    try {
      const imagePromises = mediaIds.map(mediaId =>
        loadImageWithCache(mediaId).catch(err => {
          console.error(`Error loading education image ${mediaId}:`, err);
          return null;
        })
      );
      const urls = await Promise.all(imagePromises);
      setEducationImageUrls(urls);
    } catch (err) {
      console.error('Error loading education images:', err);
    }
  };

  // Load multiple review images
  const loadReviewImages = async (mediaIds) => {
    if (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0) return;

    try {
      const imagePromises = mediaIds.map(mediaId =>
        loadImageWithCache(mediaId).catch(err => {
          console.error(`Error loading review image ${mediaId}:`, err);
          return null;
        })
      );
      const urls = await Promise.all(imagePromises);
      setReviewImageUrls(urls.filter(url => url !== null));
    } catch (err) {
      console.error('Error loading review images:', err);
    }
  };


  const handleEducationImagesUpload = async (files) => {
    const imageFiles = Array.from(files || []);
    if (imageFiles.length === 0) return;

    if (imageFiles.some(file => !file.type.startsWith('image/'))) {
      setError(t('admin.home.pleaseSelectImageFile'));
      return;
    }

    setUploadingEducationImage(true);
    try {
      const uploadedMediaIds = [];

      for (const file of imageFiles) {
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

        uploadedMediaIds.push(uploadResponse.data.mediaId);
      }

      const newEducationMediaIds = [...educationMediaIds, ...uploadedMediaIds];
      setEducationMediaIds(newEducationMediaIds);

      const uploadedUrls = await Promise.all(
        uploadedMediaIds.map(mediaId =>
          loadImageWithCache(mediaId).catch(err => {
            console.error(`Error loading education image ${mediaId}:`, err);
            return null;
          })
        )
      );
      setEducationImageUrls(prev => [...prev, ...uploadedUrls]);

      const updatePayload = {
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeRightMediaId: welcomeRightMediaId,
        welcomeLeftMediaId: welcomeLeftMediaId,
        welcomeMobileMediaId: welcomeMobileMediaId,
        aboutMediaId: aboutMediaId,
        educationMediaIds: newEducationMediaIds,
        reviewMediaIds: reviewMediaIds,
        welcomeArticleIds: welcomeArticleIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update education images: ${updateResponse.status}`);
      }
    } catch (err) {
      console.error('Error uploading education images:', err);
      setError(err.message || 'Failed to upload education images');
    } finally {
      setUploadingEducationImage(false);
    }
  };

  // Handle image upload for a specific section
  const handleImageUpload = async (file, type) => {
    if (!file) return;

    if (type === 'education') {
      await handleEducationImagesUpload([file]);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('admin.home.pleaseSelectImageFile'));
      return;
    }

    // Set uploading state
    if (type === 'welcome-right') {
      setUploadingWelcomeRightImage(true);
    } else if (type === 'welcome-left') {
      setUploadingWelcomeLeftImage(true);
    } else if (type === 'welcome-mobile') {
      setUploadingWelcomeMobileImage(true);
    } else if (type === 'about') {
      setUploadingAboutImage(true);
    } else if (type === 'education') {
      setUploadingEducationImage(true);
    } else if (type === 'review') {
      setUploadingReviewImage(true);
    }

    try {
      // Upload image
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

      const mediaId = uploadResponse.data.mediaId;

      // Update state immediately
      if (type === 'welcome-right') {
        setWelcomeRightMediaId(mediaId);
      } else if (type === 'welcome-left') {
        setWelcomeLeftMediaId(mediaId);
      } else if (type === 'welcome-mobile') {
        setWelcomeMobileMediaId(mediaId);
      } else if (type === 'about') {
        setAboutMediaId(mediaId);
      } else if (type === 'review') {
        // Add to review media IDs array
        const newReviewMediaIds = [...reviewMediaIds, mediaId];
        setReviewMediaIds(newReviewMediaIds);

        // Load and display the new image
        const objectUrl = await loadImageWithCache(mediaId);
        setReviewImageUrls(prev => [...prev, objectUrl]);
        setReviewPreviewIndex(newReviewMediaIds.length - 1);

        // Immediately update via PUT request
        const updatePayload = {
          aboutMessage: aboutMeContent,
          educationMessage: educationContent,
          reviewMessage: reviewMessage,
          welcomeRightMediaId: welcomeRightMediaId,
          welcomeLeftMediaId: welcomeLeftMediaId,
          welcomeMobileMediaId: welcomeMobileMediaId,
          aboutMediaId: aboutMediaId,
          educationMediaIds: educationMediaIds,
          reviewMediaIds: newReviewMediaIds,
          welcomeArticleIds: welcomeArticleIds,
          contact: formatContactForBackend(),
        };

        const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to update review mediaIds: ${updateResponse.status}`);
        }

        return; // Early return for review type
      }

      // Immediately update the corresponding mediaId via PUT request (for non-review types)
      const updatePayload = {
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeRightMediaId: type === 'welcome-right' ? mediaId : welcomeRightMediaId,
        welcomeLeftMediaId: type === 'welcome-left' ? mediaId : welcomeLeftMediaId,
        welcomeMobileMediaId: type === 'welcome-mobile' ? mediaId : welcomeMobileMediaId,
        aboutMediaId: type === 'about' ? mediaId : aboutMediaId,
        educationMediaIds: educationMediaIds,
        reviewMediaIds: reviewMediaIds,
        welcomeArticleIds: welcomeArticleIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update mediaId: ${updateResponse.status}`);
      }

      // Load and display the image
      await loadImage(mediaId, type);
    } catch (err) {
      console.error(`Error uploading image for ${type}:`, err);
      setError(err.message || `Failed to upload image for ${type}`);
    } finally {
      if (type === 'welcome-right') {
        setUploadingWelcomeRightImage(false);
      } else if (type === 'welcome-left') {
        setUploadingWelcomeLeftImage(false);
      } else if (type === 'welcome-mobile') {
        setUploadingWelcomeMobileImage(false);
      } else if (type === 'about') {
        setUploadingAboutImage(false);
      } else if (type === 'education') {
        setUploadingEducationImage(false);
      } else if (type === 'review') {
        setUploadingReviewImage(false);
      }
    }
  };

  // Handle deletion of an education image
  const handleDeleteEducationImage = async (index) => {
    try {
      const newEducationMediaIds = educationMediaIds.filter((_, i) => i !== index);
      const newEducationImageUrls = educationImageUrls.filter((_, i) => i !== index);

      setEducationMediaIds(newEducationMediaIds);
      setEducationImageUrls(newEducationImageUrls);

      const updatePayload = {
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeRightMediaId: welcomeRightMediaId,
        welcomeLeftMediaId: welcomeLeftMediaId,
        welcomeMobileMediaId: welcomeMobileMediaId,
        aboutMediaId: aboutMediaId,
        educationMediaIds: newEducationMediaIds,
        reviewMediaIds: reviewMediaIds,
        welcomeArticleIds: welcomeArticleIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to delete education image: ${updateResponse.status}`);
      }
    } catch (err) {
      console.error('Error deleting education image:', err);
      setError(err.message || 'Failed to delete education image');
    }
  };

  const persistEducationMediaOrder = async (nextEducationMediaIds) => {
    const updatePayload = {
      aboutMessage: aboutMeContent,
      educationMessage: educationContent,
      reviewMessage: reviewMessage,
      welcomeRightMediaId: welcomeRightMediaId,
      welcomeLeftMediaId: welcomeLeftMediaId,
      welcomeMobileMediaId: welcomeMobileMediaId,
      aboutMediaId: aboutMediaId,
      educationMediaIds: nextEducationMediaIds,
      reviewMediaIds: reviewMediaIds,
      welcomeArticleIds: welcomeArticleIds,
      contact: formatContactForBackend(),
    };

    const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to save education image order: ${updateResponse.status}`);
    }
  };

  const handleReorderEducationImage = async (fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= educationMediaIds.length ||
      toIndex >= educationMediaIds.length
    ) {
      return;
    }

    const previousMediaIds = educationMediaIds;
    const previousImageUrls = educationImageUrls;

    const nextEducationMediaIds = [...educationMediaIds];
    const [movedMediaId] = nextEducationMediaIds.splice(fromIndex, 1);
    nextEducationMediaIds.splice(toIndex, 0, movedMediaId);

    const nextEducationImageUrls = [...educationImageUrls];
    const [movedImageUrl] = nextEducationImageUrls.splice(fromIndex, 1);
    nextEducationImageUrls.splice(toIndex, 0, movedImageUrl);

    setEducationMediaIds(nextEducationMediaIds);
    setEducationImageUrls(nextEducationImageUrls);
    setEducationPreviewIndex(toIndex);

    try {
      await persistEducationMediaOrder(nextEducationMediaIds);
    } catch (err) {
      console.error('Error reordering education images:', err);
      setEducationMediaIds(previousMediaIds);
      setEducationImageUrls(previousImageUrls);
      setEducationPreviewIndex(fromIndex);
      setError(err.message || 'Failed to reorder education images');
    }
  };

  // Handle deletion of a review image
  const handleDeleteReviewImage = async (index) => {
    try {
      const newReviewMediaIds = reviewMediaIds.filter((_, i) => i !== index);
      const newReviewImageUrls = reviewImageUrls.filter((_, i) => i !== index);

      setReviewMediaIds(newReviewMediaIds);
      setReviewImageUrls(newReviewImageUrls);
      setReviewPreviewIndex((prev) => Math.min(prev, Math.max(0, newReviewImageUrls.length - 1)));

      // Update via PUT request
      const updatePayload = {
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeRightMediaId: welcomeRightMediaId,
        welcomeLeftMediaId: welcomeLeftMediaId,
        welcomeMobileMediaId: welcomeMobileMediaId,
        aboutMediaId: aboutMediaId,
        educationMediaIds: educationMediaIds,
        reviewMediaIds: newReviewMediaIds,
        welcomeArticleIds: welcomeArticleIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to delete review image: ${updateResponse.status}`);
      }
    } catch (err) {
      console.error('Error deleting review image:', err);
      setError(err.message || 'Failed to delete review image');
    }
  };

  const persistReviewMediaOrder = async (nextReviewMediaIds) => {
    const updatePayload = {
      aboutMessage: aboutMeContent,
      educationMessage: educationContent,
      reviewMessage: reviewMessage,
      welcomeRightMediaId: welcomeRightMediaId,
      welcomeLeftMediaId: welcomeLeftMediaId,
      welcomeMobileMediaId: welcomeMobileMediaId,
      aboutMediaId: aboutMediaId,
      educationMediaIds: educationMediaIds,
      reviewMediaIds: nextReviewMediaIds,
      welcomeArticleIds: welcomeArticleIds,
      contact: formatContactForBackend(),
    };

    const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to save review image order: ${updateResponse.status}`);
    }
  };

  const handleReorderReviewImage = async (fromIndex, toIndex) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= reviewMediaIds.length ||
      toIndex >= reviewMediaIds.length
    ) {
      return;
    }

    const previousMediaIds = reviewMediaIds;
    const previousImageUrls = reviewImageUrls;

    const nextReviewMediaIds = [...reviewMediaIds];
    const [movedMediaId] = nextReviewMediaIds.splice(fromIndex, 1);
    nextReviewMediaIds.splice(toIndex, 0, movedMediaId);

    const nextReviewImageUrls = [...reviewImageUrls];
    const [movedImageUrl] = nextReviewImageUrls.splice(fromIndex, 1);
    nextReviewImageUrls.splice(toIndex, 0, movedImageUrl);

    setReviewMediaIds(nextReviewMediaIds);
    setReviewImageUrls(nextReviewImageUrls);
    setReviewPreviewIndex(toIndex);

    try {
      await persistReviewMediaOrder(nextReviewMediaIds);
    } catch (err) {
      console.error('Error reordering review images:', err);
      setReviewMediaIds(previousMediaIds);
      setReviewImageUrls(previousImageUrls);
      setReviewPreviewIndex(fromIndex);
      setError(err.message || 'Failed to reorder review images');
    }
  };

  // Fetch gallery images
  const fetchGalleryImages = async (pageNum = 0) => {
    let isMounted = true;
    const controller = new AbortController();

    try {
      setLoadingGallery(true);
      setGalleryError(null);

      const response = await apiClient.get('/api/v1/admin/media', {
        params: {
          page: pageNum,
          size: 20, // Show 20 images per page in gallery selector
        },
        signal: controller.signal,
        timeout: 10000,
      });

      if (!isMounted) return;

      const data = response.data;
      const items = data.content || [];
      setGalleryImages(items);
      setGalleryTotalPages(data.totalPages || 1);

      // Load thumbnails for all images
      const thumbnailUrls = {};
      const thumbnailPromises = items.map(async (item) => {
        if (!item.mediaId) return;
        try {
          const thumbnailUrl = await loadThumbnailWithCache(item.mediaId);
          if (isMounted) {
            thumbnailUrls[item.mediaId] = thumbnailUrl;
          }
        } catch (err) {
          console.error(`Error loading thumbnail for mediaId ${item.mediaId}:`, err);
        }
      });

      await Promise.all(thumbnailPromises);
      if (isMounted) {
        setGalleryThumbnailUrls((prev) => ({ ...prev, ...thumbnailUrls }));
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return;
      }

      console.error('Error fetching gallery images:', err);
      if (isMounted) {
        let errorMessage = 'Failed to load gallery images. Please try again.';
        if (err.response) {
          errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          errorMessage = 'Unable to reach the server. Please check your connection.';
        } else {
          errorMessage = err.message || errorMessage;
        }
        setGalleryError(errorMessage);
      }
    } finally {
      if (isMounted) {
        setLoadingGallery(false);
      }
    }
  };

  const handleOpenGallery = (target = 'review') => {
    setGalleryTarget(target);
    setGalleryDialogOpen(true);
    setGalleryPage(0);
    setGalleryError(null);
    fetchGalleryImages(0);
  };

  const handleCloseGallery = () => {
    setGalleryDialogOpen(false);
    setGalleryImages([]);
    setGalleryThumbnailUrls({});
    setGalleryError(null);
  };

  const handleGalleryPageChange = (event, value) => {
    setGalleryPage(value - 1);
    fetchGalleryImages(value - 1);
  };

  const handleSelectGalleryImage = async (mediaId) => {
    try {
      const objectUrl = await loadImageWithCache(mediaId);
      const singleImageTargets = {
        'welcome-left': {
          mediaKey: 'welcomeLeftMediaId',
          setMediaId: setWelcomeLeftMediaId,
          setImageUrl: setWelcomeLeftImageUrl,
        },
        'welcome-right': {
          mediaKey: 'welcomeRightMediaId',
          setMediaId: setWelcomeRightMediaId,
          setImageUrl: setWelcomeRightImageUrl,
        },
        'welcome-mobile': {
          mediaKey: 'welcomeMobileMediaId',
          setMediaId: setWelcomeMobileMediaId,
          setImageUrl: setWelcomeMobileImageUrl,
        },
        about: {
          mediaKey: 'aboutMediaId',
          setMediaId: setAboutMediaId,
          setImageUrl: setAboutImageUrl,
        },
      };
      const singleImageTarget = singleImageTargets[galleryTarget];
      const isEducationTarget = galleryTarget === 'education';
      const isReviewTarget = galleryTarget === 'review';
      const nextEducationMediaIds = isEducationTarget ? [...educationMediaIds, mediaId] : educationMediaIds;
      const nextReviewMediaIds = isReviewTarget ? [...reviewMediaIds, mediaId] : reviewMediaIds;
      const nextSingleMediaIds = {
        welcomeRightMediaId: welcomeRightMediaId,
        welcomeLeftMediaId: welcomeLeftMediaId,
        welcomeMobileMediaId: welcomeMobileMediaId,
        aboutMediaId: aboutMediaId,
      };

      if (isEducationTarget) {
        setEducationMediaIds(nextEducationMediaIds);
        setEducationImageUrls((prev) => [...prev, objectUrl]);
        setEducationPreviewIndex(nextEducationMediaIds.length - 1);
      } else if (isReviewTarget) {
        setReviewMediaIds(nextReviewMediaIds);
        setReviewImageUrls((prev) => [...prev, objectUrl]);
        setReviewPreviewIndex(nextReviewMediaIds.length - 1);
      } else if (singleImageTarget) {
        nextSingleMediaIds[singleImageTarget.mediaKey] = mediaId;
        singleImageTarget.setMediaId(mediaId);
        singleImageTarget.setImageUrl(objectUrl);
      } else {
        throw new Error(`Unsupported gallery target: ${galleryTarget}`);
      }

      // Update via PUT request
      const updatePayload = {
        aboutMessage: aboutMeContent,
        educationMessage: educationContent,
        reviewMessage: reviewMessage,
        welcomeRightMediaId: nextSingleMediaIds.welcomeRightMediaId,
        welcomeLeftMediaId: nextSingleMediaIds.welcomeLeftMediaId,
        welcomeMobileMediaId: nextSingleMediaIds.welcomeMobileMediaId,
        aboutMediaId: nextSingleMediaIds.aboutMediaId,
        educationMediaIds: nextEducationMediaIds,
        reviewMediaIds: nextReviewMediaIds,
        welcomeArticleIds: welcomeArticleIds,
        contact: formatContactForBackend(),
      };

      const updateResponse = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to add ${galleryTarget} image: ${updateResponse.status}`);
      }

      // Close gallery dialog
      handleCloseGallery();
    } catch (err) {
      console.error('Error selecting gallery image:', err);
      setError(err.message || `Failed to add ${galleryTarget} image`);
    }
  };


  // Helper function to format contact links for backend
  const formatContactForBackend = () => {
    return contactLinks.map(link => ({
      platform: link.platform,
      value: link.value,
      ...(link.description && { description: link.description }),
    }));
  };

  // Contact links handlers
  const handleAddContactLink = () => {
    if (!newContactLink.value.trim()) {
      setError(t('admin.home.pleaseEnterContactValue'));
      return;
    }

    // Format value based on platform
    let formattedValue = newContactLink.value.trim();
    if (newContactLink.platform === 'Email' && !formattedValue.startsWith('mailto:')) {
      formattedValue = `mailto:${formattedValue}`;
    } else if (newContactLink.platform === 'Phone' && !formattedValue.startsWith('tel:')) {
      formattedValue = `tel:${formattedValue}`;
    } else if (newContactLink.platform === 'WhatsApp') {
      // Format WhatsApp URL if needed
      if (!formattedValue.startsWith('http://') && !formattedValue.startsWith('https://') && !formattedValue.startsWith('wa.me/') && !formattedValue.startsWith('api.whatsapp.com/')) {
        // If it's just a phone number, format it for WhatsApp
        const phoneNumber = formattedValue.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
        if (phoneNumber) {
          formattedValue = `https://wa.me/${phoneNumber}`;
        }
      } else if (formattedValue.startsWith('wa.me/')) {
        formattedValue = `https://${formattedValue}`;
      }
    }

    setContactLinks([
      ...contactLinks,
      {
        platform: newContactLink.platform,
        value: formattedValue,
        description: newContactLink.description.trim(),
      },
    ]);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
  };

  const handleEditContactLink = (index) => {
    setEditingContactIndex(index);
    setNewContactLink({
      platform: contactLinks[index].platform,
      value: contactLinks[index].value.replace(/^(mailto:|tel:)/, ''),
      description: contactLinks[index].description,
    });
  };

  const handleUpdateContactLink = () => {
    if (!newContactLink.value.trim()) {
      setError(t('admin.home.pleaseEnterContactValue'));
      return;
    }

    // Format value based on platform
    let formattedValue = newContactLink.value.trim();
    if (newContactLink.platform === 'Email' && !formattedValue.startsWith('mailto:')) {
      formattedValue = `mailto:${formattedValue}`;
    } else if (newContactLink.platform === 'Phone' && !formattedValue.startsWith('tel:')) {
      formattedValue = `tel:${formattedValue}`;
    } else if (newContactLink.platform === 'WhatsApp') {
      // Format WhatsApp URL if needed
      if (!formattedValue.startsWith('http://') && !formattedValue.startsWith('https://') && !formattedValue.startsWith('wa.me/') && !formattedValue.startsWith('api.whatsapp.com/')) {
        // If it's just a phone number, format it for WhatsApp
        const phoneNumber = formattedValue.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
        if (phoneNumber) {
          formattedValue = `https://wa.me/${phoneNumber}`;
        }
      } else if (formattedValue.startsWith('wa.me/')) {
        formattedValue = `https://${formattedValue}`;
      }
    }

    const updatedLinks = [...contactLinks];
    updatedLinks[editingContactIndex] = {
      platform: newContactLink.platform,
      value: formattedValue,
      description: newContactLink.description.trim(),
    };
    setContactLinks(updatedLinks);
    setEditingContactIndex(null);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
  };

  const handleDeleteContactLink = (index) => {
    setContactLinks(contactLinks.filter((_, i) => i !== index));
  };

  const handleCancelEdit = () => {
    setEditingContactIndex(null);
    setNewContactLink({
      platform: 'Telegram',
      value: '',
      description: '',
    });
  };

  const handleAddFooterLink = () => {
    const name = newFooterLink.linkDisplayName.trim();
    const url = newFooterLink.linkUrl.trim();
    if (!name || !url) {
      setError(t('admin.home.footerLinksBothRequired'));
      return;
    }
    setFooterLinks([...footerLinks, { linkDisplayName: name, linkUrl: url }]);
    setNewFooterLink({ linkDisplayName: '', linkUrl: '' });
    setError(null);
  };

  const handleDeleteFooterLink = (index) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== index));
  };

  // Save welcome data
  const handleSaveWelcome = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const response = await fetchWithAuth('/api/v1/admin/home', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aboutMessage: aboutMeContent,
          educationMessage: educationContent,
          reviewMessage: reviewMessage,
          welcomeRightMediaId: welcomeRightMediaId,
          welcomeLeftMediaId: welcomeLeftMediaId,
          welcomeMobileMediaId: welcomeMobileMediaId,
          aboutMediaId: aboutMediaId,
          educationMediaIds: educationMediaIds,
          reviewMediaIds: reviewMediaIds,
          welcomeArticleIds: welcomeArticleIds,
          isActive: isSiteActive,
          contact: formatContactForBackend(),
          // Merge colour keys into any existing extendedParameters — do NOT wipe other keys
          extendedParameters: (() => {
            const ep = {
              ...(welcomeData?.extendedParameters || {}),
              welcomeLeftColourHex: welcomeLeftColour,
              welcomeRightColourHex: welcomeRightColour,
              welcomeBookSessionButtonColourHex: welcomeButtonColour,
              welcomeBookSessionButtonTextColourHex: welcomeButtonTextColour,
              mainThemeColourHex: mainThemeColourHex,
            };
            if (moreAboutMeArticleId) {
              ep.moreAboutMeArticleId = moreAboutMeArticleId;
            } else {
              delete ep.moreAboutMeArticleId;
            }
            const trimmedFooter = typeof footerMessage === 'string' ? footerMessage.trim() : '';
            if (trimmedFooter) {
              ep.footerMessage = trimmedFooter;
            } else {
              delete ep.footerMessage;
            }
            const normalizedFooterLinks = footerLinks
              .map((item) => ({
                linkDisplayName: (item.linkDisplayName || '').trim(),
                linkUrl: (item.linkUrl || '').trim(),
              }))
              .filter((item) => item.linkDisplayName && item.linkUrl);
            if (normalizedFooterLinks.length > 0) {
              ep.footerLinks = normalizedFooterLinks;
            } else {
              delete ep.footerLinks;
            }
            return ep;
          })(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving welcome data:', err);
      setError(err.message || 'Failed to save welcome data');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (educationImageUrls.length === 0) {
      setEducationPreviewIndex(0);
      return;
    }
    setEducationPreviewIndex((prev) => Math.min(prev, educationImageUrls.length - 1));
  }, [educationImageUrls.length]);

  useEffect(() => {
    if (reviewImageUrls.length === 0) {
      setReviewPreviewIndex(0);
      return;
    }
    setReviewPreviewIndex((prev) => Math.min(prev, reviewImageUrls.length - 1));
  }, [reviewImageUrls.length]);


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'primary.main' }}>
      {/* Header */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('admin.home.title')}
        </Typography>
      </Box>


      {/* Site Status Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 3, md: 4 },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {t('admin.home.maintenanceMode', 'Maintenance Mode')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(
                  'admin.home.maintenanceModeSubtitle',
                  'Turn off to show the maintenance page to visitors.'
                )}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ minWidth: 150, textAlign: 'right' }}
              >
                {isSiteActive
                  ? t('admin.home.siteActive', 'Site Active')
                  : t('admin.home.siteMaintenance', 'Maintenance Mode')}
              </Typography>
              <Switch
                checked={isSiteActive}
                onChange={(event) => setIsSiteActive(event.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase': {
                    color: '#111111',
                    '& + .MuiSwitch-track': {
                      backgroundColor: '#fbc02d',
                      opacity: 1,
                    },
                  },
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#2e7d32',
                    '& + .MuiSwitch-track': {
                      backgroundColor: '#2e7d32',
                      opacity: 1,
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        </Container>
      </Box>


      {/* Hero Photos Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 6 },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" component="h2" fontWeight={600} gutterBottom>
              {t('admin.home.heroPhotos', 'Hero Photos')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('admin.home.heroPhotosSubtitle')}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {[
              {
                id: 'welcome-left',
                inputId: 'upload-welcome-left',
                title: t('admin.home.leftFrameTitle', 'Left Frame — Custom Photo'),
                imageUrl: welcomeLeftImageUrl,
                uploading: uploadingWelcomeLeftImage,
              },
              {
                id: 'welcome-right',
                inputId: 'upload-welcome-right',
                title: t('admin.home.rightFrameTitle', 'Right Frame — Personal Photo'),
                imageUrl: welcomeRightImageUrl,
                uploading: uploadingWelcomeRightImage,
              },
              {
                id: 'welcome-mobile',
                inputId: 'upload-welcome-mobile',
                title: t('admin.home.mobilePhotoTitle', 'Mobile Photo'),
                imageUrl: welcomeMobileImageUrl,
                uploading: uploadingWelcomeMobileImage,
              },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={4} key={card.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    height: '100%',
                  }}
                >
                  {/* Card header */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {card.title}
                    </Typography>
                  </Box>

                  {/* Thumbnail */}
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '4 / 3',
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      border: '2px dashed',
                      borderColor: card.imageUrl ? 'transparent' : 'grey.300',
                      bgcolor: card.imageUrl ? 'transparent' : 'grey.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {card.imageUrl ? (
                      <Box
                        component="img"
                        src={card.imageUrl}
                        alt={card.title}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center top',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.disabled', p: 2 }}>
                        <CloudUploadIcon sx={{ fontSize: 40, mb: 0.5, opacity: 0.4 }} />
                        <Typography variant="caption" display="block">
                          {t('admin.home.noPhotoUploaded', 'No photo uploaded')}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Upload and gallery buttons */}
                  <Stack spacing={1}>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id={card.inputId}
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, card.id);
                        e.target.value = '';
                      }}
                    />
                    <label htmlFor={card.inputId} style={{ display: 'block' }}>
                      <Button
                        variant="outlined"
                        component="span"
                        fullWidth
                        startIcon={card.uploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
                        disabled={card.uploading}
                        sx={{ textTransform: 'none' }}
                      >
                        {card.uploading
                          ? t('admin.home.uploading')
                          : card.imageUrl
                            ? t('admin.home.changeImage', 'Change Photo')
                            : t('admin.home.uploadImage', 'Upload Photo')}
                      </Button>
                    </label>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PhotoLibraryIcon />}
                      onClick={() => handleOpenGallery(card.id)}
                      disabled={card.uploading}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('admin.home.selectFromGallery')}
                    </Button>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* ── Hero Frame Background Colours ── */}
          <Box sx={{ mt: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {t('admin.home.frameBackgroundColours', 'Frame Background Colours')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                {t('admin.home.frameBackgroundColoursSubtitle', 'Shown when no photo is uploaded, and fills the sides beyond 1920 px on wide screens.')}
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {/* Left colour */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component="input"
                    type="color"
                    value={welcomeLeftColour}
                    onChange={(e) => setWelcomeLeftColour(e.target.value)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      p: 0.5,
                      bgcolor: 'transparent',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {t('admin.home.leftFrameColour', 'Left Frame')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {welcomeLeftColour.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
                {/* Right colour */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component="input"
                    type="color"
                    value={welcomeRightColour}
                    onChange={(e) => setWelcomeRightColour(e.target.value)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      p: 0.5,
                      bgcolor: 'transparent',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {t('admin.home.rightFrameColour', 'Right Frame')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {welcomeRightColour.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
                {/* Button colour */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component="input"
                    type="color"
                    value={welcomeButtonColour}
                    onChange={(e) => setWelcomeButtonColour(e.target.value)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      p: 0.5,
                      bgcolor: 'transparent',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {t('admin.home.bookSessionButtonColour', 'Book a Session Button')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {welcomeButtonColour.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
                {/* Button text colour */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component="input"
                    type="color"
                    value={welcomeButtonTextColour}
                    onChange={(e) => setWelcomeButtonTextColour(e.target.value)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      p: 0.5,
                      bgcolor: 'transparent',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {t('admin.home.bookSessionButtonTextColour', 'Button Text')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {welcomeButtonTextColour.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
                {/* Main Theme colour */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    component="input"
                    type="color"
                    value={mainThemeColourHex}
                    onChange={(e) => setMainThemeColourHex(e.target.value)}
                    sx={{
                      width: 48,
                      height: 48,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      p: 0.5,
                      bgcolor: 'transparent',
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {t('admin.home.mainThemeColour', 'Main Theme Colour (Portal)')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mainThemeColourHex.toUpperCase()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Container>
      </Box>


      {/* About Me Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Left Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
              <Box sx={{ maxWidth: '600px' }}>
                <Box sx={{ mb: 3 }}>
                  <Divider
                    sx={{
                      width: '60px',
                      height: '2px',
                      bgcolor: 'black',
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {t('landing.about.title')}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  value={aboutMeContent}
                  onChange={(e) => setAboutMeContent(e.target.value)}
                  placeholder={t('admin.home.aboutMeContent')}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.8,
                      fontFamily: 'sans-serif',
                    },
                  }}
                />
              </Box>
            </Grid>

            {/* Right Column - Image */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', height: { xs: '400px', md: '600px' } }}>
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: aboutImageUrl ? 'transparent' : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px dashed',
                  borderColor: aboutImageUrl ? 'transparent' : 'grey.300',
                }}
              >
                {aboutImageUrl ? (
                  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={aboutImageUrl}
                      alt={t('landing.about.alt')}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Box>
                ) : (
                  <Avatar
                    sx={{
                      width: { xs: 200, sm: 300, md: 400 },
                      height: { xs: 200, sm: 300, md: 400 },
                      bgcolor: 'primary.main',
                      fontSize: { xs: '4rem', md: '6rem' },
                      fontWeight: 600,
                    }}
                  >
                    A
                  </Avatar>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="about-image-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'about');
                      }
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="about-image-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={uploadingAboutImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploadingAboutImage}
                      sx={{ textTransform: 'none' }}
                    >
                      {uploadingAboutImage ? t('admin.home.uploading') : aboutImageUrl ? t('admin.home.change') : t('admin.home.uploadImage')}
                    </Button>
                  </label>
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<PhotoLibraryIcon />}
                    onClick={() => handleOpenGallery('about')}
                    disabled={uploadingAboutImage}
                    sx={{ textTransform: 'none', bgcolor: 'rgba(255,255,255,0.86)' }}
                  >
                    {t('admin.home.selectFromGallery')}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Education Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: '#F0F7F7',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
            {/* Left Column - Images */}
            <Grid item xs={12} md={6} sx={{ position: 'relative', order: { xs: 2, md: 1 } }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: '100%',
                    height: { xs: '300px', md: '400px' },
                    background: educationImageUrls.length > 0 ? '#F0F7F7' : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '2px dashed',
                    borderColor: educationImageUrls.length > 0 ? 'transparent' : 'grey.300',
                  }}
                >
                  {educationImageUrls[educationPreviewIndex] ? (
                    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                      <Box
                        component="img"
                        src={educationImageUrls[educationPreviewIndex]}
                        alt="Education"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </Box>
                  ) : (
                    <Avatar
                      sx={{
                        width: { xs: 150, sm: 200, md: 250 },
                        height: { xs: 150, sm: 200, md: 250 },
                        bgcolor: 'primary.main',
                        fontSize: { xs: '3rem', md: '4rem' },
                        fontWeight: 600,
                      }}
                    >
                      E
                    </Avatar>
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                    }}
                  >
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="education-image-upload"
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          handleEducationImagesUpload(files);
                        }
                        e.target.value = '';
                      }}
                    />
                    <label htmlFor="education-image-upload">
                      <Button
                        variant="contained"
                        component="span"
                        startIcon={uploadingEducationImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                        disabled={uploadingEducationImage}
                        sx={{ textTransform: 'none' }}
                      >
                        {uploadingEducationImage ? t('admin.home.uploading') : t('admin.home.uploadEducationImages')}
                      </Button>
                    </label>
                  </Box>
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                    }}
                  >
                    <Button
                      variant="outlined"
                      startIcon={<PhotoLibraryIcon />}
                      onClick={() => handleOpenGallery('education')}
                      disabled={uploadingEducationImage}
                      sx={{ textTransform: 'none', bgcolor: 'rgba(255,255,255,0.86)' }}
                    >
                      {t('admin.home.selectFromGallery')}
                    </Button>
                  </Box>
                  {educationImageUrls.length > 1 && (
                    <>
                      <IconButton
                        aria-label="Previous education photo"
                        onClick={() => setEducationPreviewIndex((prev) => Math.max(0, prev - 1))}
                        disabled={educationPreviewIndex === 0}
                        sx={{
                          position: 'absolute',
                          left: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(44,95,95,0.68)',
                          color: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(44,95,95,0.85)',
                          },
                          '&.Mui-disabled': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.5)',
                          },
                        }}
                      >
                        <KeyboardArrowLeftRoundedIcon />
                      </IconButton>
                      <IconButton
                        aria-label="Next education photo"
                        onClick={() => setEducationPreviewIndex((prev) => Math.min(educationImageUrls.length - 1, prev + 1))}
                        disabled={educationPreviewIndex >= educationImageUrls.length - 1}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(44,95,95,0.68)',
                          color: 'rgba(255,255,255,0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(44,95,95,0.85)',
                          },
                          '&.Mui-disabled': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'rgba(255,255,255,0.5)',
                          },
                        }}
                      >
                        <KeyboardArrowRightRoundedIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
                <Alert severity="info">{t('admin.home.educationImagesHint')}</Alert>
                {educationImageUrls.length > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('admin.home.educationCarouselPosition', 'Photo {{current}} of {{total}}', {
                      current: educationPreviewIndex + 1,
                      total: educationImageUrls.length,
                    })}
                  </Typography>
                )}
                {educationImageUrls.length > 0 && (
                  <Grid container spacing={2}>
                    {educationImageUrls.map((imageUrl, index) => (
                      <Grid item xs={6} sm={4} key={educationMediaIds[index] || index}>
                        <Card
                          draggable
                          onDragStart={(event) => {
                            setDraggedEducationIndex(index);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (draggedEducationIndex === null) return;
                            handleReorderEducationImage(draggedEducationIndex, index);
                            setDraggedEducationIndex(null);
                          }}
                          onDragEnd={() => setDraggedEducationIndex(null)}
                          sx={{
                            position: 'relative',
                            cursor: 'grab',
                            border: draggedEducationIndex === index ? '2px dashed' : '1px solid',
                            borderColor: draggedEducationIndex === index ? 'primary.main' : 'divider',
                          }}
                        >
                          {imageUrl ? (
                            <CardMedia
                              component="img"
                              image={imageUrl}
                              alt={`${t('admin.home.educationImages')} ${index + 1}`}
                              sx={{ height: 120, objectFit: 'cover' }}
                            />
                          ) : (
                            <Box
                              sx={{
                                height: 120,
                                bgcolor: '#E3F2FD',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CircularProgress size={28} />
                            </Box>
                          )}
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 8,
                              top: 8,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'rgba(0,0,0,0.58)',
                              color: '#fff',
                              fontSize: '0.75rem',
                            }}
                          >
                            <DragIndicatorIcon sx={{ fontSize: 14 }} />
                            {index + 1}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteEducationImage(index)}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 1)',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Stack>
            </Grid>

            {/* Right Column - Text Content */}
            <Grid item xs={12} md={6} sx={{ px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 }, order: { xs: 1, md: 2 } }}>
              <Box sx={{ maxWidth: '600px', mx: { xs: 'auto', md: 0 } }}>
                <Box sx={{ mb: 3 }}>
                  <Divider
                    sx={{
                      width: '60px',
                      height: '2px',
                      bgcolor: 'black',
                      mb: 2,
                    }}
                  />
                  <Typography
                    variant="h2"
                    component="h2"
                    sx={{
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                      fontWeight: 700,
                      color: 'black',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    {t('admin.home.myEducation')}
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={educationContent}
                  onChange={(e) => setEducationContent(e.target.value)}
                  placeholder={t('admin.home.educationContent')}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: { xs: '0.95rem', md: '1rem' },
                      lineHeight: 1.8,
                      fontFamily: 'sans-serif',
                    },
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Reviews/Testimonials Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Divider
              sx={{
                width: '60px',
                height: '2px',
                bgcolor: 'black',
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: 'black',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 3,
              }}
            >
              {t('admin.home.testimonials')}
            </Typography>
          </Box>

          {/* Review Message Text Field */}
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={reviewMessage}
              onChange={(e) => setReviewMessage(e.target.value)}
              placeholder={t('admin.home.reviewMessagePlaceholder')}
              label={t('admin.home.reviewMessage')}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.95rem', md: '1rem' },
                  lineHeight: 1.8,
                  fontFamily: 'sans-serif',
                },
              }}
            />
          </Box>

          {/* Review Images Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
              {t('admin.home.reviewImages')}
            </Typography>

            <Stack
              spacing={2}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%', md: '50%' },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  background: reviewImageUrls.length > 0 ? '#F0F7F7' : 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 50%, #90CAF9 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '2px dashed',
                  borderColor: reviewImageUrls.length > 0 ? 'transparent' : 'grey.300',
                }}
              >
                {reviewImageUrls[reviewPreviewIndex] ? (
                  <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                    <Box
                      component="img"
                      src={reviewImageUrls[reviewPreviewIndex]}
                      alt={`${t('admin.home.reviewImages')} ${reviewPreviewIndex + 1}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: { xs: 150, sm: 200, md: 250 },
                        height: { xs: 150, sm: 200, md: 250 },
                        bgcolor: 'primary.main',
                        fontSize: { xs: '3rem', md: '4rem' },
                        fontWeight: 600,
                        mx: 'auto',
                        mb: 2,
                      }}
                    >
                      R
                    </Avatar>
                    <Typography variant="body2" color="text.secondary">
                      {t('admin.home.noReviewImages')}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: 16,
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="review-image-upload"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file, 'review');
                      }
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="review-image-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={uploadingReviewImage ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                      disabled={uploadingReviewImage}
                      sx={{ textTransform: 'none' }}
                    >
                      {uploadingReviewImage ? t('admin.home.uploading') : t('admin.home.uploadReviewImage')}
                    </Button>
                  </label>
                </Box>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    left: 16,
                  }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<PhotoLibraryIcon />}
                    onClick={() => handleOpenGallery('review')}
                    disabled={uploadingReviewImage}
                    sx={{ textTransform: 'none', bgcolor: 'rgba(255,255,255,0.86)' }}
                  >
                    {t('admin.home.selectFromGallery')}
                  </Button>
                </Box>
                {reviewImageUrls.length > 1 && (
                  <>
                    <IconButton
                      aria-label="Previous review photo"
                      onClick={() => setReviewPreviewIndex((prev) => Math.max(0, prev - 1))}
                      disabled={reviewPreviewIndex === 0}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(44,95,95,0.68)',
                        color: 'rgba(255,255,255,0.9)',
                        '&:hover': {
                          bgcolor: 'rgba(44,95,95,0.85)',
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'rgba(255,255,255,0.5)',
                        },
                      }}
                    >
                      <KeyboardArrowLeftRoundedIcon />
                    </IconButton>
                    <IconButton
                      aria-label="Next review photo"
                      onClick={() => setReviewPreviewIndex((prev) => Math.min(reviewImageUrls.length - 1, prev + 1))}
                      disabled={reviewPreviewIndex >= reviewImageUrls.length - 1}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: 'rgba(44,95,95,0.68)',
                        color: 'rgba(255,255,255,0.9)',
                        '&:hover': {
                          bgcolor: 'rgba(44,95,95,0.85)',
                        },
                        '&.Mui-disabled': {
                          bgcolor: 'rgba(255,255,255,0.2)',
                          color: 'rgba(255,255,255,0.5)',
                        },
                      }}
                    >
                      <KeyboardArrowRightRoundedIcon />
                    </IconButton>
                  </>
                )}
              </Box>
              {reviewImageUrls.length > 1 && (
                <Typography variant="body2" color="text.secondary">
                  {t('admin.home.reviewCarouselPosition', 'Photo {{current}} of {{total}}', {
                    current: reviewPreviewIndex + 1,
                    total: reviewImageUrls.length,
                  })}
                </Typography>
              )}
              {reviewImageUrls.length > 0 && (
                <Grid container spacing={2}>
                  {reviewImageUrls.map((imageUrl, index) => (
                    <Grid item xs={6} sm={4} key={reviewMediaIds[index] || index}>
                      <Card
                        draggable
                        onDragStart={(event) => {
                          setDraggedReviewIndex(index);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (draggedReviewIndex === null) return;
                          handleReorderReviewImage(draggedReviewIndex, index);
                          setDraggedReviewIndex(null);
                        }}
                        onDragEnd={() => setDraggedReviewIndex(null)}
                        sx={{
                          position: 'relative',
                          cursor: 'grab',
                          border: draggedReviewIndex === index ? '2px dashed' : '1px solid',
                          borderColor: draggedReviewIndex === index ? 'primary.main' : 'divider',
                        }}
                      >
                        {imageUrl ? (
                          <CardMedia
                            component="img"
                            image={imageUrl}
                            alt={`${t('admin.home.reviewImages')} ${index + 1}`}
                            sx={{ height: 120, objectFit: 'cover' }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 120,
                              bgcolor: '#E3F2FD',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <CircularProgress size={28} />
                          </Box>
                        )}
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 8,
                            top: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: 'rgba(0,0,0,0.58)',
                            color: '#fff',
                            fontSize: '0.75rem',
                          }}
                        >
                          <DragIndicatorIcon sx={{ fontSize: 14 }} />
                          {index + 1}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteReviewImage(index)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 1)',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" color="error" />
                        </IconButton>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Blog Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Divider
              sx={{
                width: '60px',
                height: '2px',
                bgcolor: 'black',
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: 'black',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 3,
              }}
            >
              {t('admin.home.blog')}
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 4, opacity: 0.8 }}
            >
              {t('admin.home.blogDescription')}
            </Typography>
          </Box>

          {/* Invalid Article IDs Error */}
          {invalidArticleIdsError && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              onClose={() => setInvalidArticleIdsError(null)}
            >
              {invalidArticleIdsError}
            </Alert>
          )}
          {invalidMoreAboutMeArticleIdError && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              onClose={() => setInvalidMoreAboutMeArticleIdError(null)}
            >
              {invalidMoreAboutMeArticleIdError}
            </Alert>
          )}

          {loadingArticles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : articlesError ? (
            <Alert severity="error" sx={{ mb: 3 }}>
              {articlesError}
            </Alert>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={3}>
                  {[0, 1, 2].map((index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Card sx={{ height: '100%' }}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {t('admin.home.article')} {index + 1}
                          </Typography>
                          <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>{t('admin.home.selectArticle')}</InputLabel>
                            <Select
                              value={welcomeArticleIds[index] || ''}
                              label={t('admin.home.selectArticle')}
                              onChange={(e) => {
                                const newArticleIds = [...welcomeArticleIds];
                                if (e.target.value) {
                                  newArticleIds[index] = e.target.value;
                                } else {
                                  newArticleIds.splice(index, 1);
                                }
                                // Keep only first 3 items
                                setWelcomeArticleIds(newArticleIds.slice(0, 3));
                              }}
                            >
                              <MenuItem value="">
                                <em>{t('admin.home.none')}</em>
                              </MenuItem>
                              {availableArticles.map((article) => {
                                // Don't show articles that are already selected in other slots
                                const isSelected = welcomeArticleIds.includes(article.articleId) && welcomeArticleIds[index] !== article.articleId;
                                return (
                                  <MenuItem
                                    key={article.articleId}
                                    value={article.articleId}
                                    disabled={isSelected}
                                  >
                                    {article.title || t('pages.article.untitled')}
                                    {isSelected && ` (${t('admin.home.alreadySelected')})`}
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>
                          {welcomeArticleIds[index] && (
                            <Box sx={{ mt: 2 }}>
                              {(() => {
                                const selectedArticle = availableArticles.find(
                                  (a) => a.articleId === welcomeArticleIds[index]
                                );
                                if (selectedArticle) {
                                  const stripHtml = (html) => {
                                    if (!html) return '';
                                    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                                  };
                                  const preview = stripHtml(selectedArticle.content || '').substring(0, 150);
                                  return (
                                    <>
                                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        {t('admin.home.preview')}
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                        {preview}...
                                      </Typography>
                                    </>
                                  );
                                }
                                return null;
                              })()}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {t('admin.home.moreAboutMeTitle')}
                    </Typography>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel>{t('admin.home.selectArticle')}</InputLabel>
                      <Select
                        value={moreAboutMeArticleId || ''}
                        label={t('admin.home.selectArticle')}
                        onChange={(e) => {
                          const v = e.target.value || '';
                          setMoreAboutMeArticleId(v);
                          if (!v) {
                            setInvalidMoreAboutMeArticleIdError(null);
                          }
                        }}
                      >
                        <MenuItem value="">
                          <em>{t('admin.home.none')}</em>
                        </MenuItem>
                        {availableArticles.map((article) => (
                          <MenuItem key={article.articleId} value={article.articleId}>
                            {article.title || t('pages.article.untitled')}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {moreAboutMeArticleId && (
                      <Box sx={{ mt: 2 }}>
                        {(() => {
                          const selectedArticle = availableArticles.find(
                            (a) => a.articleId === moreAboutMeArticleId
                          );
                          if (selectedArticle) {
                            const stripHtml = (html) => {
                              if (!html) return '';
                              return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                            };
                            const preview = stripHtml(selectedArticle.content || '').substring(0, 150);
                            return (
                              <>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                  {t('admin.home.preview')}
                                </Typography>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                  {preview}...
                                </Typography>
                              </>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>

      {/* Contact Links Section */}
      <Box
        component="section"
        sx={{
          py: { xs: 6, md: 10 },
          bgcolor: 'primary.dark',
          color: 'white',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Divider
              sx={{
                width: '60px',
                height: '2px',
                bgcolor: 'white',
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 3,
              }}
            >
              {t('admin.home.contactLinks')}
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 4, opacity: 0.9 }}
            >
              {t('admin.home.contactLinksDescription')}
            </Typography>
          </Box>

          {/* Add/Edit Contact Link Form */}
          <Card sx={{ mb: 4, bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', mb: 3 }}>
                {editingContactIndex !== null ? t('admin.home.editContactLink') : t('admin.home.addNewContactLink')}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>{t('admin.home.platform')}</InputLabel>
                    <Select
                      value={newContactLink.platform}
                      label={t('admin.home.platform')}
                      onChange={(e) =>
                        setNewContactLink({ ...newContactLink, platform: e.target.value })
                      }
                      renderValue={(value) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ContactPlatformIcon platform={value} fontSize={20} />
                          {value}
                        </Box>
                      )}
                      sx={{
                        color: 'white',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'white',
                        },
                        '& .MuiSvgIcon-root': {
                          color: 'white',
                        },
                      }}
                    >
                      {supportedPlatforms.map((platform) => (
                        <MenuItem key={platform} value={platform}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ContactPlatformIcon platform={platform} fontSize={20} />
                            {platform}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label={
                      newContactLink.platform === 'Email'
                        ? t('admin.home.emailAddress')
                        : newContactLink.platform === 'Phone'
                          ? t('admin.home.phoneNumber')
                          : newContactLink.platform === 'WhatsApp'
                            ? t('admin.home.whatsappNumberOrUrl')
                            : t('admin.home.urlOrValue')
                    }
                    value={newContactLink.value}
                    onChange={(e) =>
                      setNewContactLink({ ...newContactLink, value: e.target.value })
                    }
                    placeholder={
                      newContactLink.platform === 'Email'
                        ? t('admin.home.emailPlaceholder')
                        : newContactLink.platform === 'Phone'
                          ? t('admin.home.phonePlaceholder')
                          : newContactLink.platform === 'WhatsApp'
                            ? t('admin.home.whatsappPlaceholder')
                            : t('admin.home.urlPlaceholder')
                    }
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label={t('admin.home.descriptionOptional')}
                    value={newContactLink.description}
                    onChange={(e) =>
                      setNewContactLink({ ...newContactLink, description: e.target.value })
                    }
                    placeholder={t('admin.home.descriptionPlaceholder')}
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: 'white',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Stack direction="row" spacing={1} sx={{ height: '100%' }}>
                    {editingContactIndex !== null ? (
                      <>
                        <Button
                          variant="contained"
                          onClick={handleUpdateContactLink}
                          sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            flex: 1,
                            bgcolor: 'white',
                            color: 'primary.dark',
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.9)',
                            },
                          }}
                        >
                          {t('admin.home.save')}
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleCancelEdit}
                          sx={{
                            textTransform: 'none',
                            minWidth: 'auto',
                            flex: 1,
                            borderColor: 'white',
                            color: 'white',
                            '&:hover': {
                              borderColor: 'white',
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                          }}
                        >
                          {t('admin.home.cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddContactLink}
                        sx={{
                          textTransform: 'none',
                          width: '100%',
                          minWidth: 160,
                          bgcolor: 'white',
                          color: 'primary.dark',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                        }}
                      >
                        {t('admin.home.add')}
                      </Button>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Contact Links Display - Matching Landing Page Style */}
          {contactLinks.length > 0 ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: { xs: 2, sm: 3, md: 4 },
              }}
            >
              {contactLinks.map((link, index) => {
                const getLabel = (link) => {
                  if (link.description) {
                    return link.description;
                  }
                  return link.platform || 'Link';
                };

                return (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      position: 'relative',
                      transition: 'all 0.3s ease-in-out',
                      width: { xs: 80, sm: 100, md: 120 },
                      minHeight: { xs: 140, md: 150 },
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        '& .edit-delete-buttons': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    {/* Icon Circle */}
                    <Box
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: { xs: 56, md: 72 },
                        height: { xs: 56, md: 72 },
                        borderRadius: '50%',
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        mb: 1.5,
                        flexShrink: 0,
                        transition: 'all 0.3s ease-in-out',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      <ContactPlatformIcon platform={link.platform} fontSize={{ xs: 32, md: 40 }} />

                      {/* Edit/Delete Buttons Overlay */}
                      <Box
                        className="edit-delete-buttons"
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          display: 'flex',
                          gap: 0.5,
                          opacity: 0,
                          transition: 'opacity 0.3s ease-in-out',
                          zIndex: 10,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditContactLink(index);
                          }}
                          sx={{
                            bgcolor: 'rgba(0, 0, 0, 0.8)',
                            color: 'white',
                            width: 28,
                            height: 28,
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 1)',
                            },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContactLink(index);
                          }}
                          sx={{
                            bgcolor: 'rgba(211, 47, 47, 0.9)',
                            color: 'white',
                            width: 28,
                            height: 28,
                            '&:hover': {
                              bgcolor: 'rgba(211, 47, 47, 1)',
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Label */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        textAlign: 'center',
                        opacity: 0.9,
                        width: '100%',
                        minHeight: { xs: '2.5em', md: '2.5em' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        hyphens: 'auto',
                        color: 'white',
                        mb: 0.5,
                      }}
                    >
                      {getLabel(link)}
                    </Typography>

                    {/* URL Preview (small text below) */}
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.65rem',
                        textAlign: 'center',
                        opacity: 0.6,
                        width: '100%',
                        color: 'white',
                        wordBreak: 'break-all',
                        lineHeight: 1.2,
                      }}
                    >
                      {link.value.length > 30 ? `${link.value.substring(0, 30)}...` : link.value}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                border: '2px dashed',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
              }}
            >
              <Typography variant="body2">
                {t('admin.home.noContactLinks')}
              </Typography>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Legal / public info footer (landing page) */}
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 6 },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Divider
              sx={{
                width: '60px',
                height: '2px',
                bgcolor: 'black',
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                fontWeight: 700,
                color: 'black',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 1,
              }}
            >
              {t('admin.home.footerLegalTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('admin.home.footerLegalDescription')}
            </Typography>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={4}
            label={t('admin.home.footerLegalLabel')}
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            placeholder={t('admin.home.footerLegalPlaceholder')}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: { xs: '0.95rem', md: '1rem' },
                lineHeight: 1.8,
                fontFamily: 'sans-serif',
              },
            }}
          />
        </Container>
      </Box>

      {/* Footer agreement / policy links (landing page) */}
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 6 },
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 3 }}>
            <Divider
              sx={{
                width: '60px',
                height: '2px',
                bgcolor: 'black',
                mb: 2,
              }}
            />
            <Typography
              variant="h2"
              component="h2"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
                fontWeight: 700,
                color: 'black',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                fontFamily: 'sans-serif',
                mb: 1,
              }}
            >
              {t('admin.home.footerLinksTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('admin.home.footerLinksDescription')}
            </Typography>
          </Box>

          <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                {t('admin.home.addFooterLink')}
              </Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="medium"
                    label={t('admin.home.footerLinkDisplayName')}
                    value={newFooterLink.linkDisplayName}
                    onChange={(e) =>
                      setNewFooterLink({ ...newFooterLink, linkDisplayName: e.target.value })
                    }
                    placeholder={t('admin.home.footerLinkDisplayNamePlaceholder')}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="medium"
                    label={t('admin.home.footerLinkUrl')}
                    value={newFooterLink.linkUrl}
                    onChange={(e) =>
                      setNewFooterLink({ ...newFooterLink, linkUrl: e.target.value })
                    }
                    placeholder={t('admin.home.footerLinkUrlPlaceholder')}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddFooterLink}
                    fullWidth
                    sx={{
                      textTransform: 'none',
                      height: 56,
                      minHeight: 56,
                      boxSizing: 'border-box',
                    }}
                  >
                    {t('admin.home.add')}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {footerLinks.length > 0 ? (
            <Stack spacing={1}>
              {footerLinks.map((link, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} noWrap title={link.linkDisplayName}>
                      {link.linkDisplayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {link.linkUrl}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteFooterLink(index)}
                    aria-label={t('admin.home.deleteFooterLink')}
                  >
                    <DeleteIcon fontSize="small" color="error" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('admin.home.noFooterLinks')}
              </Typography>
            </Paper>
          )}
        </Container>
      </Box>

      {/* Save Changes Section */}
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('admin.home.changesSavedSuccess')}
          </Alert>
        )}
        <Button
          variant="contained"
          onClick={handleSaveWelcome}
          disabled={saving}
          sx={{ textTransform: 'none' }}
        >
          {saving ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              {t('admin.home.saving')}
            </>
          ) : (
            t('admin.home.saveChanges')
          )}
        </Button>
      </Box>

      {/* Gallery Selector Dialog */}
      <Dialog open={galleryDialogOpen} onClose={handleCloseGallery} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('admin.home.selectImageFromGallery')}</Typography>
            <IconButton onClick={handleCloseGallery} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {galleryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {galleryError}
            </Alert>
          )}
          {loadingGallery ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <CircularProgress />
            </Box>
          ) : galleryImages.length === 0 ? (
            <Alert severity="info">
              {t('admin.home.noImagesFound')}
            </Alert>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {galleryImages.map((item) => (
                  <Grid item xs={6} sm={4} md={3} key={item.mediaId}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                        },
                      }}
                      onClick={() => handleSelectGalleryImage(item.mediaId)}
                    >
                      {galleryThumbnailUrls[item.mediaId] ? (
                        <CardMedia
                          component="img"
                          image={galleryThumbnailUrls[item.mediaId]}
                          alt={item.altText || item.fileUrl || 'Gallery image'}
                          sx={{
                            height: 150,
                            objectFit: 'cover',
                          }}
                          onError={(e) => {
                            console.error(`Error displaying thumbnail for mediaId ${item.mediaId}`);
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 150,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'grey.200',
                          }}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ fontSize: '0.7rem' }}
                        >
                          {item.fileUrl || t('admin.home.untitled')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {galleryTotalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={galleryTotalPages}
                    page={galleryPage + 1}
                    onChange={handleGalleryPageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGallery} sx={{ textTransform: 'none' }}>
            {t('admin.home.close')}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdminHomePage;
