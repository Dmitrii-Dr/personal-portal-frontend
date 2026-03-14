import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Container, Typography } from '@mui/material';

const MaintenancePage = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.paper',
        py: { xs: 8, sm: 10 },
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 700,
            textAlign: 'center',
            mb: 2,
          }}
        >
          {t('maintenance.title')}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            textAlign: 'center',
            color: 'text.secondary',
            fontSize: '1.05rem',
            lineHeight: 1.8,
          }}
        >
          {t('maintenance.message')}
        </Typography>
      </Container>
    </Box>
  );
};

export default MaintenancePage;
