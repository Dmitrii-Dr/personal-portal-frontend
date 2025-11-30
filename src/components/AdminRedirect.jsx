import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken, hasAdminRole } from '../utils/api';

const AdminRedirect = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    
    // Only redirect if user has admin role and is not on an admin route or session configuration
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isSessionConfig = location.pathname === '/session/configuration';
    
    if (token && hasAdminRole(token) && !isAdminRoute && !isSessionConfig) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  return children;
};

export default AdminRedirect;

