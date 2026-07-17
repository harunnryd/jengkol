import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto } from './dto/create-agency.dto';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  create(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.create(dto);
  }

  @Get()
  findAll() {
    return this.agenciesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agenciesService.findOne(id);
  }
}
