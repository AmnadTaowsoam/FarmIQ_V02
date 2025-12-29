import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
} from '@mui/material';
import { Clock } from 'lucide-react';
import { RecentItem } from '../../hooks/useSidebarState';

interface RecentsSectionProps {
  items: RecentItem[];
  isCollapsed: boolean;
  onNavigate: (path: string) => void;
}

export const RecentsSection: React.FC<RecentsSectionProps> = ({
  items,
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
          <Clock size={12} />
          Recent
        </Typography>
      )}
      <List sx={{ mt: 0.5 }}>
        {items.map((item) => (
          <ListItem key={item.path} disablePadding>
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
                  <Clock size={18} />
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
