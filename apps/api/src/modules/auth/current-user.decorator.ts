import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserContext } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
