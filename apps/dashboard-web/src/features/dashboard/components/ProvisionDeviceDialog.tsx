import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Alert,
    Box,
    Typography
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { queryKeys } from '../../../services/queryKeys';

interface ProvisionDeviceDialogProps {
    open: boolean;
    onClose: () => void;
}

const DEVICE_TYPES = [
    { value: 'sensor-gateway', label: 'Sensor Gateway' },
    { value: 'weighvision', label: 'WeighVision Camera' },
    { value: 'environmental-sensor', label: 'Environmental Sensor' },
    { value: 'feed-bin-scale', label: 'Feed Bin Scale' }
];

export const ProvisionDeviceDialog: React.FC<ProvisionDeviceDialogProps> = ({ open, onClose }) => {
    const { tenantId, farmId, barnId } = useActiveContext();
    const queryClient = useQueryClient();
    const [serialNo, setSerialNo] = useState('');
    const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0].value);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { mutate: provisionDevice, isPending } = useMutation({
        mutationFn: async () => {
             // Basic validation
             if (!serialNo.trim()) {
                 throw new Error('Serial Number is required');
             }

             return api.devices.create({
                 serialNo,
                 deviceType,
                 tenantId,
                 farmId,
                 barnId,
                 // Default status for new devices
                 status: 'active' 
             });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ 
                queryKey: queryKeys.devices.all({ 
                    tenantId: tenantId || undefined, 
                    farmId: farmId || undefined, 
                    barnId: barnId || undefined 
                }) 
            });
            handleClose();
        },
        onError: (error: any) => {
            setSubmitError(error.message || 'Failed to provision device');
        }
    });

    const handleClose = () => {
        setSerialNo('');
        setDeviceType(DEVICE_TYPES[0].value);
        setSubmitError(null);
        onClose();
    };

    const handleSubmit = () => {
        setSubmitError(null);
        provisionDevice();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Provision New Device</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {submitError && (
                        <Alert severity="error">{submitError}</Alert>
                    )}
                    
                    <TextField
                        autoFocus
                        label="Serial Number"
                        value={serialNo}
                        onChange={(e) => setSerialNo(e.target.value)}
                        fullWidth
                        required
                        placeholder="e.g. SN-00123"
                    />

                    <TextField
                        select
                        label="Device Type"
                        value={deviceType}
                        onChange={(e) => setDeviceType(e.target.value)}
                        fullWidth
                        required
                    >
                        {DEVICE_TYPES.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>

                    <Box sx={{ 
                        p: 2, 
                        bgcolor: 'action.hover', 
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider'
                    }}>
                        <Typography variant="subtitle2" color="text.primary" gutterBottom>
                            Context Link
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            This device will be linked to:
                        </Typography>
                        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1, alignItems: 'center' }}>
                            <Typography variant="body2" fontWeight="600">Farm:</Typography>
                            <Typography variant="body2">{farmId || '—'}</Typography>
                            
                            <Typography variant="body2" fontWeight="600">Barn:</Typography>
                            <Typography variant="body2">{barnId || '—'}</Typography>
                        </Box>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={isPending}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={isPending || !serialNo.trim()}
                >
                    {isPending ? 'Provisioning...' : 'Provision Device'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
