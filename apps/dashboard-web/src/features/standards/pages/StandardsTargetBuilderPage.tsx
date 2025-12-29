import React, { useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useAdjustStandardSet, useStandardSets } from '../hooks/useStandards';
import { useToast } from '../../../components/toast/useToast';

export const StandardsTargetBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { tenantId, farmId, barnId } = useActiveContext();
  const [search] = useSearchParams();
  const baseSetIdFromUrl = search.get('baseSetId') || '';

  const [baseSetId, setBaseSetId] = useState(baseSetIdFromUrl);
  const [scope, setScope] = useState<'TENANT' | 'FARM' | 'HOUSE' | 'FLOCK'>('FARM');
  const [versionTag, setVersionTag] = useState('target-v1');
  const [method, setMethod] = useState<'percent' | 'offset'>('percent');
  const [percent, setPercent] = useState(0.05);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, error } = useStandardSets({ page: 1, pageSize: 200 });
  const adjustMutation = useAdjustStandardSet(baseSetId);

  const handleCreate = async () => {
    if (!baseSetId) return;
    const payload: any = {
      scope,
      tenantId,
      versionTag,
      method,
    };
    if (scope === 'FARM') payload.farmId = farmId;
    if (scope === 'HOUSE') payload.houseId = barnId;
    if (method === 'percent') payload.percent = percent;
    if (method === 'offset') payload.offset = offset;

    const created = await adjustMutation.mutateAsync(payload);
    toast.success('Target set created');
    if (created?.id) navigate(`/standards/sets/${created.id}`);
    else navigate('/standards');
  };

  const options = useMemo(() => data?.items || [], [data]);

  return (
    <Box>
      <PageHeader
        title="Target Builder"
        subtitle="Clone a base set and apply percent/offset adjustments"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowLeft size={18} />} onClick={() => navigate('/standards')}>
              Back
            </Button>
            <Button variant="contained" startIcon={<Wand2 size={18} />} disabled={!baseSetId || adjustMutation.isPending} onClick={handleCreate}>
              Create Target
            </Button>
          </Stack>
        }
      />

      <PremiumCard>
        {error ? (
          <ApiErrorState
            status={(error as any)?.response?.status}
            message={(error as any)?.message}
            endpoint="/api/v1/standards/sets"
            correlationId={(error as any)?.response?.headers?.['x-request-id']}
          />
        ) : (
          <Stack spacing={2}>
            <TextField
              select
              label="Base Set"
              value={baseSetId}
              onChange={(e) => setBaseSetId(e.target.value)}
              disabled={isLoading}
              fullWidth
            >
              {options.map((s: any) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} ({s.standardSchema?.code || 'SCHEMA'}/{s.species?.code || 'SPECIES'}/{s.geneticLine?.code || 'GENERIC'}/{s.setType}/{s.scope}/{s.versionTag})
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <TextField select label="Scope" value={scope} onChange={(e) => setScope(e.target.value as any)} sx={{ minWidth: 200 }}>
                <MenuItem value="TENANT">TENANT</MenuItem>
                <MenuItem value="FARM">FARM</MenuItem>
                <MenuItem value="HOUSE">HOUSE</MenuItem>
                <MenuItem value="FLOCK">FLOCK</MenuItem>
              </TextField>
              <TextField label="Version" value={versionTag} onChange={(e) => setVersionTag(e.target.value)} sx={{ minWidth: 240 }} />
              <TextField select label="Method" value={method} onChange={(e) => setMethod(e.target.value as any)} sx={{ minWidth: 200 }}>
                <MenuItem value="percent">percent</MenuItem>
                <MenuItem value="offset">offset</MenuItem>
              </TextField>
              {method === 'percent' ? (
                <TextField
                  label="Percent (0.05 = +5%)"
                  type="number"
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  sx={{ minWidth: 240 }}
                />
              ) : (
                <TextField
                  label="Offset (+kg/+g/etc)"
                  type="number"
                  value={offset}
                  onChange={(e) => setOffset(Number(e.target.value))}
                  sx={{ minWidth: 240 }}
                />
              )}
            </Stack>
          </Stack>
        )}
      </PremiumCard>
    </Box>
  );
};
