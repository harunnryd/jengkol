import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const started = process.hrtime.bigint();

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
        this.logger.log(`${method} ${url} ${elapsedMs.toFixed(1)}ms`);
      }),
    );
  }
}
