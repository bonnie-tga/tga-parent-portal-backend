import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommentsService } from './comments.service';
import { Comment } from '../schemas/comment.schema';
import { Like } from '../schemas/like.schema';
import { CommentThreadSeen } from '../schemas/comment-thread-seen.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { Event } from '../../event/schema/event.schema';
import { DailyJournal } from '../../daily-journal/schemas/daily-journal.schema';
import { YearReport } from '../../year-report/schemas/year-report.schema';
import { Notification } from '../../notifications/schemas/notification.schema';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { AnnouncementService } from '../../announcements/services/announcement.service';

const mockStaffUser = {
  _id: new Types.ObjectId(),
  role: UserRole.STAFF,
  campuses: [new Types.ObjectId()],
} as unknown as User;

function mockFindChain(ret: unknown[]) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(ret),
  };
  return chain;
}

describe('CommentsService', () => {
  let service: CommentsService;
  let commentModel: { find: jest.Mock; countDocuments: jest.Mock; aggregate: jest.Mock };
  let threadSeenModel: { findOneAndUpdate: jest.Mock };

  beforeEach(async () => {
    const findChain = mockFindChain([]);
    commentModel = {
      find: jest.fn().mockReturnValue(findChain),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
    };
    threadSeenModel = { findOneAndUpdate: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken(Comment.name), useValue: commentModel },
        { provide: getModelToken(Like.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        { provide: getModelToken(Event.name), useValue: {} },
        { provide: getModelToken(DailyJournal.name), useValue: {} },
        { provide: getModelToken(YearReport.name), useValue: {} },
        { provide: getModelToken(Notification.name), useValue: {} },
        { provide: getModelToken(CommentThreadSeen.name), useValue: threadSeenModel },
        { provide: NotificationsService, useValue: {} },
        { provide: AnnouncementService, useValue: {} },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('markThreadSeen updates thread seen state', async () => {
    const aid = new Types.ObjectId().toString();
    await service.markThreadSeen(aid, 'announcement', mockStaffUser);
    expect(threadSeenModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        announcementId: expect.any(Types.ObjectId),
        entityType: 'announcement',
        userId: mockStaffUser._id,
      }),
      expect.objectContaining({ $set: expect.objectContaining({ lastSeenAt: expect.any(Date) }) }),
      { upsert: true, new: true },
    );
  });

  it('getCommentStats returns newCount for staff', async () => {
    const stats = await service.getCommentStats(undefined, mockStaffUser);
    expect(stats).toHaveProperty('newCount');
    expect(typeof stats.newCount).toBe('number');
  });

  it('getCommentsForDashboard with onlyNew calls aggregate and filters', async () => {
    commentModel.aggregate.mockResolvedValue([
      { _id: { announcementId: new Types.ObjectId(), entityType: 'announcement', parentId: new Types.ObjectId() } },
    ]);
    commentModel.countDocuments.mockResolvedValue(1);
    const result = await service.getCommentsForDashboard(
      { page: 1, limit: 20, onlyNew: true },
      mockStaffUser,
    );
    expect(commentModel.aggregate).toHaveBeenCalled();
    expect(result.comments).toBeDefined();
    expect(result.total).toBeDefined();
  });
});
