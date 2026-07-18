import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  agencyId: string;
  role: UserRole;
}

export interface CurrentUserContext {
  userId: string;
  agencyId: string;
  role: UserRole;
}
