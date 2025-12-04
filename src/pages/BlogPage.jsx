import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { getToken } from '../utils/api';
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Alert,
  Box,
  Skeleton,
  Tabs,
  Tab,
  Chip,
  Stack,
  Grid,
} from '@mui/material';

const BlogPage = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [hasToken, setHasToken] = useState(!!getToken());

  // Keep track of auth state to show/hide Private tab
  useEffect(() => {
    const updateAuth = () => {
      const tokenExists = !!getToken();
      setHasToken(tokenExists);
      if (!tokenExists && activeTab === 1) {
        setActiveTab(0);
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'auth_token' || e.key === null) updateAuth();
    };
    const handleFocus = () => updateAuth();
    const handleAuthChanged = () => updateAuth();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('auth-changed', handleAuthChanged);
    // initial check
    updateAuth();
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use different endpoint based on active tab
        // Tab 0 = Public articles, Tab 1 = Private articles (only with auth)
        const endpoint =
          activeTab === 0 || !hasToken
            ? '/api/v1/public/articles'
            : '/api/v1/articles';
        
        // Add timeout and signal to cancel request if component unmounts
        const response = await apiClient.get(endpoint, {
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
  }, [activeTab, hasToken]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleArticleClick = (article, event) => {
    // Use slug if available, otherwise fall back to articleId
    const identifier = article.slug || article.articleId;
    navigate(`/blog/${identifier}`);
  };

  const truncatePreview = (text, maxLength = 150) => {
    if (!text) return '';
    // Remove HTML tags if present
    const plainText = text.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength).trim() + '...';
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Card sx={{ mb: 3, height: '100%' }}>
      <CardContent>
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="90%" height={20} />
        <Skeleton variant="text" width="80%" height={20} />
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Blog
        </Typography>
      </Box>
      
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Public Articles" />
        {hasToken && <Tab label="Private Articles" />}
      </Tabs>

      {loading ? (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <LoadingSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : articles.length > 0 ? (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {articles.map((article) => {
            const previewText = article.excerpt 
              ? truncatePreview(article.excerpt, 150)
              : article.content 
              ? truncatePreview(article.content, 150)
              : '';

            return (
              <Grid item xs={12} sm={6} md={4} key={article.articleId}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={(e) => handleArticleClick(article, e)}
                >
                  <CardActionArea sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <CardContent sx={{ flexGrow: 1, width: '100%', p: 3 }}>
                      <Typography 
                        variant="h5" 
                        component="h2" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 1.5,
                          lineHeight: 1.3,
                        }}
                      >
                        {article.title || 'Untitled'}
                      </Typography>

                      {article.publishedAt && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {formatDate(article.publishedAt)}
                        </Typography>
                      )}

                      {previewText && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ 
                            mb: 2,
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {previewText}
                        </Typography>
                      )}

                      {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
                        <Stack 
                          direction="row" 
                          spacing={1} 
                          sx={{ 
                            flexWrap: 'wrap', 
                            gap: 1,
                            mt: 'auto',
                            pt: 2,
                          }}
                        >
                          {article.tags.slice(0, 3).map((tag) => (
                            <Chip
                              key={tag.tagId}
                              label={tag.name}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                          {article.tags.length > 3 && (
                            <Chip
                              label={`+${article.tags.length - 3}`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          )}
                        </Stack>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No articles available at the moment.
        </Alert>
      )}
    </Box>
  );
};

export default BlogPage;

