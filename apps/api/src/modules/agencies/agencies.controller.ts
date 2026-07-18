import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { UpdateAgencyDto } from './dto/update-agency.dto';
import { CurrentUser } from '@/modules/auth/current-user.decorator';
import { CurrentUserContext } from '@/modules/auth/auth.types';
import { Roles } from '@/modules/auth/roles.decorator';
import { RolesGuard } from '@/modules/auth/roles.guard';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get('me')
  findOwn(@CurrentUser() user: CurrentUserContext) {
    return this.agenciesService.findOwn(user.agencyId);
  }

  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @Patch('me')
  updateOwn(@Body() dto: UpdateAgencyDto, @CurrentUser() user: CurrentUserContext) {
    return this.agenciesService.updateOwn(user.agencyId, dto);
  }
}
