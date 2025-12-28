import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';

const AgreementPsyPage = () => {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Informed Voluntary Consent to Psychological Help
                </Typography>
                <Box sx={{ mt: 2 }}>
                    <Typography paragraph>
                        [STUB] This is where the text for the Informed Voluntary Consent to Psychological Help will go.
                    </Typography>
                    <Typography paragraph>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default AgreementPsyPage;
