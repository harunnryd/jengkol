import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CurrentUserContext, JwtPayload } from './auth.types';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signToken(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({ data: { name: dto.agencyName } });
      return tx.user.create({
        data: {
          agencyId: agency.id,
          email: dto.email,
          passwordHash,
          role: UserRole.OWNER,
        },
      });
    });

    const accessToken = this.signToken({
      sub: user.id,
      agencyId: user.agencyId,
      role: user.role,
    });

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.signToken({
      sub: user.id,
      agencyId: user.agencyId,
      role: user.role,
    });

    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }

  async inviteMember(dto: InviteMemberDto, currentUser: CurrentUserContext) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        agencyId: currentUser.agencyId,
        email: dto.email,
        passwordHash,
        role: UserRole.MEMBER,
      },
    });

    return { id: user.id, email: user.email, role: user.role };
  }
}
