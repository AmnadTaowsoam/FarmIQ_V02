import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { RefreshCw, Drill } from 'lucide-react';

export const ServerErrorPage: React.FC = () => {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm" sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'inline-flex', p: 3, bgcolor: '#E3F2FD', borderRadius: '50%', mb: 3 }}>
                    <Drill size={48} color="#1976D2" />
                </Box>
                <Typography variant="h2" fontWeight="bold" gutterBottom>
                    500
                </Typography>
                <Typography variant="h5" color="text.secondary" gutterBottom>
                    Internal Server Error
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4 }}>
                    Something went wrong on our end. We are working to fix it. Please try again later.
                </Typography>
                <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<RefreshCw size={18} />}
                    onClick={() => window.location.reload()}
                >
                    Refresh Page
                </Button>
            </Container>
        </Box>
    );
};
