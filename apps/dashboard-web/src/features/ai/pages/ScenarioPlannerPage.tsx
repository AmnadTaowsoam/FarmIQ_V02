import React, { useState } from 'react';
import { Box, Grid, TextField, Button } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { LoadingCard } from '../../../components/LoadingCard';
import { api } from '../../../api';
import { useActiveContext } from '../../../contexts/ActiveContext';
import type { components } from '@farmiq/api-client';

type ScenarioResponse = components['schemas']['ScenarioResponse'];

export const ScenarioPlannerPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId } = useActiveContext();
  const [scenarioType, setScenarioType] = useState('growth');
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ScenarioResponse['data'] | null>(null);

  const handleRun = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.analyticsScenario(
        {
          scenario_type: scenarioType,
          target_weight_kg: targetWeight ? Number(targetWeight) : undefined,
          context: {
            farm_id: farmId || undefined,
            barn_id: barnId || undefined,
            batch_id: batchId || undefined,
          },
        },
        { tenant_id: tenantId }
      );
      setResult(response.data || null);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  if (error) return <ErrorState title="Scenario run failed" message={error.message} />;

  return (
    <Box>
      <PageHeader title="Scenario Planner" subtitle="Run what-if scenarios for production planning" />
      <Grid container spacing={3} mt={1}>
        <Grid item xs={12} md={6}>
          <SectionCard title="Scenario Inputs">
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Scenario Type"
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                size="small"
              />
              <TextField
                label="Target Weight (kg)"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                size="small"
              />
              <Button variant="contained" onClick={handleRun} disabled={loading}>
                {loading ? 'Running...' : 'Run Scenario'}
              </Button>
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <SectionCard title="Scenario Result">
            {loading ? (
              <LoadingCard title="Running scenario" lines={2} />
            ) : result ? (
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <EmptyState title="No scenario result yet" description="Adjust inputs and run a scenario to see outputs." />
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
