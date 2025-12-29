import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'inline-flex', p: 3, bgcolor: '#FFEBEE', borderRadius: '50%', mb: 3 }}>
                    <ShieldAlert size={48} color="#D32F2F" />
                </Box>
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                    403
                </Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                    Access Denied
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4 }}>
                    You do not have permission to view this page. Please contact your administrator if you believe this is an error.
                </Typography>
                <Button variant="outlined" size="large" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </Container>
        </Box>
    );
};
