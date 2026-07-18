import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(agencyId: string, dto: CreateCreatorDto) {
    return this.prisma.creator.create({ data: { ...dto, agencyId } });
  }

  findAll(agencyId: string) {
    return this.prisma.creator.findMany({ where: { agencyId } });
  }

  async findOne(agencyId: string, id: string) {
    const creator = await this.prisma.creator.findFirst({ where: { id, agencyId } });
    if (!creator) {
      throw new NotFoundException(`Creator ${id} not found`);
    }
    return creator;
  }

  async update(agencyId: string, id: string, dto: UpdateCreatorDto) {
    await this.findOne(agencyId, id);
    return this.prisma.creator.update({ where: { id }, data: dto });
  }

  async remove(agencyId: string, id: string) {
    await this.findOne(agencyId, id);
    return this.prisma.creator.delete({ where: { id } });
  }
}
