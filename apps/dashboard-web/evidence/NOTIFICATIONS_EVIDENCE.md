# Notifications Evidence Checklist

## Demo Script

### Prerequisites
1. Ensure backend BFF is running
2. Have test notifications in the system
3. Browser DevTools open (Network tab)

### Demo Steps

#### 1. Bell Icon & Badge
**Action**: Navigate to dashboard
**Expected**:
- Bell icon visible in top navbar
- Badge shows unread count (if any)
- Badge displays "99+" for counts over 99

**Screenshot**: `01_bell_with_badge.png`

---

#### 2. Open Notifications Drawer
**Action**: Click bell icon
**Expected**:
- Drawer slides in from right (420px width)
- Header shows "Notifications"
- Close button (X) visible
- Loading state shows briefly (if applicable)

**Screenshot**: `02_drawer_open_inbox.png`

---

#### 3. Notification List
**Action**: View notifications in drawer
**Expected**:
- Top 10 recent notifications displayed
- Each shows: severity icon, title, message, timestamp
- Unread notifications highlighted with colored dot
- Severity colors: Critical (red), Warning (orange), Info (blue)

**Screenshot**: `03_notification_list.png`

---

#### 4. Click Notification → Navigate to Insight
**Action**: Click a notification item
**Expected**:
- Drawer closes
- Navigate to `/ai/insights/:insightId`
- Insight detail page loads with:
  - Title
  - Summary
  - Key findings (bulleted list)
  - Recommended actions (numbered list)
  - Scope chips (farm/barn/batch)
  - Created timestamp

**Screenshot**: `04_insight_detail_page.png`

---

#### 5. Empty State
**Action**: Clear all notifications (or use account with no notifications)
**Expected**:
- Bell icon with empty badge
- Open drawer shows:
  - Bell icon (faded)
  - "No notifications yet" message
  - "Generate Insight" CTA button (optional)

**Screenshot**: `05_empty_state.png`

---

#### 6. Error State
**Action**: Simulate backend error (stop BFF or block network)
**Expected**:
- Open drawer shows:
  - Error alert (red)
  - Error message
  - "Retry" button

**Screenshot**: `06_error_state.png`

---

#### 7. Loading State
**Action**: Open drawer while data is loading
**Expected**:
- Circular progress spinner centered
- No flickering

**Screenshot**: `07_loading_state.png`

---

#### 8. Notifications Page - Inbox Tab
**Action**: Click "View All Notifications" in drawer
**Expected**:
- Navigate to `/notifications`
- Inbox tab active
- All notifications listed (not just top 10)
- Unread count badge on tab
- Refresh button in header

**Screenshot**: `08_notifications_page_inbox.png`

---

#### 9. Notifications Page - History Tab
**Action**: Click History tab
**Expected**:
- History tab active
- Filters visible:
  - Severity dropdown
  - Channel dropdown
  - Status dropdown
  - Farm ID input
  - Barn ID input
  - Start Date picker
  - End Date picker
- "Clear Filters" button (when filters applied)
- Pagination or "Load More" button

**Screenshot**: `09_notifications_page_history.png`

---

#### 10. Mobile View
**Action**: Resize browser to mobile width (<600px)
**Expected**:
- Drawer takes full width
- Filters stack vertically
- Touch-friendly tap targets
- Responsive layout

**Screenshot**: `10_mobile_view.png`

---

#### 11. Network Tab Verification
**Action**: Open DevTools Network tab, refresh page
**Expected**:
- Request to `/api/v1/notifications/inbox`
- Headers include:
  - `Authorization: Bearer <token>`
  - `x-request-id: <uuid>`
  - Query param: `tenant_id=<id>` or header: `x-tenant-id: <id>`
- Polling requests every 60s (when drawer/page visible)
- No requests when tab is hidden

**Screenshot**: `11_network_headers.png`

---

#### 12. Polling Behavior
**Action**: 
1. Open drawer
2. Wait 60 seconds
3. Switch to another tab
4. Wait 60 seconds
5. Switch back

**Expected**:
- Polling occurs every 60s when tab visible
- Polling pauses when tab hidden
- Polling resumes when tab visible again

**Verification**: Check Network tab for request timestamps

---

## Screenshot Checklist

- [ ] 01_bell_with_badge.png
- [ ] 02_drawer_open_inbox.png
- [ ] 03_notification_list.png
- [ ] 04_insight_detail_page.png
- [ ] 05_empty_state.png
- [ ] 06_error_state.png
- [ ] 07_loading_state.png
- [ ] 08_notifications_page_inbox.png
- [ ] 09_notifications_page_history.png
- [ ] 10_mobile_view.png
- [ ] 11_network_headers.png

## Acceptance Criteria

- [x] Bell updates without flicker
- [x] Clicking notification navigates to insight detail or meaningful page
- [x] Polling does not run in background tab
- [x] All states (loading/empty/error) are polished
- [x] Mobile responsive
- [x] Request headers correct (Authorization, x-request-id, tenant_id)

## Notes

- Insight detail page uses mock data currently
- Replace with actual API call when backend ready
- Badge count uses `unread_count` from API
- Polling interval: 60s for inbox, 45s for unread count
