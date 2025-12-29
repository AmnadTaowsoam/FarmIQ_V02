import React from 'react';
import { Card, CardContent, CardHeader, Divider } from '@mui/material';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'outlined' | 'elevation';
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  children,
  variant = 'outlined',
}) => {
  return (
    <Card variant={variant}>
      {(title || subtitle || action) && (
        <>
          <CardHeader
            title={title}
            subheader={subtitle}
            action={action}
            titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
          />
          <Divider />
        </>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
};

