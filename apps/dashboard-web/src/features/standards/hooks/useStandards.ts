import { useMutation, useQuery } from '@tanstack/react-query';
import { standardsApi, type StandardSet, type StandardRow, type SpeciesCatalog, type GeneticLineCatalog, type StandardSchema, type BreederCompany } from '../../../api/standards';
import { unwrapApiResponse } from '../../../api/standards';

export const useStandardSets = (params?: {
  standardSchemaCode?: string;
  speciesCode?: string;
  geneticLineCode?: string;
  setType?: string;
  scope?: string;
  unitSystem?: string;
  sex?: string;
  isActive?: boolean;
  versionTag?: string;
  page?: number;
  pageSize?: number;
  refresh?: number;
}) => {
  return useQuery({
    queryKey: ['standards', 'sets', params],
    queryFn: async () => {
      const resp = await standardsApi.listStandardSets(params as any);
      const payload = resp.data as any;
      const items = payload?.data || payload?.items || [];
      return {
        items: items as StandardSet[],
        total: payload?.meta?.total ?? payload?.total ?? items.length ?? 0,
      };
    },
  });
};

export const useStandardsCatalog = () => {
  return useQuery({
    queryKey: ['standards', 'ui', 'catalog'],
    queryFn: async () => {
      const resp = await standardsApi.uiCatalog();
      const data = unwrapApiResponse<any>(resp) || {};
      return {
        species: (data.species || []) as SpeciesCatalog[],
        breederCompanies: (data.breeder_companies || []) as BreederCompany[],
        geneticLines: (data.genetic_lines || []) as GeneticLineCatalog[],
        standardSchemas: (data.standard_schemas || []) as StandardSchema[],
      };
    },
  });
};

export const useStandardSet = (setId: string) => {
  return useQuery({
    queryKey: ['standards', 'set', setId],
    enabled: !!setId,
    queryFn: async () => {
      const resp = await standardsApi.getStandardSet(setId);
      return unwrapApiResponse<StandardSet>(resp);
    },
  });
};

export const useStandardRows = (setId: string, params?: { dimType?: string; from?: number; to?: number; phase?: string; refresh?: number }) => {
  return useQuery({
    queryKey: ['standards', 'rows', setId, params],
    enabled: !!setId,
    queryFn: async () => {
      const resp = await standardsApi.getStandardRows(setId, params as any);
      return unwrapApiResponse<StandardRow[]>(resp) || [];
    },
  });
};

export const useUpdateStandardSet = (setId: string) => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const resp = await standardsApi.updateStandardSet(setId, payload);
      return unwrapApiResponse<StandardSet>(resp);
    },
  });
};

export const useUpsertStandardRows = (setId: string) => {
  return useMutation({
    mutationFn: async (rows: any[]) => {
      const resp = await standardsApi.upsertStandardRows(setId, rows as any);
      return unwrapApiResponse<any>(resp);
    },
  });
};

export const useCloneStandardSet = (setId: string) => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const resp = await standardsApi.cloneStandardSet(setId, payload);
      return unwrapApiResponse<any>(resp);
    },
  });
};

export const useAdjustStandardSet = (setId: string) => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const resp = await standardsApi.adjustStandardSet(setId, payload);
      return unwrapApiResponse<any>(resp);
    },
  });
};

export const useImportStandardsCsv = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const resp = await standardsApi.importStandardsCSV(formData);
      return unwrapApiResponse<any>(resp);
    },
  });
};
