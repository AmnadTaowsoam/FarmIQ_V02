# Cloud Config Rules Service

FarmIQ Cloud Config Rules Service - Configuration rules, thresholds, and target curves management service.

## Prerequisites

Before you begin, make sure you have the following installed:

- Node.js v20 or later
- npm (included with Node.js)
- Docker (optional)
- PostgreSQL

## Getting Started

1. Clone the repository
2. Run `npm install`
3. Create a `.env` file using the `.env.example` file as a reference
4. Run database migrations: `npx prisma migrate dev`
5. Run `npm run dev` to start the application in development mode

## Commands

- `npm run dev`: Start the application in development mode with hot-reloading
- `npm run build`: Build the application for production
- `npm start`: Start the application in production mode
- `npm run serve`: Start the application from built files
- `npm run lint`: Lint the code using ESLint
- `npm run lint:fix`: Fix lint issues using ESLint
- `npm test`: Run tests using Jest
- `npm run test:coverage`: Run tests with coverage report

## Prisma Commands

- `npm run prisma:generate`: Generate Prisma Client
- `npm run migrate:up`: Run database migrations
- `npm run migrate:undo`: Rollback migrations

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check (verifies database connection)
- `GET /api-docs` - Swagger UI documentation
- `GET /api/v1/config/context` - Get effective config for context
- `GET /api/v1/config/thresholds` - Get thresholds
- `PUT /api/v1/config/thresholds` - Upsert thresholds
- `GET /api/v1/config/targets` - Get target curves
- `PUT /api/v1/config/targets` - Upsert target curves

## Data Models

- **ThresholdRule**: Configuration rules for anomaly detection and alerts
- **TargetCurve**: Target curves for weight growth and FCR targets

## Multi-tenant Support

All endpoints require `tenant_id` and enforce multi-tenant isolation. JWT authentication is required.

## License

(c) Copyright 2023 Betagro PLC, all rights reserved.

