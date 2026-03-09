import { api, unwrapApiResponse } from '../../../api';

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveWeighvisionContextFilters(params: {
  tenantId: string;
  farmId?: string | null;
  barnId?: string | null;
}): Promise<{ farmId?: string; barnId?: string }> {
  const { tenantId } = params;
  let resolvedFarmId = params.farmId || undefined;
  let resolvedBarnId = params.barnId || undefined;

  // Some readmodel datasets still store short ids like f-001 / b-001.
  // If UI context holds UUID ids, resolve to short ids when available.
  if (resolvedFarmId && UUID_V4_LIKE.test(resolvedFarmId)) {
    try {
      const farmsResp = await api.farms.list({ tenantId, page: 1, pageSize: 200 });
      const farms = unwrapApiResponse<any[]>(farmsResp) || [];
      const selectedFarm = farms.find((f) => (f?.id || f?.farm_id) === resolvedFarmId);
      const shortFarmId = selectedFarm?.name || selectedFarm?.farm_id;
      if (
        typeof shortFarmId === 'string' &&
        shortFarmId.length > 0 &&
        !UUID_V4_LIKE.test(shortFarmId)
      ) {
        resolvedFarmId = shortFarmId;
      }
    } catch {
      // Keep original filter if lookup fails.
    }
  }

  if (resolvedBarnId && UUID_V4_LIKE.test(resolvedBarnId)) {
    try {
      const barnsResp = await api.barns.list({
        tenantId,
        farmId: params.farmId || undefined,
        page: 1,
        pageSize: 500,
      });
      const barns = unwrapApiResponse<any[]>(barnsResp) || [];
      const selectedBarn = barns.find((b) => (b?.id || b?.barn_id) === resolvedBarnId);
      const shortBarnId = selectedBarn?.name || selectedBarn?.barn_id;
      if (
        typeof shortBarnId === 'string' &&
        shortBarnId.length > 0 &&
        !UUID_V4_LIKE.test(shortBarnId)
      ) {
        resolvedBarnId = shortBarnId;
      }
    } catch {
      // Keep original filter if lookup fails.
    }
  }

  return {
    farmId: resolvedFarmId,
    barnId: resolvedBarnId,
  };
}
