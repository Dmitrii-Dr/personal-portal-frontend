import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Alert,
  Box,
  Skeleton,
} from '@mui/material';

const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add timeout and signal to cancel request if component unmounts
        const response = await axios.get('/api/posts', {
          signal: controller.signal,
          timeout: 10000, // 10 second timeout
        });
        
        if (isMounted) {
          setPosts(Array.isArray(response.data) ? response.data : []);
          setLoading(false);
        }
      } catch (err) {
        // Don't set error if request was aborted (component unmounted)
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        
        console.error('Error fetching posts:', err);
        if (isMounted) {
          let errorMessage = 'Failed to load blog posts. Please try again later.';
          
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

    fetchPosts();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Card>
      <Skeleton variant="rectangular" height={200} />
      <CardContent>
        <Skeleton variant="text" width="80%" height={40} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="60%" />
      </CardContent>
      <CardActions>
        <Skeleton variant="rectangular" width={120} height={36} />
      </CardActions>
    </Card>
  );

  // Error state
  if (error && !loading) {
    return (
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Blog
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Blog
      </Typography>

      {loading ? (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1, 2, 3, 4].map((index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <LoadingSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : posts.length > 0 ? (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {posts.map((post) => (
            <Grid item xs={12} sm={6} md={4} key={post.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {post.imageUrl && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={post.imageUrl}
                    alt={post.title || 'Blog post image'}
                    sx={{
                      objectFit: 'cover',
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {post.title || 'Untitled'}
                  </Typography>
                  {(post.authorName || post.publishDate) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {post.authorName && `By ${post.authorName}`}
                      {post.authorName && post.publishDate && ' • '}
                      {post.publishDate &&
                        new Date(post.publishDate).toLocaleDateString()}
                    </Typography>
                  )}
                  {post.excerpt && (
                    <Typography variant="body2" color="text.secondary">
                      {post.excerpt}
                    </Typography>
                  )}
                </CardContent>
                {post.slug && (
                  <CardActions>
                    <Button
                      component={Link}
                      to={`/blog/${post.slug}`}
                      size="small"
                      color="primary"
                      sx={{ textTransform: 'none' }}
                    >
                      Read More
                    </Button>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>
          No blog posts available at the moment.
        </Alert>
      )}
    </Box>
  );
};

export default BlogPage;

