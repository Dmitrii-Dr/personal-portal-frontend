import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const AgreementPersonalPage = () => {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Agreement on Personal Data Processing
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography paragraph>
                        [STUB] This is where the text for the Agreement on Personal Data Processing will go.
                    </Typography>
                    <Typography paragraph>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default AgreementPersonalPage;
