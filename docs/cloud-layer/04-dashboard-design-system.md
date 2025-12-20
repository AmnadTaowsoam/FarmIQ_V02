# FarmIQ Dashboard Design System & Implementation Guide

**Purpose**: Define the "Beautiful, Premium, Professional" design standards and enforceable implementation format for FarmIQ frontend applications (`dashboard-web` and `admin-console`).  
**Scope**: UI/UX principles, Global Tokens (Theming), Component Architecture, Data Visualization, and Governance.  
**Owner**: FarmIQ Frontend Team  
**Last updated**: 2025-12-20  

---

## 1. Design Philosophy: "Premium Professional"

The FarmIQ interface must convey trust, precision, and modern technological capability. We are moving away from "legacy software" visuals to a "SaaS Product" aesthetic.

### Core Visual Pillars
1.  **Clean & Spacious**: High ease-of-use through generous whitespace (padding/margins). Avoid dense, cluttered grids unless absolutely necessary.
2.  **Hierarchy via Typography**: Use font weights and sizes to guide the eye, rather than heavy borders or distinct background colors for every section.
3.  **Subtle Depth**: Use soft, diffused shadows (elevation) to create layers. Avoid stark black borders.
4.  **Purposeful Color**: Colors MUST indicate status (Healthy = Vibrant Green, Alert = Warm Amber, Critical = Sharp Red) or Action. The base UI should be neutral (Grays/Whites/Dark Slates).
5.  **Fluid Interactions**: Micro-interactions (hover states, transitions) should be instant and smooth (`transition: all 0.2s ease-in-out`).

---

## 2. Global Format & Tokens (Centralized Theming)

We use **Material UI (MUI) v5+** as our core component library, but we **override** the default "Material Look" to achieve our custom premium branding. All styles MUST be centralized in the `src/theme` directory.

### 2.1 Color Palette Tokens
Define these in `src/theme/palette.ts`.

*   **Primary (Brand)**: Represents the "Agri-Tech" nature.
    *   Main: `#00695C` (Teal 800) - Professional, stable, related to nature but rigorous.
    *   Light: `#4DB6AC` (Teal 300) - For accents/hovers.
    *   Dark: `#004D40` (Teal 900) - For deep headers/sidebar.
*   **Secondary (Action)**:
    *   Main: `#F57C00` (Orange 700) - High contrast against teal, used for primary Call-to-Actions (CTAs).
*   **Neutral (Backgrounds/Surface)**:
    *   Background (Default): `#F4F6F8` (Cool Gray) - Not pure white, reduces eye strain.
    *   Paper (Cards): `#FFFFFF` (Pure White) - Creates distinct layers against the background.
*   **Text**:
    *   Primary: `#1A2027` (Gunmetal) - Softer than pure black `#000000`.
    *   Secondary: `#616161` - For labels/metadata.

### 2.2 Typography Tokens
Define in `src/theme/typography.ts`. Use a modern sans-serif font family.
*   **Font Family**: `'Inter', 'Roboto', sans-serif`. `Inter` is preferred for UI legibility.
*   **Weights**:
    *   Regular: 400
    *   Medium: 500 (Use for table headers, navigation)
    *   SemiBold: 600 (Use for card titles, buttons)
    *   Bold: 700 (Use for major page headings only)

### 2.3 Spacing & Shape Tokens
*   **Border Radius**:
    *   Cards/Containers: `12px` (Standard) or `16px` (Prominent). Softer, more modern than 4px.
    *   Buttons: `8px`.
*   **Shadows (Elevation)**:
    *   Card Default: `0px 4px 20px rgba(0, 0, 0, 0.05)` (Soft diffused shadow).
    *   Card Hover: `0px 10px 35px rgba(0, 0, 0, 0.1)`.

### 2.4 Semantic Status Tokens
All components displaying state (Charts, Chips, Alerts, Badges) MUST use these shared semantic tokens. Do NOT select arbitrary colors.

| Status | Semantic Intent | Main Token (MUI) | Bg/Surface Token | Text/Contrast Token |
| :--- | :--- | :--- | :--- | :--- |
| **Success** | Healthy, Normal, Online, Completed | `success.main` (`#2E7D32`) | `success.light` (alpha 0.1) | `success.dark` |
| **Warning** | Alert, Anomaly, Degrading, Pending | `warning.main` (`#ED6C02`) | `warning.light` (alpha 0.1) | `warning.dark` |
| **Error** | Critical, Offline, Failed, Danger | `error.main` (`#D32F2F`) | `error.light` (alpha 0.1) | `error.dark` |
| **Info** | Neutral, Processing, Draft | `info.main` (`#0288D1`) | `info.light` (alpha 0.1) | `info.dark` |

