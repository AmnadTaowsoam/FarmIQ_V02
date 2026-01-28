# Admin Web - FarmIQ

Admin portal for FarmIQ platform management.

## Overview

Admin-web is a standalone React application for managing the FarmIQ platform. It provides administrative interfaces for:

- Tenant management
- User management
- Role and permission management
- Device management
- System monitoring
- Audit logging
- Data policy configuration
- Notification management

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
cd apps/admin-web
npm install
```

### Development

```bash
# Start development server on port 5143
npm run dev
```

### Build

```bash
# Build for production
npm run build
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BFF_BASE_URL` | BFF API base URL | `/api` |
| `VITE_API_BASE_URL` | API base URL (fallback) | `/api` |
| `VITE_MOCK_MODE` | Enable mock mode | `false` |

## Architecture

```
apps/admin-web/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/        # Reusable components
│   │   ├── admin/       # Admin-specific components
│   │   └── feedback/    # Feedback components (loading, error, etc.)
│   ├── contexts/          # React contexts
│   ├── features/          # Feature modules
│   │   └── admin/       # Admin pages
│   ├── guards/            # Route guards
│   ├── hooks/             # Custom hooks
│   ├── i18n/             # Internationalization
│   ├── layout/            # Layout components
│   ├── services/          # Business logic services
│   ├── theme/             # Theme configuration
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── App.tsx            # Main application component
│   └── main.tsx          # Application entry point
├── public/                # Static assets
├── Dockerfile             # Container build
├── nginx.conf             # Nginx configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── README.md             # This file
```

## Features

### Authentication

- JWT-based authentication
- Token refresh mechanism
- Session timeout handling
- Activity tracking

### Authorization

- Role-based access control
- Platform Admin role
- Tenant Admin role
- Ops Admin role

### Internationalization

- English (en)
- Thai (th)

## Deployment

### Docker

```bash
# Build image
docker build -t farmiq-admin-web:latest .

# Run container
docker run -d -p 5143:80 farmiq-admin-web:latest
```

### Kubernetes

The admin-web application is deployed via Kubernetes manifests in the `k8s/` directory.

## License

See project root LICENSE file.
