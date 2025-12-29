import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open sidebar search' },
      { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ]
  },
  {
    category: 'General',
    items: [
      { keys: ['Esc'], description: 'Close modals and drawers' },
      { keys: ['Ctrl', 'S'], description: 'Save (when editing)' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    ]
  },
  {
    category: 'Data & Tables',
    items: [
      { keys: ['Ctrl', 'F'], description: 'Search in table' },
      { keys: ['Ctrl', 'E'], description: 'Export data' },
      { keys: ['Ctrl', 'R'], description: 'Refresh data' },
    ]
  },
  {
    category: 'Help',
    items: [
      { keys: ['Ctrl', 'H'], description: 'Open help center' },
      { keys: ['Ctrl', 'Shift', 'H'], description: 'Open user guide' },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Keyboard Shortcuts
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {shortcuts.map((category, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="primary">
                {category.category}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {category.items.map((shortcut, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'background.default'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {shortcut.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <Chip
                            label={key}
                            size="small"
                            sx={{
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          />
                          {keyIdx < shortcut.keys.length - 1 && (
                            <Typography variant="caption" sx={{ mx: 0.5, alignSelf: 'center' }}>
                              +
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
          <Typography variant="body2" color="info.dark">
            💡 <strong>Tip:</strong> Press <Chip label="?" size="small" sx={{ mx: 0.5 }} /> anytime to open this dialog.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
