import {
  upsertSubscription,
  getSubscription,
  cancelSubscription,
} from '../../src/services/subscriptionService';
import { PrismaClient } from '@prisma/client';

// @ts-ignore
const mockPrisma = new PrismaClient() as any;

// @ts-ignore
const mockStripe = require('stripe').default();

describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertSubscription', () => {
    it('should create new subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'professional',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      };

      mockPrisma.subscription.upsert.mockResolvedValue(mockSubscription);

      const result = await upsertSubscription('tenant-1', 'professional', 'monthly');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          plan: 'professional',
          billingCycle: 'monthly',
          status: 'active',
        }),
        update: expect.objectContaining({
          plan: 'professional',
          billingCycle: 'monthly',
        }),
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should update existing subscription', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'enterprise',
        billingCycle: 'annual',
        status: 'active',
      };

      mockPrisma.subscription.upsert.mockResolvedValue(mockSubscription);

      const result = await upsertSubscription('tenant-1', 'enterprise', 'annual');

      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should calculate correct period end for monthly billing', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'professional',
        billingCycle: 'monthly',
        status: 'active',
      };

      mockPrisma.subscription.upsert.mockResolvedValue(mockSubscription);

      const result = await upsertSubscription('tenant-1', 'professional', 'monthly');

      const callArgs = mockPrisma.subscription.upsert.mock.calls[0][0];
      const createData = callArgs.create;
      const periodEnd = new Date(createData.currentPeriodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      expect(createData.currentPeriodEnd.getMonth()).toBe(periodEnd.getMonth());
    });

    it('should calculate correct period end for annual billing', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'enterprise',
        billingCycle: 'annual',
        status: 'active',
      };

      mockPrisma.subscription.upsert.mockResolvedValue(mockSubscription);

      const result = await upsertSubscription('tenant-1', 'enterprise', 'annual');

      const callArgs = mockPrisma.subscription.upsert.mock.calls[0][0];
      const createData = callArgs.create;
      const periodEnd = new Date(createData.currentPeriodStart);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      expect(createData.currentPeriodEnd.getFullYear()).toBe(periodEnd.getFullYear());
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.subscription.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        upsertSubscription('tenant-1', 'professional', 'monthly')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for tenant', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'professional',
        status: 'active',
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await getSubscription('tenant-1');

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null for non-existent subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await getSubscription('non-existent-tenant');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.subscription.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(getSubscription('tenant-1')).rejects.toThrow('Database error');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'active',
        cancelAtPeriodEnd: true,
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription);

      const result = await cancelSubscription('tenant-1', true);

      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
      });
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: {
          cancelAtPeriodEnd: true,
          status: 'active',
        },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should cancel subscription immediately', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'cancelled',
        cancelAtPeriodEnd: false,
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription);

      const result = await cancelSubscription('tenant-1', false);

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        data: {
          cancelAtPeriodEnd: false,
          status: 'cancelled',
        },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should throw error for non-existent subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(cancelSubscription('non-existent-tenant')).rejects.toThrow(
        'Subscription not found'
      );
    });

    it('should cancel in Stripe when configured', async () => {
      const mockSubscription = {
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'active',
        stripeSubscriptionId: 'sub_stripe_123',
      };

      mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      mockPrisma.subscription.update.mockResolvedValue(mockSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({});

      const result = await cancelSubscription('tenant-1', true);

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        { cancel_at_period_end: true }
      );
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.subscription.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(cancelSubscription('tenant-1')).rejects.toThrow('Database error');
    });
  });
});
