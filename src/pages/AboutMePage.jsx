import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/api';
import ArticleDetailView from '../components/ArticleDetailView';
import { Box, Typography, Alert, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AboutMePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [article, setArticle] = useState(null);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const mapError = (err) => {
      let errorMessage = t('pages.aboutMe.loadError');
      if (err.code === 'ECONNABORTED') {
        errorMessage = t('pages.blog.errorTimeout', 'Request timed out. Please try again.');
      } else if (err.response?.status === 404) {
        errorMessage = t('pages.article.notFound', 'Article not found.');
      } else if (err.response) {
        errorMessage = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = t('pages.blog.errorServer', 'Unable to reach the server. The API endpoint may not be available.');
      } else if (err.message) {
        errorMessage = err.message;
      }
      return errorMessage;
    };

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotConfigured(false);
        setArticle(null);

        const welcomeRes = await apiClient.get('/api/v1/public/welcome', {
          signal: controller.signal,
          timeout: 10000,
        });

        if (!isMounted) return;

        const ep = welcomeRes.data?.extendedParameters || {};
        const rawId = ep.moreAboutMeArticleId;
        const idStr =
          typeof rawId === 'string' ? rawId.trim() : rawId != null ? String(rawId).trim() : '';

        if (!idStr) {
          setNotConfigured(true);
          setLoading(false);
          return;
        }

        const artRes = await apiClient.get(`/api/v1/public/articles/${idStr}`, {
          signal: controller.signal,
          timeout: 10000,
        });

        if (!isMounted) return;
        setArticle(artRes.data);
        setLoading(false);
      } catch (err) {
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Error loading about-me article:', err);
        if (isMounted) {
          setError(mapError(err));
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const backLabel = t('pages.aboutMe.backToHome');
  const onBack = () => navigate('/');

  if (notConfigured && !loading && !error) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label={backLabel}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" color="text.secondary">
            {backLabel}
          </Typography>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('pages.aboutMe.notConfigured')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <ArticleDetailView
        loading={loading}
        error={error}
        article={article}
        onBack={onBack}
        backLabel={backLabel}
        hidePublishedDate
      />
    </Box>
  );
};

export default AboutMePage;
