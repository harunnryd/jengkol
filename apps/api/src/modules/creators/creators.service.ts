import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCreatorDto) {
    return this.prisma.creator.create({ data: dto });
  }

  findAll(agencyId?: string) {
    return this.prisma.creator.findMany({
      where: agencyId ? { agencyId } : undefined,
    });
  }

  async findOne(id: string) {
    const creator = await this.prisma.creator.findUnique({ where: { id } });
    if (!creator) {
      throw new NotFoundException(`Creator ${id} not found`);
    }
    return creator;
  }

  async update(id: string, dto: UpdateCreatorDto) {
    await this.findOne(id);
    return this.prisma.creator.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.creator.delete({ where: { id } });
  }
}
