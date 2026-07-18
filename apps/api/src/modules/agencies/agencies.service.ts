import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UpdateAgencyDto } from './dto/update-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOwn(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException(`Agency ${agencyId} not found`);
    }
    return agency;
  }

  async updateOwn(agencyId: string, dto: UpdateAgencyDto) {
    await this.findOwn(agencyId);
    return this.prisma.agency.update({ where: { id: agencyId }, data: dto });
  }
}
