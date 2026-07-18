import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '@/modules/auth/auth.service';
import { PrismaService } from '@/database/prisma.service';

function fakePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
    agency: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    ...overrides,
  } as unknown as PrismaService;
}

function fakeJwt(): JwtService {
  return { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
}

describe('AuthService', () => {
  describe('register', () => {
    it('hashes the password, creates an agency + owner user, and returns a token', async () => {
      const createdUser = {
        id: 'user-1',
        agencyId: 'agency-1',
        email: 'owner@test.com',
        role: 'OWNER',
      };
      const tx = {
        agency: { create: jest.fn().mockResolvedValue({ id: 'agency-1' }) },
        user: { create: jest.fn().mockResolvedValue(createdUser) },
      };
      const prisma = fakePrisma({
        user: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
      });
      const jwt = fakeJwt();
      const service = new AuthService(prisma, jwt);

      const result = await service.register({
        agencyName: 'Test Agency',
        email: 'owner@test.com',
        password: 'password123',
      });

      expect(tx.agency.create).toHaveBeenCalledWith({ data: { name: 'Test Agency' } });
      const userCreateData = tx.user.create.mock.calls[0][0].data;
      expect(userCreateData.email).toBe('owner@test.com');
      expect(userCreateData.role).toBe('OWNER');
      expect(await bcrypt.compare('password123', userCreateData.passwordHash)).toBe(true);
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        agencyId: 'agency-1',
        role: 'OWNER',
      });
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('rejects registration when the email is already in use', async () => {
      const prisma = fakePrisma({
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'existing' }) },
      });
      const service = new AuthService(prisma, fakeJwt());

      await expect(
        service.register({ agencyName: 'X', email: 'dup@test.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token when the password matches', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      const prisma = fakePrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            agencyId: 'agency-1',
            email: 'owner@test.com',
            role: 'OWNER',
            passwordHash,
          }),
        },
      });
      const jwt = fakeJwt();
      const service = new AuthService(prisma, jwt);

      const result = await service.login({ email: 'owner@test.com', password: 'password123' });

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        agencyId: 'agency-1',
        role: 'OWNER',
      });
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 10);
      const prisma = fakePrisma({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'user-1',
            agencyId: 'agency-1',
            email: 'owner@test.com',
            role: 'OWNER',
            passwordHash,
          }),
        },
      });
      const service = new AuthService(prisma, fakeJwt());

      await expect(
        service.login({ email: 'owner@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      const prisma = fakePrisma({ user: { findUnique: jest.fn().mockResolvedValue(null) } });
      const service = new AuthService(prisma, fakeJwt());

      await expect(
        service.login({ email: 'nobody@test.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
