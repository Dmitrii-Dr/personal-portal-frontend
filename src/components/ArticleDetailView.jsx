import React from 'react';
import { useTranslation } from 'react-i18next';
import ArticleContent from './ArticleContent';
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

/**
 * Shared article reading layout (blog article page and /about-me).
 * @param {boolean} loading
 * @param {string|null} error
 * @param {object|null} article
 * @param {() => void} onBack
 * @param {string} backLabel — e.g. t('pages.article.backToBlog')
 * @param {string} [notFoundMessage] — when !loading && !error && !article
 * @param {boolean} [hidePublishedDate] — omit published date line (e.g. /about-me)
 */
const ArticleDetailView = ({
  loading,
  error,
  article,
  onBack,
  backLabel,
  notFoundMessage,
  hidePublishedDate = false,
}) => {
  const { t } = useTranslation();

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

  const resolvedNotFound = notFoundMessage ?? t('pages.article.notFound');

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label={backLabel}>
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
          <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label={backLabel}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{backLabel}</Typography>
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
          <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label={backLabel}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{backLabel}</Typography>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          {resolvedNotFound}
        </Alert>
      </Box>
    );
  }

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

      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 2, lineHeight: 1.3 }}>
          {article.title || t('pages.blog.untitled')}
        </Typography>

        {((!hidePublishedDate && article.publishedAt) ||
          (article.tags && article.tags.length > 0)) && (
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            {!hidePublishedDate && article.publishedAt && (
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
            {t('pages.article.noContent')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ArticleDetailView;
