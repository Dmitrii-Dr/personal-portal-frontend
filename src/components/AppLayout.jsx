import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Button,
  Stack,
} from '@mui/material';

const AppLayout = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleToggleAuth = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {/* Branding - Left side */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 0,
              textDecoration: 'none',
              color: 'inherit',
              mr: 4,
            }}
          >
            Professional's Name
          </Typography>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Navigation Links - Right side */}
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Public Links - Always visible */}
            <Button
              component={Link}
              to="/"
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Home
            </Button>
            <Button
              component={Link}
              to="/blog"
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Blog
            </Button>

            {/* Conditional Links based on auth state */}
            {isLoggedIn ? (
              <>
                <Button
                  component={Link}
                  to="/account"
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  My Account
                </Button>
                <Button
                  onClick={handleToggleAuth}
                  color="inherit"
                  sx={{ textTransform: 'none' }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                component={Link}
                to="/login"
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                Login
              </Button>
            )}

            {/* Temporary toggle button for development */}
            <Button
              onClick={handleToggleAuth}
              color="inherit"
              variant="outlined"
              size="small"
              sx={{
                textTransform: 'none',
                fontSize: '0.75rem',
                px: 1,
                minWidth: 'auto',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.6)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
              title="Dev: Toggle Auth State"
            >
              {isLoggedIn ? '🔓' : '🔒'}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Container
        component="main"
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          py: 4,
        }}
      >
        {children}
      </Container>
    </Box>
  );
};

export default AppLayout;

