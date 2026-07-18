import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaginationQueryDto, buildPaginationMeta } from '@/common/dto/pagination-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  create(agencyId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({ data: { ...dto, agencyId } });
  }

  async findAll(agencyId: string, pagination: PaginationQueryDto) {
    const where = { agencyId };
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip: pagination.skip, take: pagination.take }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, meta: buildPaginationMeta(pagination, total) };
  }

  async findOne(agencyId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, agencyId } });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async update(agencyId: string, id: string, dto: UpdateCampaignDto) {
    await this.findOne(agencyId, id);
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(agencyId: string, id: string) {
    await this.findOne(agencyId, id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}
