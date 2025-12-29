import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Button,
  Divider
} from '@mui/material';
import { X, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { contextualHelp, helpArticles } from '../data/helpContent';

interface ContextualHelpDrawerProps {
  open: boolean;
  onClose: () => void;
  pagePath: string;
}

export const ContextualHelpDrawer: React.FC<ContextualHelpDrawerProps> = ({
  open,
  onClose,
  pagePath
}) => {
  const navigate = useNavigate();
  const helpContent = contextualHelp[pagePath];

  if (!helpContent) return null;

  const relatedArticles = helpArticles.filter(article =>
    helpContent.relatedDocs.includes(article.id)
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 400,
          maxWidth: '90vw',
          p: 3
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Help: {helpContent.title}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      {/* What this page does */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          What this page does
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {helpContent.description}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Common issues */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Common issues
        </Typography>
        <List dense>
          {helpContent.commonIssues.map((issue, index) => (
            <ListItem key={index} sx={{ pl: 0 }}>
              <ListItemText
                primary={`• ${issue}`}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Related docs */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Related documentation
        </Typography>
        <List dense>
          {relatedArticles.map((article) => (
            <ListItem
              key={article.id}
              sx={{
                pl: 0,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                borderRadius: 1
              }}
              onClick={() => {
                navigate('/help');
                onClose();
              }}
            >
              <ListItemText
                primary={article.title}
                primaryTypographyProps={{ variant: 'body2', color: 'primary' }}
              />
              <ExternalLink size={16} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 'auto' }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={() => {
            navigate('/help');
            onClose();
          }}
        >
          Visit Help Center
        </Button>
        <Button
          variant="contained"
          fullWidth
          href="mailto:support@farmiq.ai"
        >
          Contact Support
        </Button>
      </Box>
    </Drawer>
  );
};
