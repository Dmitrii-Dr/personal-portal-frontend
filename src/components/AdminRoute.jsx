import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getToken, hasAdminRole } from '../utils/api';

const AdminRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = () => {
      const token = getToken();

      if (!token) {
        // No token - redirect to admin login
        navigate('/admin', { replace: true });
        return;
      }

      // Token exists - check for admin role
      if (!hasAdminRole(token)) {
        // No admin role - redirect to home
        navigate('/', { replace: true });
        return;
      }

      // Has admin role - allow access
      setIsAuthorized(true);
      setChecking(false);
    };

    checkAdminAccess();
  }, [navigate]);

  // Show loading while checking authorization
  if (checking) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Only render children if authorized
  return isAuthorized ? children : null;
};

export default AdminRoute;

