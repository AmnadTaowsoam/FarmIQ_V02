import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  TextField,
  Alert,
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'error';
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning',
  requireReason = false,
  onConfirm,
  onCancel,
}) => {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setError('Reason is required');
      return;
    }
    onConfirm(reason || undefined);
    setReason('');
    setError('');
  };

  const handleCancel = () => {
    setReason('');
    setError('');
    onCancel();
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {severity === 'error' && <AlertTriangle color="red" size={24} />}
        {severity === 'warning' && <AlertTriangle color="orange" size={24} />}
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: requireReason ? 2 : 0 }}>
          {message}
        </DialogContentText>

        {requireReason && (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="Reason"
              fullWidth
              multiline
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              error={!!error}
              helperText={error}
              placeholder="Please provide a reason for this action..."
            />
            {severity === 'error' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                This action cannot be undone. Please confirm you want to proceed.
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} color="inherit">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          color={getSeverityColor()}
          variant="contained"
          autoFocus={!requireReason}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
