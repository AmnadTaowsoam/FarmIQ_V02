import React, { useMemo, useState } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, MenuItem } from '@mui/material';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useBatches, Batch } from '../../../hooks/useBatches';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api } from '../../../api';
import { ClipboardList } from 'lucide-react';
import { z } from 'zod';

const SPECIES_OPTIONS = ['broiler', 'layer', 'swine', 'fish'];

export const BatchesPage: React.FC = () => {
  const { barnId: routeBarnId } = useParams<{ barnId: string }>();
  const { tenantId, farmId, barnId } = useActiveContext();
  const effectiveBarnId = routeBarnId || barnId || undefined;
  const { data: batches, isLoading, error, refetch } = useBatches({ farmId, barnId: effectiveBarnId });
  const [createOpen, setCreateOpen] = useState(false);
  const [species, setSpecies] = useState('broiler');
  const [breed, setBreed] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const createSchema = z.object({
    species: z.string().min(1, 'Species is required'),
    status: z.string().min(1, 'Status is required'),
    breed: z.string().optional(),
    headcount: z.number().int().positive().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  });

  const createDisabled = useMemo(
    () => !tenantId || !farmId || !effectiveBarnId || !species.trim(),
    [tenantId, farmId, effectiveBarnId, species]
  );

  const handleCreate = async () => {
    if (!tenantId || !farmId || !effectiveBarnId || !species.trim()) return;
    try {
      const parsed = createSchema.safeParse({
        species: species.trim(),
        status: status || 'active',
        breed: breed.trim() || undefined,
        headcount: headcount ? Number(headcount) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (!parsed.success) {
        setCreateError(parsed.error.issues[0]?.message || 'Invalid batch details');
        return;
      }
      await api.batches.create({
        farm_id: farmId,
        barn_id: effectiveBarnId,
        species: parsed.data.species,
        breed: parsed.data.breed,
        headcount: parsed.data.headcount,
        status: parsed.data.status,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate,
      });
      setCreateOpen(false);
      setStartDate('');
      setEndDate('');
      setBreed('');
      setHeadcount('');
      setCreateError(null);
      await refetch();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create batch');
    }
  };

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="Batches & Flocks" subtitle="Track active cohorts within barns" />
        <LoadingCard title="Loading batches" lines={3} />
      </Box>
    );
  }

  if (error) return <ErrorState title="Failed to load batches" message={error.message} />;

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Batches & Flocks"
        subtitle="Track active cohorts within barns"
        actions={[
          {
            label: 'Create Batch',
            variant: 'contained',
            startIcon: <ClipboardList size={18} />,
            onClick: () => setCreateOpen(true),
          },
        ]}
      />

      {batches.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} />}
          title="No batches found"
          description="Create a batch to start tracking flock performance."
        />
      ) : (
        <PremiumCard noPadding>
          <BasicTable<Batch>
            columns={[
              { id: 'batch_id', label: 'Batch ID' },
              { id: 'species', label: 'Species' },
              { id: 'status', label: 'Status' },
              {
                id: 'start_date',
                label: 'Start Date',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
              {
                id: 'end_date',
                label: 'End Date',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
            ]}
            data={batches.map((batch) => ({
              ...batch,
              batch_id: batch.batch_id || batch.id,
              start_date: batch.start_date || (batch as any).startDate,
              end_date: batch.end_date || (batch as any).endDate,
            }))}
            rowKey="batch_id"
          />
        </PremiumCard>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Batch</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            select
            label="Species"
            value={species}
            onChange={(event) => setSpecies(event.target.value)}
            fullWidth
          >
            {SPECIES_OPTIONS.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            helperText="active, completed, or cancelled"
            fullWidth
          />
          <TextField
            label="Breed"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
            fullWidth
          />
          <TextField
            label="Headcount"
            type="number"
            value={headcount}
            onChange={(event) => setHeadcount(event.target.value)}
            fullWidth
          />
          <TextField
            label="Start date"
            type="datetime-local"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="End date"
            type="datetime-local"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          {!farmId || !effectiveBarnId ? (
            <Typography variant="body2" color="warning.main">
              Select a farm and barn before creating a batch.
            </Typography>
          ) : null}
          {createError ? (
            <Typography variant="body2" color="error">
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createDisabled} onClick={handleCreate}>
            Create Batch
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
