import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AUTO_FEED_KEY, AutoFeedOptions } from './auto-feed.decorator';
import { FeedOrchestrator } from './feed.orchestrator';

@Injectable()
export class AutoFeedInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private orchestrator: FeedOrchestrator) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AutoFeedOptions | undefined>(AUTO_FEED_KEY, ctx.getHandler());
    if (!meta) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const userId = String(req.user?._id || req.user?.id || '');

    return next.handle().pipe(
      tap((result) => {
        void this.orchestrator
          .process({
            options: meta,
            result,
            userId,
            method: req.method,
          })
          .catch((e) => console.error('[AutoFeed] failed:', e));
      }),
    );
  }
}


