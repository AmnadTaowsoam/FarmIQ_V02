import { login, refresh, me } from '../../src/controllers/authController';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
    const mPrisma = {
        user: {
            findUnique: jest.fn(),
        },
    };
    return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient();

describe('Auth Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let responseJson: any;

    beforeEach(() => {
        mockRequest = {};
        responseJson = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockImplementation((val) => {
                responseJson = val;
                return mockResponse;
            }),
        };
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should return 401 if user not found', async () => {
            mockRequest.body = { email: 'test@example.com', password: 'password' };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

            await login(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(responseJson.error.code).toBe('UNAUTHORIZED');
        });
    });

    describe('me', () => {
        it('should return user profile if authenticated', async () => {
            const user = { id: 'user-1', email: 'test@example.com', roles: [] };
            (mockRequest as any).user = { sub: 'user-1' };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

            await me(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(responseJson.id).toBe('user-1');
        });
    });
});
