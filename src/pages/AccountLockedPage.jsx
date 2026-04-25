import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Card, CardContent, Container, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const AccountLockedPage = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 8, sm: 10 },
      }}
    >
      <Container maxWidth="sm">
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              {t('accountLocked.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.8 }}>
              {t('accountLocked.message')}
            </Typography>
            <Button component={Link} to="/" variant="contained" sx={{ textTransform: 'none' }}>
              {t('accountLocked.backHome')}
            </Button>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AccountLockedPage;
