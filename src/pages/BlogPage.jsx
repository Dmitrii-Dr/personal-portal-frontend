import React, { useState, useEffect } from 'react';
import apiClient, { getToken } from '../utils/api';
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
  Tabs,
  Tab,
  Chip,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const BlogPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedArticle, setExpandedArticle] = useState(null);
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

  const handleAccordionChange = (articleId) => (event, isExpanded) => {
    setExpandedArticle(isExpanded ? articleId : null);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setExpandedArticle(null); // Reset expanded article when switching tabs
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
                  {article.tags && Array.isArray(article.tags) && article.tags.length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
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
    </Box>
  );
};

export default BlogPage;

