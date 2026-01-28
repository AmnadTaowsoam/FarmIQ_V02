/**
 * Contract Test: BFF → Identity Service
 * Validates the contract between BFF and identity-access service
 */

import { Pact } from '@pact-foundation/pact'
import axios from 'axios'
import path from 'path'

const provider = new Pact({
  consumer: 'cloud-api-gateway-bff',
  provider: 'cloud-identity-access',
  port: 1235,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'INFO',
  spec: 2,
})

describe('BFF ↔ Identity Service Contract', () => {
  beforeAll(() => provider.setup())
  afterEach(() => provider.verify())
  afterAll(() => provider.finalize())

  describe('POST /api/v1/auth/login', () => {
    it('returns access and refresh tokens', async () => {
      const expectedResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
        token_type: 'Bearer',
        expires_in: 3600,
      }

      await provider.addInteraction({
        state: 'user exists with valid credentials',
        uponReceiving: 'a login request',
        withRequest: {
          method: 'POST',
          path: '/api/v1/auth/login',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            email: 'user@example.com',
            password: 'password123',
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

      const response = await axios.post('http://localhost:1235/api/v1/auth/login', {
        email: 'user@example.com',
        password: 'password123',
      })

      expect(response.data).toEqual(expectedResponse)
    })
  })

  describe('GET /api/v1/admin/users', () => {
    it('returns list of users', async () => {
      const expectedResponse = {
        data: [
          {
            id: 'user-123',
            email: 'user@example.com',
            roles: ['tenant_admin'],
            tenantId: 'tenant-123',
          },
        ],
        total: 1,
        page: 0,
        pageSize: 25,
        totalPages: 1,
      }

      await provider.addInteraction({
        state: 'users exist',
        uponReceiving: 'a request for user list',
        withRequest: {
          method: 'GET',
          path: '/api/v1/admin/users',
          headers: {
            Authorization: 'Bearer admin-token',
          },
          query: {
            page: '0',
            pageSize: '25',
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

      const response = await axios.get('http://localhost:1235/api/v1/admin/users', {
        headers: {
          Authorization: 'Bearer admin-token',
        },
        params: {
          page: 0,
          pageSize: 25,
        },
      })

      expect(response.data).toEqual(expectedResponse)
    })
  })
})
