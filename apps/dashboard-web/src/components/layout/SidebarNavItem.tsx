import React, { useState, useEffect } from 'react';
import { 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Tooltip, 
  Collapse, 
  List, 
  Box, 
  useTheme, 
  alpha 
} from '@mui/material';
import { useLocation } from 'react-router-dom';
import { RouteConfig } from '../../config/routes';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarNavItemProps {
  item: RouteConfig;
  collapsed: boolean;
  depth?: number;
  onNavigate: (path: string) => void;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ 
  item, 
  collapsed, 
  depth = 0,
  onNavigate 
}) => {
  const theme = useTheme();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Check if this item or any child is active
  const isActive = location.pathname.startsWith(item.path);
  const hasChildren = item.children && item.children.length > 0;

  // Auto-expand if active child found (only when not collapsed)
  useEffect(() => {
    if (!collapsed && isActive && hasChildren) {
      setOpen(true);
    }
  }, [collapsed, isActive, hasChildren]);

  // Close when collapsing
  useEffect(() => {
    if (collapsed) {
      setOpen(false);
    }
  }, [collapsed]);

  const handleClick = () => {
    if (hasChildren) {
      if (collapsed) {
        // In collapsed mode, do nothing or expand sidebar (handled by parent logic if desired)
        return; 
      }
      setOpen(!open);
    } else {
      onNavigate(item.path);
    }
  };

  // Styles
  const itemHeight = 48;
  const borderRadius = 1.5; // 12px

  const buttonSx = {
    minHeight: itemHeight,
    borderRadius: borderRadius,
    px: collapsed ? 1.5 : 2, // 12px vs 16px
    justifyContent: collapsed ? 'center' : 'initial',
    mb: 1,
    transition: theme.transitions.create(['background-color', 'color', 'padding', 'margin'], {
      duration: 200,
    }),
    color: isActive ? 'primary.main' : 'text.secondary',
    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
    '&:hover': {
      bgcolor: isActive 
        ? alpha(theme.palette.primary.main, 0.12) 
        : alpha(theme.palette.text.primary, 0.04),
    },
    // Active Indicator Logic
    position: 'relative',
    '&::before': !collapsed && isActive ? {
      content: '""',
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translateY(-50%)',
      height: 24,
      width: 3,
      borderRadius: '0 4px 4px 0',
      bgcolor: 'primary.main',
    } : {},
  };

  const iconSx = {
    minWidth: 0,
    mr: collapsed ? 0 : 2,
    justifyContent: 'center',
    color: 'inherit',
    transition: theme.transitions.create(['margin', 'opacity'], { duration: 200 }),
  };

  const renderContent = () => (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton onClick={handleClick} sx={buttonSx}>
        <ListItemIcon sx={iconSx}>
          {item.icon}
        </ListItemIcon>
        {/* Text Label - Hidden when collapsed */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          overflow: 'hidden',
          transition: theme.transitions.create(['width', 'opacity', 'transform'], { duration: 200 }),
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : 'auto',
          transform: collapsed ? 'translateX(-10px)' : 'translateX(0)',
          whiteSpace: 'nowrap',
        }}>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{ 
                variant: 'body2', 
                fontWeight: isActive ? 600 : 400 
              }} 
            />
            {hasChildren && !collapsed && (
              <Box sx={{ display: 'flex', color: 'text.disabled' }}>
                 {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Box>
            )}
        </Box>
      </ListItemButton>
    </ListItem>
  );

  // Wrap in Tooltip if collapsed
  const wrappedContent = collapsed ? (
    <Tooltip title={item.label} placement="right" arrow disableInteractive>
      {renderContent()}
    </Tooltip>
  ) : renderContent();

  return (
    <>
      {wrappedContent}
      {/* Nested Children */}
      {hasChildren && (
        <Collapse in={!collapsed && open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: collapsed ? 0 : 2 }}>
             {item.children?.map(child => (
               <SidebarNavItem 
                 key={child.path}
                 item={child}
                 collapsed={collapsed}
                 depth={depth + 1}
                 onNavigate={onNavigate}
               />
             ))}
          </List>
        </Collapse>
      )}
    </>
  );
};
