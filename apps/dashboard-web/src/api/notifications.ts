import { apiClient } from './index';
import { retryWithBackoff } from '../utils/retry';
import { getTenantId } from './auth';

// ==================== Type Definitions ====================

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationChannel = 'in_app' | 'webhook' | 'email' | 'sms';
export type NotificationStatus = 'created' | 'queued' | 'sent' | 'failed' | 'canceled';

export interface Notification {
    notification_id: string;
    tenant_id: string;
    farm_id?: string | null;
    barn_id?: string | null;
    batch_id?: string | null;
    severity: NotificationSeverity;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    title: string;
    message: string;
    payload_json?: Record<string, any> | null;
    created_at: string;
    read_at?: string | null;
}

export interface NotificationInboxResponse {
    data: Notification[];
    total: number;
    unread_count: number;
    cursor?: string;
}

export interface NotificationHistoryResponse {
    data: Notification[];
    total: number;
    cursor?: string;
}

export interface NotificationFilters {
    // Context filters
    farm_id?: string;
    barn_id?: string;
    batch_id?: string;

    // Classification filters
    severity?: NotificationSeverity;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    topic?: string;

    // Pagination
    cursor?: string;
    limit?: number;

    // Date range (for history)
    start_date?: string;
    end_date?: string;
}

// ==================== API Client ====================

/**
 * Fetch inbox notifications (recent unread + recent read)
 */
export const fetchNotificationsInbox = async (
    filters?: Pick<NotificationFilters, 'topic' | 'cursor' | 'limit'>
): Promise<NotificationInboxResponse> => {
    return retryWithBackoff(async () => {
        const tenantId = getTenantId() || undefined;
        const response = await apiClient.get<NotificationInboxResponse>(
            '/api/v1/notifications/inbox',
            { params: { ...filters, tenantId } }
        );
        return response.data;
    });
};

/**
 * Fetch notification history with filters
 */
export const fetchNotificationsHistory = async (
    filters?: NotificationFilters
): Promise<NotificationHistoryResponse> => {
    return retryWithBackoff(async () => {
        const tenantId = getTenantId() || undefined;
        const response = await apiClient.get<NotificationHistoryResponse>(
            '/api/v1/notifications/history',
            { params: { ...filters, tenantId } }
        );
        return response.data;
    });
};

/**
 * Fetch unread count (optional endpoint)
 */
export const fetchUnreadCount = async (): Promise<number> => {
    try {
        const response = await apiClient.get<{ unread_count: number }>(
            '/api/v1/notifications/unread-count'
        );
        return response.data.unread_count;
    } catch (error) {
        // If endpoint doesn't exist, fall back to inbox
        console.warn('Unread count endpoint not available, using inbox fallback');
        const inbox = await fetchNotificationsInbox();
        return inbox.unread_count;
    }
};

/**
 * Send a notification (admin/system use)
 */
export interface SendNotificationPayload {
    farm_id?: string;
    barn_id?: string;
    batch_id?: string;
    severity: NotificationSeverity;
    channel: NotificationChannel;
    title: string;
    message: string;
    payload?: Record<string, any>;
    targets?: string[];
    external_ref?: string;
    dedupe_key?: string;
}

export const sendNotification = async (payload: SendNotificationPayload): Promise<void> => {
    const tenantId = getTenantId();
    await apiClient.post('/api/v1/notifications/send', payload, {
        params: tenantId ? { tenantId } : undefined,
    });
};

/**
 * Mark notification as read (if backend supports it)
 * This is a placeholder for future implementation
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    // TODO: Implement when backend endpoint is available
    console.warn('Mark as read not yet implemented on backend');
    // await apiClient.patch(`/api/v1/notifications/${notificationId}/read`);
};
