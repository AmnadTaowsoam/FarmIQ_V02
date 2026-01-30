import {
  createPayment,
  processStripePayment,
  getPayments,
} from '../../src/services/paymentService';
import { PrismaClient } from '@prisma/client';

// @ts-ignore
const mockPrisma = new PrismaClient() as any;

// @ts-ignore
const mockStripe = require('stripe').default();

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create payment with correct details', async () => {
      const mockPayment = {
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'stripe',
        status: 'pending',
        externalId: 'pi_123',
      };

      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await createPayment('inv-1', 100, 'USD', 'stripe', 'pi_123');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'inv-1',
          amount: expect.any(Object),
          currency: 'USD',
          paymentMethod: 'stripe',
          status: 'pending',
          externalId: 'pi_123',
        },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should create payment without external ID', async () => {
      const mockPayment = {
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 100,
        currency: 'USD',
        paymentMethod: 'bank_transfer',
        status: 'pending',
      };

      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await createPayment('inv-1', 100, 'USD', 'bank_transfer');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.not.objectContaining({
          externalId: expect.any(String),
        }),
      });
      expect(result).toEqual(mockPayment);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.payment.create.mockRejectedValue(new Error('Database error'));

      await expect(
        createPayment('inv-1', 100, 'USD', 'stripe')
      ).rejects.toThrow('Database error');
    });
  });

  describe('processStripePayment', () => {
    it('should process successful Stripe payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      const mockPayment = {
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 100,
        currency: 'usd',
        paymentMethod: 'stripe',
        status: 'completed',
        completedAt: new Date(),
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(mockPayment);
      mockPrisma.invoice.update.mockResolvedValue({});

      const result = await processStripePayment('inv-1', 'pi_123');

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123');
      expect(mockPrisma.payment.create).toHaveBeenCalled();
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
        },
      });
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          status: 'paid',
          paidAt: expect.any(Date),
        },
      });
      expect(result).toEqual(mockPayment);
    });

    it('should convert amount from cents', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 10000,
        currency: 'usd',
        status: 'succeeded',
      };

      const mockPayment = {
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 100,
        currency: 'usd',
        paymentMethod: 'stripe',
        status: 'completed',
      };

      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue(mockPayment);
      mockPrisma.invoice.update.mockResolvedValue({});

      const result = await processStripePayment('inv-1', 'pi_123');

      const createCall = mockPrisma.payment.create.mock.calls[0][0];
      expect(createCall.data.amount).toBe(100);
    });

    it('should throw error when Stripe is not configured', async () => {
      // @ts-ignore
      const originalStripe = require('stripe').default;
      // @ts-ignore
      require('stripe').default = null;

      await expect(
        processStripePayment('inv-1', 'pi_123')
      ).rejects.toThrow('Stripe not configured');

      // @ts-ignore
      require('stripe').default = originalStripe;
    });

    it('should handle Stripe errors gracefully', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Stripe error'));

      await expect(
        processStripePayment('inv-1', 'pi_123')
      ).rejects.toThrow('Stripe error');
    });
  });

  describe('getPayments', () => {
    it('should return payments for invoice', async () => {
      const mockPayments = [
        { id: 'pay-1', invoiceId: 'inv-1', amount: 100 },
        { id: 'pay-2', invoiceId: 'inv-1', amount: 50 },
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await getPayments('inv-1');

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { invoiceId: 'inv-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockPayments);
    });

    it('should return empty array for invoice with no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await getPayments('inv-1');

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.payment.findMany.mockRejectedValue(new Error('Database error'));

      await expect(getPayments('inv-1')).rejects.toThrow('Database error');
    });
  });
});
