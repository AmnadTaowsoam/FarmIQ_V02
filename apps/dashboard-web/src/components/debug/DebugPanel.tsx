import React, { useState } from 'react';
import { Box, Paper, Typography, IconButton, Collapse, Chip, Divider } from '@mui/material';
import { Bug, X, ChevronUp, ChevronDown, Copy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveContext } from '../../contexts/ActiveContext';
import { isMockMode, getBFFBaseURL } from '../../api/client';

export const DebugPanel: React.FC = () => {
    const [expanded, setExpanded] = useState(false);
    const { user } = useAuth();
    const context = useActiveContext();
    const lastRequestId = (window as any).__lastRequestId;

    // Only show in development or if manually enabled
    if (import.meta.env.PROD && !localStorage.getItem('show_debug')) return null;

    return (
        <Paper 
            elevation={4}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: expanded ? 320 : 'auto',
                zIndex: 9999,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
            }}
        >
            <Box 
                sx={{ 
                    p: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    bgcolor: expanded ? 'action.hover' : 'transparent'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                <Box display="flex" alignItems="center" gap={1}>
                    <Bug size={16} color="#ef4444" />
                    <Typography variant="subtitle2" fontWeight="bold">DevTools</Typography>
                    {isMockMode() && <Chip label="MOCK" size="small" color="warning" sx={{ height: 20 }} />}
                </Box>
                {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </Box>

            <Collapse in={expanded}>
                <Box sx={{ p: 2, pt: 0 }}>
                    <Divider sx={{ my: 1 }} />
                    
                    <DebugItem label="Env" value={import.meta.env.MODE} />
                    <DebugItem label="API" value={getBFFBaseURL()} />
                    <DebugItem label="User" value={user?.email || 'Guest'} />
                    <DebugItem label="Roles" value={user?.roles.join(', ') || '-'} />
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">Active Context</Typography>
                    <DebugItem label="Tenant" value={context.tenantId} />
                    <DebugItem label="Farm" value={context.farmId} />
                    <DebugItem label="Barn" value={context.barnId} />
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">Last Request ID</Typography>
                        <IconButton size="small" onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(lastRequestId);
                        }}>
                            <Copy size={12} />
                        </IconButton>
                    </Box>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                        {lastRequestId || 'None'}
                    </Typography>
                </Box>
            </Collapse>
        </Paper>
    );
};

const DebugItem: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => (
    <Box display="flex" justifyContent="space-between" alignItems="center" my={0.5}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight="medium" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {value || '-'}
        </Typography>
    </Box>
);
