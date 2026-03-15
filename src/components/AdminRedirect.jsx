import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken, hasAdminRole } from '../utils/api';

const AdminRedirect = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = getToken();
    
    // Only redirect if user has admin role and is not on an admin route.
    // Normalize to avoid trailing-slash mismatches (e.g. /about-me/).
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    const isAdminRoute = normalizedPath.startsWith('/admin');
    const isPublicAllowedRoute =
      normalizedPath === '/' ||
      normalizedPath === '/about-me' ||
      normalizedPath.startsWith('/blog');
    
    if (token && hasAdminRole(token) && !isAdminRoute && !isPublicAllowedRoute) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  return children;
};

export default AdminRedirect;
