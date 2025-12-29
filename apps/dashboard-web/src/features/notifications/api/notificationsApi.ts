import httpClient from '../../../api/http';
import { NOTIFICATION_ENDPOINTS } from '../../../api/endpoints';
import type { ApiResponse } from '../../../api';

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationChannel = 'in_app' | 'webhook' | 'email' | 'sms';
export type NotificationStatus = 'created' | 'queued' | 'sent' | 'failed' | 'canceled';

export interface NotificationItem {
  id: string;
  tenant_id: string;
  farm_id?: string | null;
  barn_id?: string | null;
  batch_id?: string | null;
  severity: NotificationSeverity | string;
  channel: NotificationChannel | string;
  title: string;
  message: string;
  status: NotificationStatus | string;
  created_at: string;
  updated_at?: string | null;
}

export interface NotificationHistoryResponse {
  items: NotificationItem[];
  next_cursor?: string | null;
}

export const notificationsApi = {
  async listHistory(tenantId: string, params?: {
    farmId?: string;
    barnId?: string;
    batchId?: string;
    severity?: string;
    channel?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    cursor?: string;
    limit?: number;
  }) {
    return httpClient.get<ApiResponse<NotificationHistoryResponse>>(NOTIFICATION_ENDPOINTS.HISTORY, {
      params: { tenantId, ...(params || {}) },
    });
  },
};
