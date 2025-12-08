import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient, { getToken } from '../utils/api';
import ArticleContent from '../components/ArticleContent';
import {
  Typography,
  Alert,
  Box,
  Skeleton,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';

const ArticlePage = () => {
  const { t } = useTranslation();
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasToken, setHasToken] = useState(!!getToken());

  // Keep track of auth state changes
  useEffect(() => {
    const updateAuth = () => {
      setHasToken(!!getToken());
    };
    const handleStorage = (e) => {
      if (e.key === 'auth_token' || e.key === null) updateAuth();
    };
    const handleFocus = () => updateAuth();
    const handleAuthChanged = () => updateAuth();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('auth-changed', handleAuthChanged);
    updateAuth();
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  // Helper function to check if a string is a UUID (articleId)
  const isUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if the identifier is a UUID (articleId) or a slug
        const isArticleId = isUUID(articleId);
        
        // Build the appropriate endpoint based on whether it's a slug or articleId
        let publicEndpoint, privateEndpoint;
        
        if (isArticleId) {
          // Use articleId endpoint
          publicEndpoint = `/api/v1/public/articles/${articleId}`;
          privateEndpoint = `/api/v1/articles/${articleId}`;
        } else {
          // Use slug endpoint
          publicEndpoint = `/api/v1/public/articles/slug/${articleId}`;
          privateEndpoint = `/api/v1/articles/slug/${articleId}`;
        }
        
        // If user is authenticated, try private endpoint first
        if (hasToken) {
          try {
            const response = await apiClient.get(privateEndpoint, {
              signal: controller.signal,
              timeout: 10000,
            });
            
            if (isMounted) {
              setArticle(response.data);
              setLoading(false);
            }
            return;
          } catch (privateErr) {
            // If private fails with 404, try public endpoint
            if (privateErr.response?.status === 404) {
              // Continue to try public endpoint
            } else {
              // For other errors, throw to be handled below
              throw privateErr;
            }
          }
        }
        
        // Try public endpoint
        const response = await apiClient.get(publicEndpoint, {
          signal: controller.signal,
          timeout: 10000,
        });
        
        if (isMounted) {
          setArticle(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        
        console.error('Error fetching article:', err);
        if (isMounted) {
          let errorMessage = 'Failed to load article. Please try again later.';
          
          if (err.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (err.response?.status === 404) {
            errorMessage = 'Article not found.';
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
      }
    };

    fetchArticle();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [articleId, hasToken]);

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

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/blog')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Skeleton variant="text" width="60%" height={40} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" height={24} />
        <Skeleton variant="text" width="80%" height={24} />
        <Skeleton variant="text" width="90%" height={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/blog')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{t('pages.article.backToBlog')}</Typography>
        </Box>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!article) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/blog')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{t('pages.article.backToBlog')}</Typography>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          Article not found.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/blog')} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" color="text.secondary">
          {t('pages.article.backToBlog')}
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
          {article.title || t('pages.blog.untitled')}
        </Typography>

        {(article.publishedAt || (article.tags && article.tags.length > 0)) && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {article.publishedAt && (
              <Typography variant="body2" color="text.secondary">
                {formatDate(article.publishedAt)}
              </Typography>
            )}
            {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {article.tags.map((tag) => (
                  <Chip
                    key={tag.tagId}
                    label={tag.name}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                ))}
              </Stack>
            )}
          </Box>
        )}

        <Divider sx={{ mb: 3 }} />

        {article.excerpt && (
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ mb: 4, fontStyle: 'italic', lineHeight: 1.6 }}
          >
            {article.excerpt}
          </Typography>
        )}

        {article.content ? (
          <ArticleContent content={article.content} />
        ) : (
          <Typography variant="body2" color="text.secondary">
            No content available.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ArticlePage;

