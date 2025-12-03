import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { loadImageWithCache, getCachedImage } from '../utils/imageCache';

// Component to fetch and display an authenticated image
const AuthenticatedImage = ({ mediaId, width, height, alignment = 'center' }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check cache first (now async)
        const cachedUrl = await getCachedImage(mediaId);
        if (cachedUrl && isMounted) {
          objectUrlRef.current = cachedUrl;
          setImageUrl(cachedUrl);
          setLoading(false);
          return;
        }
        
        // Load with cache (will fetch if not cached)
        const objectUrl = await loadImageWithCache(mediaId);
        
        if (isMounted) {
          objectUrlRef.current = objectUrl;
          setImageUrl(objectUrl);
          setLoading(false);
        }
      } catch (err) {
        console.error(`Error loading image with mediaId: ${mediaId}`, err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadImage();

    // Cleanup: don't revoke URLs as they're cached and might be used elsewhere
    return () => {
      isMounted = false;
      // Note: We don't revoke the object URL here because it's cached
      // and might be used by other components. The cache utility handles cleanup.
      objectUrlRef.current = null;
    };
  }, [mediaId]);

  if (loading) {
    return (
      <Box sx={{ my: 2, textAlign: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error || !imageUrl) {
    return (
      <Box sx={{ my: 2, textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="error">
          Failed to load image
        </Typography>
      </Box>
    );
  }

  const imageStyle = {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    display: 'block',
  };

  if (width) {
    imageStyle.width = `${width}px`;
  }
  if (height) {
    imageStyle.height = `${height}px`;
  }

  const containerStyle = {
    my: 2,
    textAlign: alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'center',
  };

  return (
    <Box sx={containerStyle}>
      <img
        src={imageUrl}
        alt="Article content"
        style={{
          ...imageStyle,
          float: alignment === 'left' ? 'left' : alignment === 'right' ? 'right' : 'none',
          display: alignment === 'center' ? 'block' : 'inline-block',
          margin: alignment === 'center' ? '0 auto' : '0',
        }}
        onError={(e) => {
          console.error(`Failed to display image with mediaId: ${mediaId}`);
          e.target.style.border = '1px solid red';
          e.target.alt = `Failed to load image: ${mediaId}`;
        }}
        loading="lazy"
      />
    </Box>
  );
};

// Component to render article content with images
const ArticleContent = ({ content }) => {
  if (!content) return null;

  // Parse content to find <img> tags and replace them with actual image elements
  const parts = [];
  let lastIndex = 0;
  
  // Robust regex to match <img> tags with mediaId attribute
  // Handles: <img mediaId="value" />, <img mediaId='value' />, <img ... mediaId="value" ... />
  const imgTagRegex = /<img[^>]*?mediaId\s*=\s*["']([^"']+)["'][^>]*?\/?>/gi;
  
  let match;
  imgTagRegex.lastIndex = 0; // Reset regex state
  
  const matches = [];
  while ((match = imgTagRegex.exec(content)) !== null) {
    matches.push({ match, mediaId: match[1]?.trim() });
  }
  
  // Process matches
  for (const { match, mediaId } of matches) {
    // Add text before the image tag
    if (match.index > lastIndex) {
      const textPart = content.substring(lastIndex, match.index);
      parts.push({ type: 'text', content: textPart });
    }
    
    // Add image element with dimensions and alignment if present
    if (mediaId) {
      const imgTag = match[0];
      const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
      const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
      const width = widthMatch ? parseInt(widthMatch[1], 10) : null;
      const height = heightMatch ? parseInt(heightMatch[1], 10) : null;
      
      // Parse alignment from style attribute
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

  // Add remaining text after last image
  if (lastIndex < content.length) {
    const textPart = content.substring(lastIndex);
    parts.push({ type: 'text', content: textPart });
  }

  // If no images found, render as plain text
  if (parts.length === 0) {
    return (
      <Typography
        variant="body1"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {content}
      </Typography>
    );
  }

  return (
    <Box>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          // Only render text if it's not empty or whitespace-only
          if (!part.content || !part.content.trim()) {
            return null;
          }
          return (
            <Typography
              key={index}
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                mb: index < parts.length - 1 ? 2 : 0,
              }}
            >
              {part.content}
            </Typography>
          );
        } else if (part.type === 'image') {
          return <AuthenticatedImage key={index} mediaId={part.mediaId} width={part.width} height={part.height} alignment={part.alignment} />;
        }
        return null;
      })}
    </Box>
  );
};

export default ArticleContent;

