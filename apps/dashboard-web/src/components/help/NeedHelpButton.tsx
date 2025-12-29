import React, { useState } from 'react';
import { Button } from '@mui/material';
import { HelpCircle } from 'lucide-react';
import { ContextualHelpDrawer } from '../../features/help/components/ContextualHelpDrawer';
import { useLocation } from 'react-router-dom';

export const NeedHelpButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<HelpCircle size={16} />}
        onClick={() => setOpen(true)}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 500
        }}
      >
        Need help?
      </Button>
      <ContextualHelpDrawer
        open={open}
        onClose={() => setOpen(false)}
        pagePath={location.pathname}
      />
    </>
  );
};
