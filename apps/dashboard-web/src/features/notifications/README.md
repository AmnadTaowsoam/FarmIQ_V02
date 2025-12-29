# Notifications Feature

## Overview
Production-grade in-app notifications system for the FarmIQ dashboard-web application, using ONLY BFF endpoints.

## Architecture

### API Layer (`src/api/notifications.ts`)
- **Type Definitions**: `Notification`, `NotificationSeverity`, `NotificationInboxResponse`, `NotificationHistoryResponse`, `NotificationFilters`
- **API Functions**:
  - `fetchNotificationsInbox()` - GET /api/v1/dashboard/notifications/inbox
  - `fetchNotificationsHistory(filters)` - GET /api/v1/dashboard/notifications/history
  - `fetchUnreadCount()` - GET /api/v1/dashboard/notifications/unread-count (with fallback)

### Data Layer (`src/hooks/useNotifications.ts`)
React Query hooks with automatic polling and caching:
- `useNotificationsInbox()` - Polls every 60s, stale time 30s
- `useNotificationsHistory(filters)` - Stale time 60s
- `useUnreadCount()` - Polls every 45s, stale time 30s, only when tab is visible

### UI Components

#### 1. NotificationBell (`src/components/notifications/NotificationBell.tsx`)
- **Location**: Integrated into Topbar (navbar)
- **Features**:
  - Badge with unread count (max 99)
  - Drawer UI (420px width, responsive)
  - Shows top 10 recent notifications
  - Loading, error, and empty states
  - Severity indicators (info/warning/critical)
  - Relative timestamps
  - Click navigation based on `payload_json.link` or fallback to `/notifications`
  - "View All Notifications" button

#### 2. NotificationListItem (`src/components/notifications/NotificationListItem.tsx`)
- **Features**:
  - Card layout with severity color border
  - Severity badge and icon
  - Unread indicator
  - Metadata display (farm_id, barn_id, timestamp)
  - Hover effects
  - Supports both relative and absolute timestamps

#### 3. NotificationsPage (`src/features/notifications/pages/NotificationsPage.tsx`)
- **Route**: `/notifications`
- **Features**:
  - **Tabs**: Inbox | History
  - **Inbox Tab**:
    - Shows all recent notifications
    - Unread count badge
    - No pagination (shows all)
  - **History Tab**:
    - Comprehensive filters:
      - Severity (info/warning/critical)
      - Farm ID
      - Barn ID
      - Date range (start_date, end_date)
    - Pagination (20 items per page)
    - Clear filters button
  - **States**: Loading, error, empty (with contextual messages)
  - **Refresh button** in page header
  - **Navigation**: Clicking notification navigates based on `payload_json.link`

## Integration Points

### Topbar Integration
File: `src/layout/Topbar.tsx`
- Replaced static bell icon with `<NotificationBell />`
- Positioned between `TopbarStatus` and Help icon

### Routing
File: `src/App.tsx`
- Route already exists: `/notifications` → `<NotificationsPage />`
- Protected by `ContextGuard` (requires tenant)

## Data Flow

```
User Opens App
    ↓
useNotificationsInbox() hook activates
    ↓
Polls BFF every 60s (only when tab visible)
    ↓
Updates badge count in NotificationBell
    ↓
User clicks bell → Drawer opens with top 10 notifications
    ↓
User clicks notification → Navigates to payload_json.link or /notifications
    ↓
User navigates to /notifications page
    ↓
Inbox tab shows all notifications
    ↓
History tab allows filtering and pagination
```

## Backend Contract

### Expected Response Formats

#### Inbox Response
```json
{
  "data": [
    {
      "notification_id": "uuid",
      "tenant_id": "uuid",
      "farm_id": "uuid | null",
      "barn_id": "uuid | null",
      "severity": "info | warning | critical",
      "title": "string",
      "message": "string",
      "payload_json": {
        "link": "/path/to/resource",
        "custom_data": "..."
      },
      "created_at": "ISO8601",
      "read_at": "ISO8601 | null"
    }
  ],
  "total": 100,
  "unread_count": 5
}
```

#### History Response
```json
{
  "data": [...],
  "total": 500,
  "page": 1,
  "page_size": 20
}
```

## Styling & Design

### Severity Colors
- **Critical**: Red (#d32f2f)
- **Warning**: Orange (#ed6c02)
- **Info**: Blue (#0288d1)

### Design System Compliance
- Uses MUI components throughout
- Follows app's spacing, typography, and color tokens
- Responsive design (mobile-friendly drawer and list)
- Premium card layouts with hover effects
- Consistent with existing PageHeader pattern

## Future Enhancements

### Mark as Read (Pending Backend)
Function stub exists in `src/api/notifications.ts`:
```typescript
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  // TODO: Implement when backend endpoint is available
  // await apiClient.patch(`/api/v1/dashboard/notifications/${notificationId}/read`);
};
```

When backend implements PATCH endpoint, add:
1. Mark as read on click
2. Optimistic updates in React Query
3. "Mark all as read" button

## Testing Checklist

- [ ] Notification bell shows correct unread count
- [ ] Drawer opens/closes smoothly
- [ ] Loading states display correctly
- [ ] Error states display with retry option
- [ ] Empty states show appropriate messages
- [ ] Clicking notification navigates correctly
- [ ] Inbox tab shows all notifications
- [ ] History tab filters work (severity, farm, barn, dates)
- [ ] Pagination works in history tab
- [ ] Refresh button updates data
- [ ] Polling works (check network tab)
- [ ] Mobile responsive (drawer, filters)
- [ ] Severity indicators display correctly
- [ ] Timestamps format correctly (relative vs absolute)

## Files Created/Modified

### Created
- `src/api/notifications.ts` - API client
- `src/hooks/useNotifications.ts` - React Query hooks
- `src/components/notifications/NotificationBell.tsx` - Bell component
- `src/components/notifications/NotificationListItem.tsx` - List item component
- `src/components/notifications/index.ts` - Barrel export
- `src/features/notifications/README.md` - This file

### Modified
- `src/layout/Topbar.tsx` - Integrated NotificationBell
- `src/features/notifications/pages/NotificationsPage.tsx` - Complete rewrite

## Dependencies
All dependencies already installed:
- `@tanstack/react-query` - Data fetching
- `@mui/material` - UI components
- `lucide-react` - Icons
- `date-fns` - Date formatting
- `react-router-dom` - Navigation
