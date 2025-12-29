import React from 'react';
import { Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';

interface LoadingCardProps {
  title?: string;
  lines?: number;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ title, lines = 3 }) => {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          {title && (
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
          )}
          <Skeleton variant="rounded" height={28} width="60%" />
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton key={index} variant="rounded" height={16} />
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
