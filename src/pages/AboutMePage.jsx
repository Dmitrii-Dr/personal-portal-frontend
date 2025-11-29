import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  CircularProgress,
  Alert,
} from '@mui/material';
import apiClient from '../utils/api';

const AboutMePage = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAboutMe = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get('/api/v1/public/more-about-me');
        if (response.data && response.data.message) {
          setMessage(response.data.message);
        } else {
          setError('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching about-me data:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchAboutMe();
  }, []);

  return (
    <Box
      sx={{
        minHeight: '60vh',
        py: 8,
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="md">
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            mb: 4,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          About Me
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : (
          <Box
            sx={{
              mt: 4,
              p: 4,
              bgcolor: 'background.default',
              borderRadius: 2,
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontSize: '1.1rem',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default AboutMePage;

