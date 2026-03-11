import { Injectable } from '@nestjs/common';
import { PollsService } from './polls.service';
import { FeedService } from '../feed/feed.service';
import { CreatePollWithFeedDto } from './dto/poll-with-feed.dto';
import { Poll } from './schemas/poll.schema';

/**
 * Extended polls service that automatically creates feed items
 * This is a convenience wrapper around PollsService and FeedService
 */
@Injectable()
export class PollsWithFeedService {
  constructor(
    private readonly pollsService: PollsService,
    private readonly feedService: FeedService,
  ) {}

  async createPollWithFeed(
    dto: CreatePollWithFeedDto,
    userId: string,
  ): Promise<{ poll: Poll; feedItemId?: string }> {
    // Create the poll first
    const poll = await this.pollsService.create(dto, userId);

    // Create feed item if requested (default: true)
    if (dto.createFeedItem !== false) {
      const feedItem = await this.feedService.create(
        {
          type: 'poll',
          refId: (poll as any)._id.toString(),
          title: poll.title,
          description:
            dto.feedDescription ||
            `New poll: ${poll.title}. Share your opinion!`,
          isForAllCampuses: poll.isForAllCampuses,
          campuses: poll.campuses.map((id) => id.toString()),
          visibleFrom: poll.pollDate?.toISOString(),
          visibleUntil: undefined,
          isPinned: dto.pinFeedItem || false,
        },
        userId,
      );

      return {
        poll,
        feedItemId: (feedItem as any)._id.toString(),
      };
    }

    return { poll };
  }

  async archivePollAndFeed(pollId: string): Promise<void> {
    // Archive the poll
    await this.pollsService.archive(pollId);

    // Find and archive associated feed item
    const feedItems = await this.feedService['feedItemModel']
      .find({
        type: 'poll',
        refId: pollId,
        isDeleted: false,
      })
      .lean();

    for (const feedItem of feedItems) {
      await this.feedService.archive(feedItem._id.toString());
    }
  }
}

