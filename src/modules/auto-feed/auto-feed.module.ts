import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { FeedModule } from '../feed/feed.module';
import { AutoFeedInterceptor } from './auto-feed.interceptor';
import { FeedOrchestrator } from './feed.orchestrator';
import { ModelMapper } from './model.mapper';

@Module({
  imports: [FeedModule],
  providers: [
    ModelMapper,
    FeedOrchestrator,
    { provide: APP_INTERCEPTOR, useClass: AutoFeedInterceptor },
  ],
  exports: [FeedOrchestrator],
})
export class AutoFeedModule {}


