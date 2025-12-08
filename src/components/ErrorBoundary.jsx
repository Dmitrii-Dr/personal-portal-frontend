import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

const ErrorDisplay = ({ error, onReload }) => {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('common.error')}
        </Typography>
        <Typography variant="body2">
          {error?.message || t('pages.errorBoundary.unexpectedError')}
        </Typography>
        <Button
          onClick={onReload}
          sx={{ mt: 2 }}
          variant="contained"
        >
          {t('pages.errorBoundary.reloadPage')}
        </Button>
      </Alert>
    </Box>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} onReload={this.handleReload} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

