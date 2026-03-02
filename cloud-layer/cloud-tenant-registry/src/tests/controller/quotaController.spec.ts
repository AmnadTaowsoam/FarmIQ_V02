import { Request, Response } from 'express';
import { getTenantQuotaRoute } from '../../controllers/quotaController';
import * as quotaService from '../../services/quotaService';

jest.mock('../../services/quotaService');

describe('QuotaController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: { tenantId: 't-001' },
      headers: {},
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('returns 200 for existing tenant quota', async () => {
    const quota = { tenantId: 't-001', maxDevices: 100 };
    (quotaService.getTenantQuota as jest.Mock).mockResolvedValue(quota);

    await getTenantQuotaRoute(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(quota);
  });

  it('returns 404 when tenant is not found', async () => {
    const error: any = new Error('Tenant with id u-001 not found');
    error.code = 'TENANT_NOT_FOUND';
    (quotaService.getTenantQuota as jest.Mock).mockRejectedValue(error);

    await getTenantQuotaRoute(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Tenant with id u-001 not found',
        traceId: 'trace-id',
      },
    });
  });
});
