import React from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Compass, ArrowRight } from 'lucide-react';
import { PremiumCard } from '../common/PremiumCard';

interface ContextRequiredCardProps {
    title?: string;
    description?: string;
    requiredLevel?: 'organization' | 'farm' | 'barn';
}

/**
 * Premium Empty State/Guard component shown when a page requires context
 * that has not yet been selected.
 */
export const ContextRequiredCard: React.FC<ContextRequiredCardProps> = ({
    title = 'Context Selection Required',
    description,
    requiredLevel = 'organization'
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const getIcon = () => {
        switch (requiredLevel) {
            case 'organization': return <Building2 size={40} />;
            case 'farm': return <Compass size={40} />;
            case 'barn': return <Compass size={40} />;
            default: return <Building2 size={40} />;
        }
    };

    const defaultDesc = description || `To view ${location.pathname.split('/').pop() || 'this section'}, please select a valid ${requiredLevel} context first.`;

    return (
        <Box 
            sx={{ 
                height: '60vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 3
            }}
        >
            <PremiumCard 
                accent="primary" 
                sx={{ 
                    maxWidth: 500, 
                    textAlign: 'center', 
                    p: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3
                }}
            >
                <Box 
                    sx={{ 
                        p: 3, 
                        borderRadius: '50%', 
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 1
                    }}
                >
                    {getIcon()}
                </Box>

                <Typography variant="h5" fontWeight="800" letterSpacing={-0.5}>
                    {title}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, lineHeight: 1.6 }}>
                    {defaultDesc}
                </Typography>

                <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/select-context', { state: { from: location } })}
                    endIcon={<ArrowRight size={18} />}
                    sx={{ 
                        mt: 2,
                        px: 4,
                        py: 1.5,
                        borderRadius: 3,
                        fontWeight: 800,
                        boxShadow: `0 12px 24px -6px ${alpha(theme.palette.primary.main, 0.3)}`
                    }}
                >
                    Select Context
                </Button>
            </PremiumCard>
        </Box>
    );
};
