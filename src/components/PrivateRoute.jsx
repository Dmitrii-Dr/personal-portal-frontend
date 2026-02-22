import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { getToken, hasSessionHint, refreshAccessToken } from '../utils/api';

/**
 * Guards any route from anonymous users.
 * - If a token is already in memory (same-tab navigation) → renders children immediately.
 * - If no token but session hints exist (page reload) → attempts /refresh first.
 * - If still no token → redirects to /.
 *
 * Public routes: / and /blog/**
 * Everything else must be wrapped with <PrivateRoute>.
 */
const PrivateRoute = ({ children }) => {
    const navigate = useNavigate();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const check = async () => {
            // Token already in memory (same-tab navigation).
            let token = getToken();

            // Page reload: try to restore via /refresh (deduplicated globally).
            if (!token && hasSessionHint()) {
                token = await refreshAccessToken();
            }

            if (!token) {
                // No session — redirect to landing page.
                navigate('/', { replace: true });
                return;
            }

            setAuthorized(true);
            setChecking(false);
        };

        check();
    }, [navigate]);

    if (checking) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return authorized ? children : null;
};

export default PrivateRoute;
