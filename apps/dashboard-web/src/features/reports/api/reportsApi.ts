import httpClient from '../../../api/http';
import { REPORTS_ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse } from '../../../api';

export type ReportJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type ReportJobType = 'FEED_INTAKE_EXPORT';

export interface ReportJob {
  id: string;
  tenant_id: string;
  job_type: ReportJobType | string;
  format: 'csv' | 'json';
  status: ReportJobStatus | string;
  progress_pct?: number | null;
  farm_id?: string | null;
  barn_id?: string | null;
  batch_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  started_at?: string | null;
  updated_at: string;
  finished_at?: string | null;
  error_message?: string | null;
}

export interface ReportJobsListResponse {
  items: ReportJob[];
  next_cursor?: string | null;
}

export interface CreateReportJobRequest {
  job_type: ReportJobType;
  format: 'csv' | 'json';
  farm_id?: string;
  barn_id?: string;
  batch_id?: string;
  start_date?: string;
  end_date?: string;
}

export const reportsApi = {
  async listJobs(tenantId: string, params?: {
    status?: string;
    job_type?: string;
    created_from?: string;
    created_to?: string;
    cursor?: string;
    limit?: number;
  }) {
    return httpClient.get<ApiResponse<ReportJobsListResponse>>(REPORTS_ENDPOINTS.JOBS, {
      params: { tenantId, ...(params || {}) },
    });
  },

  async getJob(tenantId: string, jobId: string) {
    return httpClient.get<ApiResponse<ReportJob>>(REPORTS_ENDPOINTS.JOB_BY_ID(jobId), {
      params: { tenantId },
    });
  },

  async createJob(tenantId: string, payload: CreateReportJobRequest) {
    return httpClient.post<ApiResponse<ReportJob>>(REPORTS_ENDPOINTS.JOBS, { tenantId, ...payload });
  },

  async download(tenantId: string, jobId: string) {
    return httpClient.get<ApiResponse<{ download_url?: string }>>(REPORTS_ENDPOINTS.JOB_DOWNLOAD(jobId), {
      params: { tenantId },
    });
  },
};
