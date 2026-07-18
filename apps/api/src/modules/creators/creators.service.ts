import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginationQueryDto, buildPaginationMeta } from '@/common/dto/pagination-query.dto';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';

@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  create(agencyId: string, dto: CreateCreatorDto) {
    return this.prisma.creator.create({ data: { ...dto, agencyId } });
  }

  async findAll(agencyId: string, pagination: PaginationQueryDto) {
    const where = { agencyId };
    const [data, total] = await Promise.all([
      this.prisma.creator.findMany({ where, skip: pagination.skip, take: pagination.take }),
      this.prisma.creator.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(pagination, total) };
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
