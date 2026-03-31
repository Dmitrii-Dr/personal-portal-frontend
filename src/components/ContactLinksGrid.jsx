import React from 'react';
import { Box, Typography } from '@mui/material';
import { ContactPlatformIcon } from './icons';

/**
 * @param {{ links: Array<{ platform?: string, value: string, description?: string }> }} props
 */
const ContactLinksGrid = ({ links }) => {
  const getLabel = (link) => {
    if (link.description) {
      return link.description;
    }
    return link.platform || 'Link';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {links.map((link, index) => (
        <Box
          key={index}
          component="a"
          href={link.value}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            textDecoration: 'none',
            color: 'white',
            transition: 'all 0.3s ease-in-out',
            width: { xs: 80, sm: 100, md: 120 },
            minHeight: { xs: 100, md: 110 },
            '&:hover': {
              transform: 'translateY(-4px)',
              opacity: 0.8,
            },
          }}
        >
          <Box
            sx={{
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
          </Box>
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
            }}
          >
            {getLabel(link)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default ContactLinksGrid;
