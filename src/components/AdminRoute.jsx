import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getToken, hasAdminRole, refreshAccessToken, hasSessionHint } from '../utils/api';

const AdminRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Use the in-memory token if available (same-tab navigation).
      let token = getToken();

      // Page reload: token is gone but session hint exists → restore via /refresh.
      // Anonymous users (no hint) go straight to the admin login page.
      if (!token && hasSessionHint()) {
        token = await refreshAccessToken();
      }

      if (!token) {
        navigate('/admin', { replace: true });
        return;
      }

      if (!hasAdminRole(token)) {
        navigate('/', { replace: true });
        return;
      }

      setIsAuthorized(true);
      setChecking(false);
    };

    checkAdminAccess();
  }, [navigate]);

  if (checking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthorized ? children : null;
};

export default AdminRoute;
