import type { AxiosResponse } from 'axios';
import httpClient from './http';
import { STANDARDS_ENDPOINTS } from './endpoints';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    cursor?: string;
  };
}

export const unwrapApiResponse = <T>(response: AxiosResponse<ApiResponse<T> | T>): T => {
  const payload = response.data as any;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
};

export type SetType = 'REFERENCE' | 'STANDARD' | 'TARGET';
export type Scope = 'GLOBAL' | 'TENANT' | 'FARM' | 'HOUSE' | 'FLOCK';
export type UnitSystem = 'METRIC' | 'IMPERIAL';
export type Sex = 'AS_HATCHED' | 'MALE' | 'FEMALE' | 'MIXED';
export type DimType = 'AGE_DAY' | 'AGE_WEEK' | 'BODY_WEIGHT_G' | 'PHASE' | 'CUSTOM';

export interface SpeciesCatalog {
  id: string;
  code: string;
  name: string;
  scientificName?: string | null;
  isActive: boolean;
}

export interface BreederCompany {
  id: string;
  name: string;
  country?: string | null;
  isActive: boolean;
}

export interface GeneticLineCatalog {
  id: string;
  code?: string | null;
  name: string;
  isActive: boolean;
  species?: SpeciesCatalog;
  breederCompany?: BreederCompany;
}

export interface StandardSchema {
  id: string;
  code: string;
  displayName: string;
  dimTypeDefault: DimType;
  csvColumnsJson: any;
  payloadSchemaJson: any;
  isActive: boolean;
}

export interface StandardSet {
  id: string;
  name: string;
  setType: SetType;
  standardSchemaId?: string;
  standardSchema?: StandardSchema;
  unitSystem: UnitSystem;
  sex: Sex;
  scope: Scope;
  tenantId?: string | null;
  farmId?: string | null;
  houseId?: string | null;
  flockId?: string | null;
  speciesId: string;
  species?: SpeciesCatalog;
  geneticLineId?: string | null;
  geneticLine?: GeneticLineCatalog | null;
  versionTag: string;
  isActive: boolean;
  derivedFromSetId?: string | null;
  derivedFrom?: StandardSet | null;
  adjustmentJson?: any | null;
  sourceDocument?: any | null;
  dayStart?: number | null;
  dayEnd?: number | null;
  isDaily?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StandardRow {
  id: string;
  setId: string;
  rowKey: string;
  dimType: DimType;
  dimFrom: number;
  dimTo?: number | null;
  phase?: string | null;
  payloadJson: Record<string, any>;
  isInterpolated: boolean;
  note?: string | null;
}

export const standardsApi = {
  listStandardSets: (params?: {
    speciesId?: string;
    speciesCode?: string;
    geneticLineId?: string;
    geneticLineCode?: string;
    standardSchemaId?: string;
    standardSchemaCode?: string;
    setType?: SetType;
    scope?: Scope;
    unitSystem?: UnitSystem;
    sex?: Sex;
    isActive?: boolean;
    versionTag?: string;
    page?: number;
    pageSize?: number;
  }) => httpClient.get<ApiResponse<StandardSet[]>>(STANDARDS_ENDPOINTS.SETS, { params }),

  getStandardSet: (setId: string) =>
    httpClient.get<ApiResponse<StandardSet>>(STANDARDS_ENDPOINTS.SET_BY_ID(setId)),

  getStandardRows: (setId: string, params?: { dimType?: DimType; from?: number; to?: number; phase?: string }) =>
    httpClient.get<ApiResponse<StandardRow[]>>(STANDARDS_ENDPOINTS.ROWS(setId), { params }),

  resolveStandardSet: (params: {
    tenantId: string;
    farmId?: string;
    houseId?: string;
    flockId?: string;
    speciesCode: string;
    geneticLineCode?: string;
    standardSchemaCode: string;
    setType?: SetType;
    unitSystem?: UnitSystem;
    sex?: Sex;
  }) =>
    httpClient.get<
      ApiResponse<{ resolvedSetId: string | null; scopeUsed: Scope | null; versionTag: string | null; setType: SetType | null }>
    >(STANDARDS_ENDPOINTS.RESOLVE, { params }),

  createStandardSet: (
    payload: {
      name: string;
      setType: SetType;
      standardSchemaCode: string;
      speciesCode: string;
      geneticLineCode?: string;
      unitSystem: UnitSystem;
      sex: Sex;
      scope: Scope;
      tenantId?: string;
      farmId?: string;
      houseId?: string;
      flockId?: string;
      versionTag: string;
      isActive?: boolean;
      sourceDocument?: any;
    }
  ) =>
    httpClient.post<ApiResponse<StandardSet>>(STANDARDS_ENDPOINTS.SETS, payload),

  updateStandardSet: (setId: string, payload: Partial<StandardSet>) =>
    httpClient.patch<ApiResponse<StandardSet>>(STANDARDS_ENDPOINTS.SET_BY_ID(setId), payload),

  upsertStandardRows: (
    setId: string,
    rows: Array<{
      rowKey?: string;
      dimType: DimType;
      dimFrom: number;
      dimTo?: number;
      phase?: string;
      payloadJson: Record<string, any>;
      note?: string;
      isInterpolated?: boolean;
    }>
  ) => httpClient.put<ApiResponse<StandardRow[]>>(STANDARDS_ENDPOINTS.ROWS(setId), { rows }),

  cloneStandardSet: (
    setId: string,
    payload: { newSetType: 'STANDARD' | 'TARGET'; scope: Scope; tenantId?: string; farmId?: string; houseId?: string; flockId?: string; versionTag: string; copyRows?: boolean }
  ) => httpClient.post<ApiResponse<StandardSet>>(STANDARDS_ENDPOINTS.CLONE(setId), payload),

  adjustStandardSet: (
    setId: string,
    payload: { scope: Scope; tenantId?: string; farmId?: string; houseId?: string; flockId?: string; versionTag: string; method?: 'percent' | 'offset' | 'phase'; percent?: number; offset?: number; phases?: Array<{ from: number; to: number; percent?: number; offset?: number }> }
  ) => httpClient.post<ApiResponse<StandardSet>>(STANDARDS_ENDPOINTS.ADJUST(setId), payload),

  importStandardsCSV: (formData: FormData) =>
    httpClient.post<ApiResponse<any>>(STANDARDS_ENDPOINTS.IMPORT_CSV, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getImportJob: (jobId: string) => httpClient.get<ApiResponse<any>>(STANDARDS_ENDPOINTS.IMPORT_JOB(jobId)),

  uiCatalog: () => httpClient.get<ApiResponse<any>>(`${STANDARDS_ENDPOINTS.SETS.replace('/sets', '')}/ui/catalog`),
  uiTargets: (params: { tenantId: string; farmId?: string; houseId?: string; flockId?: string; standardSchemaCode?: string; speciesCode?: string; geneticLineCode?: string; page?: number; pageSize?: number }) =>
    httpClient.get<ApiResponse<any>>(`${STANDARDS_ENDPOINTS.SETS.replace('/sets', '')}/ui/targets`, { params }),
};
