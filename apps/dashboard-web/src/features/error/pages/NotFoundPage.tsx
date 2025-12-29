import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'inline-flex', p: 3, bgcolor: 'action.hover', borderRadius: '50%', mb: 3 }}>
                    <SearchX size={48} color="#757575" />
                </Box>
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                    404
                </Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                    Page Not Found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4 }}>
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </Typography>
                <Button variant="contained" size="large" onClick={() => navigate('/overview')}>
                    Return to Dashboard
                </Button>
            </Container>
        </Box>
    );
};
