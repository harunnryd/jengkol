import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: CurrentUserContext) {
    return this.campaignsService.create(user.agencyId, dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.campaignsService.findAll(user.agencyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.campaignsService.findOne(user.agencyId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.campaignsService.update(user.agencyId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.campaignsService.remove(user.agencyId, id);
  }
}
