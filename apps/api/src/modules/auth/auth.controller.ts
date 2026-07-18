import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CurrentUser } from './current-user.decorator';
import { CurrentUserContext } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @Post('invite')
  invite(@Body() dto: InviteMemberDto, @CurrentUser() user: CurrentUserContext) {
    return this.authService.inviteMember(dto, user);
  }
}
