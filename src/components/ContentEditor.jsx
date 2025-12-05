import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Typography,
  CircularProgress,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { loadImageWithCache } from '../utils/imageCache';

// Component to render an editable image in the content editor
const EditableImage = ({ mediaId, width, height, alignment, onEdit, imageUrls, loadImageUrls }) => {
  const [imageUrl, setImageUrl] = useState(imageUrls[mediaId] || null);
  const [loading, setLoading] = useState(!imageUrl);

  useEffect(() => {
    if (imageUrl || imageUrls[mediaId]) {
      if (imageUrls[mediaId] && !imageUrl) {
        setImageUrl(imageUrls[mediaId]);
        setLoading(false);
        setHasError(false);
      }
      return;
    }

    if (hasError) {
      // Don't retry if we've already had an error (prevents infinite loops)
      setLoading(false);
      return;
    }

    let isMounted = true;
    const loadImage = async () => {
      try {
        setLoading(true);
        setHasError(false);
        const url = await loadImageWithCache(mediaId);
        if (isMounted) {
          setImageUrl(url);
          if (loadImageUrls) {
            loadImageUrls({ [mediaId]: url });
          }
        }
      } catch (err) {
        // Check if it's a resource error
        const isResourceError = err.message?.includes('ERR_INSUFFICIENT_RESOURCES') || 
                               err.message?.includes('Failed to fetch');
        if (isResourceError) {
          console.warn(`Resource error loading image ${mediaId}, will not retry:`, err.message);
        } else {
          console.error(`Error loading image ${mediaId}:`, err);
        }
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [mediaId, imageUrl, imageUrls, loadImageUrls, hasError]);

  if (loading && !hasError) {
    return (
      <Box
        sx={{
          my: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 100,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!imageUrl || hasError) {
    return (
      <Box
        sx={{
          my: 2,
          p: 2,
          border: '1px dashed',
          borderColor: hasError ? 'warning.main' : 'error.main',
          borderRadius: 1,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color={hasError ? 'warning.main' : 'error'}>
          {hasError ? 'Image temporarily unavailable (resource limit)' : 'Failed to load image'}
        </Typography>
      </Box>
    );
  }

  const imageStyle = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    display: 'block',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.2s',
  };

  if (width) {
    imageStyle.width = `${width}px`;
  }
  if (height) {
    imageStyle.height = `${height}px`;
  }

  const containerStyle = {
    my: 2,
    position: 'relative',
    display: 'inline-block',
    width: '100%',
    textAlign: alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center',
  };

  return (
    <Box sx={containerStyle}>
      <Paper
        elevation={2}
        sx={{
          p: 1,
          display: 'inline-block',
          position: 'relative',
          '&:hover': {
            '& .edit-button': {
              opacity: 1,
            },
            '& img': {
              borderColor: 'primary.main',
            },
          },
        }}
      >
        <img
          src={imageUrl}
          alt="Article content"
          style={{
            ...imageStyle,
            float: alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'none',
            display: alignment === 'center' ? 'block' : 'inline-block',
            margin: alignment === 'center' ? '0 auto' : '0',
          }}
          onClick={() => onEdit && onEdit(mediaId)}
          onError={(e) => {
            // Don't retry on resource errors - these indicate browser resource exhaustion
            // The image will be loaded from cache on next page load
            console.warn(`Image failed to load for mediaId: ${mediaId}. This may be due to browser resource limits.`);
            e.target.style.border = '1px solid orange';
            e.target.alt = `Image temporarily unavailable: ${mediaId}`;
          }}
        />
        <IconButton
          className="edit-button"
          size="small"
          onClick={() => onEdit && onEdit(mediaId)}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: 'primary.main',
            color: 'white',
            opacity: 0,
            transition: 'opacity 0.2s',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
          aria-label="Edit image"
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Box>
  );
};

// Content Editor with Preview
const ContentEditor = ({ value, onChange, onImageEdit, imageUrls, loadImageUrls, disabled, placeholder }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [previewParts, setPreviewParts] = useState([]);

  // Parse content to extract images and text
  useEffect(() => {
    if (!value) {
      setPreviewParts([]);
      return;
    }

    const parts = [];
    let lastIndex = 0;
    const imgTagRegex = /<img[^>]*?mediaId\s*=\s*["']([^"']+)["'][^>]*?\/?>/gi;
    
    let match;
    imgTagRegex.lastIndex = 0;
    const matches = [];
    while ((match = imgTagRegex.exec(value)) !== null) {
      matches.push({ match, mediaId: match[1]?.trim() });
    }
    
    // Load images that aren't already loaded
    const mediaIdsToLoad = [];
    for (const { mediaId } of matches) {
      if (mediaId && !imageUrls[mediaId] && loadImageUrls) {
        mediaIdsToLoad.push(mediaId);
      }
    }
    
    // Load missing images
    if (mediaIdsToLoad.length > 0 && loadImageUrls) {
      mediaIdsToLoad.forEach(async (mediaId) => {
        try {
          const url = await loadImageWithCache(mediaId);
          loadImageUrls({ [mediaId]: url });
        } catch (err) {
          console.error(`Error loading image ${mediaId}:`, err);
        }
      });
    }
    
    for (const { match, mediaId } of matches) {
      if (match.index > lastIndex) {
        const textPart = value.substring(lastIndex, match.index);
        if (textPart.trim()) {
          parts.push({ type: 'text', content: textPart });
        }
      }
      
      if (mediaId) {
        const imgTag = match[0];
        const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
        const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
        const width = widthMatch ? parseInt(widthMatch[1], 10) : null;
        const height = heightMatch ? parseInt(heightMatch[1], 10) : null;
        
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
        
        parts.push({ type: 'image', mediaId, width, height, alignment });
      }
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
      const textPart = value.substring(lastIndex);
      if (textPart.trim()) {
        parts.push({ type: 'text', content: textPart });
      }
    }

    setPreviewParts(parts);
  }, [value, imageUrls, loadImageUrls]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Edit" />
        <Tab label="Preview" />
      </Tabs>
      <Divider />
      {activeTab === 0 ? (
        <TextField
          fullWidth
          multiline
          rows={12}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder || 'Enter content...'}
          sx={{ mt: 1 }}
        />
      ) : (
        <Box
          sx={{
            mt: 2,
            p: 2,
            minHeight: 300,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
          }}
        >
          {previewParts.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {value ? 'No content to preview' : 'Start typing to see preview...'}
            </Typography>
          ) : (
            <Box>
              {previewParts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <Typography
                      key={index}
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        mb: index < previewParts.length - 1 ? 2 : 0,
                      }}
                    >
                      {part.content}
                    </Typography>
                  );
                } else if (part.type === 'image') {
                  return (
                    <EditableImage
                      key={index}
                      mediaId={part.mediaId}
                      width={part.width}
                      height={part.height}
                      alignment={part.alignment}
                      onEdit={onImageEdit}
                      imageUrls={imageUrls}
                      loadImageUrls={loadImageUrls}
                    />
                  );
                }
                return null;
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ContentEditor;

