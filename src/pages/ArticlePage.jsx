import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient, { getToken } from '../utils/api';
import ArticleDetailView from '../components/ArticleDetailView';
import { Box } from '@mui/material';
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

  return (
    <Box>
      <ArticleDetailView
        loading={loading}
        error={error}
        article={article}
        onBack={() => navigate('/blog')}
        backLabel={t('pages.article.backToBlog')}
      />
    </Box>
  );
};

export default ArticlePage;
