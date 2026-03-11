import { SetMetadata } from '@nestjs/common';

export type AutoFeedAction = 'create' | 'update' | 'delete' | 'archive';
export interface AutoFeedOptions {
  type:
    | 'announcement'
    | 'event'
    | 'poll'
    | 'survey'
    | 'daily-journal'
    | 'breakfast'
    | 'grove-curriculum'
    | 'year-report'
    | 'learning-journey'
  action?: AutoFeedAction;
}

export const AUTO_FEED_KEY = 'autoFeed';
export const AutoFeed = (options: AutoFeedOptions) => SetMetadata(AUTO_FEED_KEY, options);


