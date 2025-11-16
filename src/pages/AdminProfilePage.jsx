import React from 'react';
import ProfilePage from './ProfilePage';

// Admin profile page reuses the same profile component.
// Route protection is handled by AdminRoute in App.jsx (ROLE_ADMIN).
const AdminProfilePage = () => {
  return <ProfilePage />;
};

export default AdminProfilePage;