**Usage Rules**:
*   **StatusChip**: Use `Bg/Surface` for background and `Text/Contrast` for label text.
*   **Alerts**: Use `Bg/Surface` for container background and `Main` for border/icon.
*   **Charts**: Use `Main` for series lines/bars.

### 2.5 Dark Mode Tokens
Dark mode is a first-class citizen. It is not just "inverted colors".

*   **Theme Switching**:
    *   Support `light`, `dark`, and `system` modes.
    *   Persist preference in `localStorage` key: `farmiq-theme-pref`.
*   **Surface Hierarchy**:
    *   Background (Default): `#121212` (Not pure black).
    *   Paper (Level 1): `#1E1E1E` (Cards).
    *   Paper (Level 2): `#2D2D2D` (Modals/Dropdowns).
*   **Text Contrast**:
    *   Primary: `#FFFFFF` (opacity 0.87).
    *   Secondary: `#FFFFFF` (opacity 0.60).
    *   Disabled: `#FFFFFF` (opacity 0.38).
*   **Dividers**: `#FFFFFF` (opacity 0.12).
*   **Elevation**: Use transparent white overlays (linear-gradient) instead of shadows for depth in dark mode.

---

## 3. Layout, Navigation & Implementation Specs

### 3.1 Layout Dimensions
Enforce these dimensions for consistency across pages.

*   **AppBar Height**: `64px` (Desktop), `56px` (Mobile).
*   **Sidebar Width**: `280px` (Expanded), `80px` (Collapsed).
*   **Page Padding**: `24px` (theme spacing 3) on all sides.
*   **Max Width**: `xl` (1536px) for dashboards. Use `100%` only for full-screen maps or specialized views.
*   **Grid Spacing**: Default to `spacing={3}` (24px) for major sections.

### 3.2 Page Component Template
**Standard File: `src/features/[feature]/pages/[PageName].tsx`**

```tsx
import React, { useEffect } from 'react';
import { Box, Typography, Grid, Container, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PageHeader } from '@/components/layout/PageHeader';
import { PremiumCard } from '@/components/common/PremiumCard';
import { ErrorState } from '@/components/feedback/ErrorState';
import { LoadingScreen } from '@/components/feedback/LoadingScreen';
import { useFarmData } from '../hooks/useFarmData';

export const OverviewPage: React.FC = () => {
  const theme = useTheme();
  const { data, loading, error, refetch } = useFarmData();

  useEffect(() => {
    document.title = "FarmIQ - Overview";
  }, []);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState code="ERR_OVERVIEW_01" traceId={error.traceId} onRetry={refetch} />;

  // ... render ...
};
```

### 3.3 Page Header Spec
The `PageHeader` component MUST standardise the top area of every page.
*   **Title**: H4 or H5 (`fontWeight: 700`).
*   **Subtitle**: Body2, `text.secondary`.
*   **Breadcrumbs**: Always present if depth > 1.
*   **Actions**: Aligned right. Primary action is `contained`, others `outlined` or `text`.
*   **Mobile**: Stack actions below title on `xs` breakpoints.

---

## 4. Reusable Premium Components Catalog

All shared components MUST adhere to the following contracts.

### 4.1. PremiumCard
*   **Purpose**: The fundamental container for content.
*   **Props**: `title?` (string), `action?` (ReactNode), `children` (ReactNode), `noPadding?` (boolean).
*   **Theming**: Uses `Paper`, custom elevation, rounded corners (12px/16px).
*   **Variants**: `default`, `highlighted` (coloured border).

### 4.2. StatusChip
*   **Purpose**: Display state of an entity.
*   **Props**: `status` ("success" | "warning" | "error" | "info"), `label` (string).
*   **Theming**: MUST use defined Semantic Status Tokens (Section 2.4).
*   **Style**: Soft background, strong text. Pill shape.

### 4.3. DataGrid (Customized)
*   **Purpose**: Tabular data display.
*   **Props**: Standard MUI DataGrid props.
*   **Features**:
    *   Striped rows: `false`.
    *   Vertical borders: `false`.
    *   Header: Uppercase, `text.secondary`, `fontWeight: 600`.
    *   Pagination: Server-side support required.

