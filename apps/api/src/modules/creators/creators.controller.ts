import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatorsService } from './creators.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Post()
  create(@Body() dto: CreateCreatorDto, @CurrentUser() user: CurrentUserContext) {
    return this.creatorsService.create(user.agencyId, dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationQueryDto, @CurrentUser() user: CurrentUserContext) {
    return this.creatorsService.findAll(user.agencyId, pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.creatorsService.findOne(user.agencyId, id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCreatorDto,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.creatorsService.update(user.agencyId, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserContext) {
    return this.creatorsService.remove(user.agencyId, id);
  }
}
