import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import BlogPage from './pages/BlogPage';
import BookingPage from './pages/BookingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

// Placeholder components for routes
const HomePage = () => {
  const [healthStatus, setHealthStatus] = useState('');
  const [healthError, setHealthError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleCheckHealth = async () => {
    setChecking(true);
    setHealthStatus('');
    setHealthError('');

    try {
      const response = await fetch(`api/v1/health`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const text = await response.text();
      setHealthStatus(text || 'OK');
    } catch (error) {
      setHealthError(error.message || 'Unable to reach backend');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h1>Home Page</h1>
      <p>Welcome to the home page2!</p>
      <button type="button" onClick={handleCheckHealth} disabled={checking}>
        {checking ? 'Checking…' : 'Check Backend Health'}
      </button>
      {healthStatus && (
        <p style={{ color: 'green' }}>Backend response: {healthStatus}</p>
      )}
      {healthError && (
        <p style={{ color: 'red' }}>Backend error: {healthError}</p>
      )}
    </div>
  );
};

const LoginPage = () => (
  <div>
    <h1>Login</h1>
    <p>Login page content.</p>
  </div>
);

const AccountPage = () => (
  <div>
    <h1>My Account</h1>
    <p>Account settings and information.</p>
  </div>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Routes>
          </AppLayout>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

