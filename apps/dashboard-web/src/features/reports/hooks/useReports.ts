import { useMutation, useQuery } from '@tanstack/react-query';
import { reportsApi, type CreateReportJobRequest, type ReportJob } from '../api/reportsApi';
import { unwrapApiResponse } from '../../../api';

export const useReportJobs = (
  tenantId: string | null,
  params?: {
  status?: string;
  job_type?: string;
  created_from?: string;
  created_to?: string;
  cursor?: string;
  limit?: number;
  }
) => {
  return useQuery({
    queryKey: ['reports', 'jobs', tenantId, params],
    queryFn: async () => {
      if (!tenantId) return [];
      const response = await reportsApi.listJobs(tenantId, params);
      const payload = unwrapApiResponse<any>(response);
      if (!payload) return [];
      if (Array.isArray(payload.items)) return payload.items as ReportJob[];
      if (Array.isArray(payload)) return payload as ReportJob[];
      return [];
    },
    enabled: !!tenantId,
  });
};

export const useCreateReportJob = () => {
  return useMutation({
    mutationFn: async (payload: CreateReportJobRequest & { tenantId: string }) => {
      const { tenantId, ...body } = payload;
      const response = await reportsApi.createJob(tenantId, body);
      return unwrapApiResponse<ReportJob>(response);
    },
  });
};
