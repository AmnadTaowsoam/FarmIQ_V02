/**
 * Contract Test: Dashboard Web → BFF
 * Validates the contract between dashboard frontend and BFF
 */

import { Pact } from '@pact-foundation/pact'
import axios from 'axios'
import path from 'path'

const provider = new Pact({
  consumer: 'dashboard-web',
  provider: 'cloud-api-gateway-bff',
  port: 1234,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'INFO',
  spec: 2,
})

describe('Dashboard Web ↔ BFF Contract', () => {
  beforeAll(() => provider.setup())
  afterEach(() => provider.verify())
  afterAll(() => provider.finalize())

  describe('GET /api/v1/dashboard/overview', () => {
    it('returns dashboard overview', async () => {
      const expectedResponse = {
        data: {
          tenantId: 'tenant-123',
          summary: {
            totalFarms: 5,
            totalBarns: 20,
            activeBatches: 3,
          },
        },
      }

      await provider.addInteraction({
        state: 'tenant exists with farms and barns',
        uponReceiving: 'a request for dashboard overview',
        withRequest: {
          method: 'GET',
          path: '/api/v1/dashboard/overview',
          headers: {
            Authorization: 'Bearer token',
            'x-tenant-id': 'tenant-123',
          },
          query: {
            tenantId: 'tenant-123',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: expectedResponse,
        },
      })

      const response = await axios.get('http://localhost:1234/api/v1/dashboard/overview', {
        headers: {
          Authorization: 'Bearer token',
          'x-tenant-id': 'tenant-123',
        },
        params: {
          tenantId: 'tenant-123',
        },
      })

      expect(response.data).toEqual(expectedResponse)
    })
  })

  describe('GET /api/v1/dashboard/overview - Error Cases', () => {
    it('returns 401 when unauthorized', async () => {
      await provider.addInteraction({
        state: 'no authentication',
        uponReceiving: 'a request without authentication',
        withRequest: {
          method: 'GET',
          path: '/api/v1/dashboard/overview',
        },
        willRespondWith: {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Missing or invalid Authorization header',
              traceId: 'trace-id',
            },
          },
        },
      })

      try {
        await axios.get('http://localhost:1234/api/v1/dashboard/overview')
        fail('Should have thrown error')
      } catch (error: any) {
        expect(error.response.status).toBe(401)
        expect(error.response.data.error.code).toBe('UNAUTHORIZED')
      }
    })
  })
})
