import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Star, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PinnedItem } from '../../hooks/useSidebarState';

interface PinnedSectionProps {
  items: PinnedItem[];
  onUnpin: (path: string) => void;
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}

export const PinnedSection: React.FC<PinnedSectionProps> = ({
  items,
  onUnpin,
  isCollapsed,
  onNavigate,
}) => {
  if (items.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {!isCollapsed && (
        <Typography
          variant="overline"
          sx={{
            px: 2,
            color: 'text.secondary',
            fontWeight: 700,
            letterSpacing: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Star size={12} fill="currentColor" />
          Pinned
        </Typography>
      )}
      <List sx={{ mt: 0.5 }}>
        {items.map((item) => (
          <ListItem
            key={item.path}
            disablePadding
            secondaryAction={
              !isCollapsed && (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(item.path);
                  }}
                  sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}
                >
                  <X size={14} />
                </IconButton>
              )
            }
          >
            <Tooltip title={isCollapsed ? item.label : ''} placement="right">
              <ListItemButton
                onClick={() => onNavigate(item.path)}
                sx={{
                  borderRadius: 1.5,
                  minHeight: 40,
                  pl: isCollapsed ? 1.5 : 2,
                  pr: 1,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                }}
              >
                <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 32, mr: isCollapsed ? 0 : 1 }}>
                  <Star size={18} />
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
