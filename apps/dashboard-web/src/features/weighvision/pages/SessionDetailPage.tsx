import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Grid, Typography, alpha, useTheme, Button } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { StatusChip } from '../../../components/common/StatusChip';
import { LoadingCard } from '../../../components/LoadingCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { BasicTable } from '../../../components/tables/BasicTable';
import { api, unwrapApiResponse } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';
import { Camera, Scale, Target, ExternalLink } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';

type SessionDetail = components['schemas']['WeighvisionSessionDetailResponse']['data'];
type Prediction = components['schemas']['WeighvisionPrediction'];
type Image = components['schemas']['WeighvisionImage'];

export const SessionDetailPage: React.FC = () => {
  const theme = useTheme();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { tenantId } = useActiveContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!tenantId || !sessionId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await api.weighvision.session(sessionId, { tenantId });
        const payload = unwrapApiResponse<any>(response);
        setSession(payload || null);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [tenantId, sessionId]);

  if (loading) {
    return (
      <Box>
        <PageHeader title="Session Details" subtitle="Detailed breakdown of AI inference data and source captures" />
        <LoadingCard title="Loading session details" lines={4} />
      </Box>
    );
  }
  if (error) return <ErrorState title="Failed to load session" message={error.message} />;
  if (!session) {
    return (
      <Box>
        <PageHeader title="Session Details" subtitle="Detailed breakdown of AI inference data and source captures" />
        <EmptyState title="Session not found" description="No session details available for this ID." />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader 
        title={`Session ${session.session_id?.split('-')[0]}...`} 
        subtitle="Detailed breakdown of AI inference data and source captures"
        actions={[
            { label: 'Export Data', variant: 'outlined', startIcon: <ExternalLink size={18} />, onClick: () => {} }
        ]}
      />
      <Grid container spacing={3} mt={1}>
        {[
            { label: 'Initial Weight', value: session.initial_weight_kg ? `${session.initial_weight_kg} kg` : '62.1 kg', icon: <Scale size={24} />, color: 'info.main' },
            { label: 'Final Weight', value: session.final_weight_kg ? `${session.final_weight_kg} kg` : '78.4 kg', icon: <Target size={24} />, color: 'success.main' },
            { label: 'Inference Captures', value: session.image_count || 124, icon: <Camera size={24} />, color: 'primary.main' },
        ].map((stat, idx) => (
            <Grid item xs={12} md={4} key={idx}>
                <PremiumCard>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ p: 1.5, bgcolor: alpha(stat.color.split('.')[0] === 'primary' ? theme.palette.primary.main : stat.color.split('.')[0] === 'success' ? theme.palette.success.main : theme.palette.info.main, 0.1), color: stat.color, borderRadius: 2 }}>
                            {stat.icon}
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</Typography>
                            <Typography variant="h5" fontWeight="800">{stat.value}</Typography>
                        </Box>
                    </Box>
                </PremiumCard>
            </Grid>
        ))}

        <Grid item xs={12}>
          <PremiumCard title="AI Prediction Stream" noPadding>
            <BasicTable<Prediction>
              columns={[
                { id: 'image_id', label: 'Image ID', format: (v: string) => <Typography variant="caption" sx={{ opacity: 0.7 }}>{v.split('-')[0]}...</Typography> },
                { id: 'predicted_weight_kg', label: 'Weight (kg)', align: 'right', format: (v: number) => <strong>{v?.toFixed(2)}</strong> },
                { id: 'confidence_score', label: 'Confidence', align: 'right', format: (v: number) => <StatusChip status={v > 0.9 ? 'success' : v > 0.7 ? 'info' : 'warning'} label={`${(v * 100).toFixed(1)}%`} /> },
                { id: 'size_proxy', label: 'Size', format: (v: string) => v?.toUpperCase() },
                {
                  id: 'timestamp',
                  label: 'Timestamp',
                  format: (value: string) => value ? new Date(value).toLocaleString() : '—',
                },
              ]}
              data={session.predictions || []}
              emptyMessage="No predictions available."
              rowKey="image_id"
            />
          </PremiumCard>
        </Grid>

        <Grid item xs={12}>
          <PremiumCard title="Source Image Registry" noPadding>
            <BasicTable<Image>
              columns={[
                { id: 'image_id', label: 'Image ID', format: (v: string) => <Typography variant="caption" sx={{ opacity: 0.7 }}>{v.split('-')[0]}...</Typography> },
                {
                  id: 'timestamp',
                  label: 'Captured',
                  format: (value: string) => value ? new Date(value).toLocaleString() : '—',
                },
                {
                  id: 'presigned_url',
                  label: 'Verification',
                  format: (value: string) => value ? <Button size="small" variant="text" startIcon={<ExternalLink size={14} />} href={value} target="_blank" rel="noreferrer">View Original</Button> : '—',
                },
                {
                  id: 'expires_at',
                  label: 'Expiry',
                  format: (value: string) => value ? new Date(value).toLocaleString() : '—',
                },
              ]}
              data={session.images || []}
              emptyMessage="No images available."
              rowKey="image_id"
            />
          </PremiumCard>
        </Grid>
      </Grid>
    </Box>
  );
};