### 4.4. Feedback Components
*   **LoadingScreen**:
    *   **Full Page**: Central spinner with branding.
    *   **Sectional**: Skeleton loader (Rectangular/Circular) matching content shape.
*   **ErrorState**:
    *   **Props**: `title`, `message`, `code` (optional), `traceId` (optional), `onRetry?` (func).
    *   **Behavior**: Display user-friendly message, technical details in accordion/tooltip.
*   **EmptyState**:
    *   **Props**: `icon`, `title`, `description`, `action?`.
    *   **Usage**: Shown when list/data length is 0.

---

## 5. Data Visualization & Formatting

### 5.1 ChartContainer Contract
Every chart MUST be wrapped in a `ChartContainer`:
*   **Title**: Clear, descriptive.
*   **Subtitle**: Context (e.g., "Last 24 Hours").
*   **Legend**: Explicit legend for multi-series.
*   **Tooltip**: Standardized hover style.

### 5.2 Axis & Formatting
*   **Time Axis**: MUST comprise timezone-aware dates. Display in farm's local time (or user preference).
*   **Y-Axis**: MUST start at 0 unless data variance is small and high-precision is needed (e.g., body temp).
*   **Units**: Axes and Tooltips MUST show units (kg, °C, %).

### 5.3 Data Formatting Standards
Consistent formatting removes ambiguity.

*   **Timezone**: Defaults: User Preference > Farm Location > Browser Time.
*   **Date Format**:
    *   English: `dd MMM yyyy HH:mm` (e.g., 20 Dec 2025 14:30).
    *   Thai: `d MMM yy HH:mm` (e.g., 20 ธ.ค. 68 14:30).
*   **Null Values**: Display as `—` (em-dash). Never use `null`, `undefined`, or `0` for missing data.

| Metric | Unit | Precision | Example |
| :--- | :--- | :--- | :--- |
| **Temperature** | °C | 1 decimal | `28.5 °C` |
| **Humidity** | % | 0 decimal | `65 %` |
| **Weight** | kg | 2 decimals | `105.45 kg` |
| **Battery** | % | 0 decimal | `80 %` |
| **Signal/RSSI** | dBm | 0 decimal | `-65 dBm` |

---

## 6. Accessibility (a11y) & Internationalization (i18n)

### 6.1 Accessibility Rules
*   **Keyboard Nav**: All interactive elements (buttons, inputs, grid rows) MUST be focusable via Tab. Focus rings MUST be visible (`outline: 2px solid primary.main`).
*   **Touch Targets**: Minimum `44px` height/width for all touchable elements.
*   **Icons**: Icon-only buttons MUST have `aria-label` or `Tooltip`.
*   **Contrast**: Text MUST meet WCAG AA (4.5:1 on background).

### 6.2 Internationalization (Thai/English)
*   **Fonts**: The font stack MUST support Thai characters without breaking line height.
    *   Test string: "น้ำหนัก (Kg) - วันที่ 12 ธันวาคม".
*   **Truncation**: Avoid aggressive truncation. If text is truncated, a Tooltip is REQUIRED.

---

## 7. Performance & UX Quality

### 7.1 Performance Budgets
*   **Route Chunk Size**: < 300KB (gzip). Use `React.lazy()` for heavy routes (Charts/Check).
*   **Initial Load**: FCP < 1.5s, LCP < 2.5s.
*   **Images**: All thumbnails must be resized/optimized by backend or CDN before rendering.

### 7.2 UX Rules
*   **Layout Shift**: Always use fixed height constraints for Images and Charts (`min-height`) to prevent CLS.
*   **Virtualization**: Lists > 200 rows MUST use `react-window` or DataGrid Virtualization.
*   **Feedback**: Any action > 300ms MUST show a loading indicator.

---

## 8. Governance & Enforcement

### 8.1 PR Checklist
Every Frontend PR MUST be checked against:
- [ ] **Theming**: No hardcoded hex codes. All colors use `theme.palette`.
- [ ] **Responsiveness**: Verified on Mobile, Tablet, and Desktop breakpoints.
- [ ] **States**: Handled Loading, Error, and Empty states.
- [ ] **A11y**: Interactive elements have labels and focus states.
- [ ] **Linting**: Passed `eslint` and `prettier` checks.

### 8.2 Guardrails
*   **Linting**: Use `eslint-plugin-mui-unused-classes` (if applicable) and standard React hooks rules.
*   **Types**: strict `TypeScript` mode enabled. No `any` types allowed in PRs.

---
