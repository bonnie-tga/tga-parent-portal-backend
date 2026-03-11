import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Poll, PollDocument } from '../../modules/polls/schemas/poll.schema';
import { FeedItem, FeedItemDocument } from '../../modules/feed/schemas/feed-item.schema';

@Injectable()
export class PollsSeeder {
  constructor(
    @InjectModel(Poll.name) private pollModel: Model<PollDocument>,
    @InjectModel(FeedItem.name) private feedItemModel: Model<FeedItemDocument>,
  ) {}

  async seed(campusIds: Types.ObjectId[], adminUserId: Types.ObjectId) {
    console.log('Seeding polls...');

    // Clear existing polls and feed items
    await this.pollModel.deleteMany({});
    await this.feedItemModel.deleteMany({ type: 'poll' });

    // Sample Poll 1: Single-select, all campuses
    const poll1 = await this.pollModel.create({
      title: 'Preferred Communication Method',
      isForAllCampuses: true,
      campuses: [],
      startsAt: new Date('2024-01-01'),
      endsAt: new Date('2024-12-31'),
      isMultipleSelect: false,
      isCommentEnabled: true,
      status: 'active',
      createdBy: adminUserId,
      questions: [
        {
          text: 'How would you prefer to receive updates from the school?',
          choices: [
            { label: 'Email', count: 0, isActive: true },
            { label: 'SMS', count: 0, isActive: true },
            { label: 'App Notifications', count: 0, isActive: true },
            { label: 'Phone Call', count: 0, isActive: true },
          ],
          isActive: true,
        },
      ],
    });

    // Create feed item for poll1
    await this.feedItemModel.create({
      type: 'poll',
      refId: poll1._id,
      title: poll1.title,
      description: 'Help us improve communication by sharing your preference',
      isForAllCampuses: true,
      campuses: [],
      createdBy: adminUserId,
      status: 'active',
      isPinned: true,
    });

    // Sample Poll 2: Multi-select, specific campuses
    const poll2 = await this.pollModel.create({
      title: 'After-School Activities Interest',
      isForAllCampuses: false,
      campuses: campusIds.slice(0, 2), // First 2 campuses
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isMultipleSelect: true,
      isCommentEnabled: true,
      status: 'active',
      createdBy: adminUserId,
      questions: [
        {
          text: 'Which after-school activities would your child be interested in?',
          choices: [
            { label: 'Sports (Soccer, Basketball)', count: 0, isActive: true },
            { label: 'Arts & Crafts', count: 0, isActive: true },
            { label: 'Music Lessons', count: 0, isActive: true },
            { label: 'Drama Club', count: 0, isActive: true },
            { label: 'Coding & Robotics', count: 0, isActive: true },
            { label: 'Language Classes', count: 0, isActive: true },
          ],
          isActive: true,
        },
        {
          text: 'What time would work best for after-school activities?',
          choices: [
            { label: '3:00 PM - 4:00 PM', count: 0, isActive: true },
            { label: '4:00 PM - 5:00 PM', count: 0, isActive: true },
            { label: '5:00 PM - 6:00 PM', count: 0, isActive: true },
          ],
          isActive: true,
        },
      ],
    });

    await this.feedItemModel.create({
      type: 'poll',
      refId: poll2._id,
      title: poll2.title,
      description: 'Help us plan engaging after-school programs for your children',
      isForAllCampuses: false,
      campuses: campusIds.slice(0, 2),
      createdBy: adminUserId,
      status: 'active',
      isPinned: false,
    });

    // Sample Poll 3: Feedback survey, no time limit
    const poll3 = await this.pollModel.create({
      title: 'Parent Portal Feedback',
      isForAllCampuses: true,
      campuses: [],
      isMultipleSelect: false,
      isCommentEnabled: true,
      status: 'active',
      createdBy: adminUserId,
      questions: [
        {
          text: 'How satisfied are you with the Parent Portal?',
          choices: [
            { label: 'Very Satisfied', count: 0, isActive: true },
            { label: 'Satisfied', count: 0, isActive: true },
            { label: 'Neutral', count: 0, isActive: true },
            { label: 'Dissatisfied', count: 0, isActive: true },
            { label: 'Very Dissatisfied', count: 0, isActive: true },
          ],
          isActive: true,
        },
        {
          text: 'How easy is it to navigate the portal?',
          choices: [
            { label: 'Very Easy', count: 0, isActive: true },
            { label: 'Easy', count: 0, isActive: true },
            { label: 'Moderate', count: 0, isActive: true },
            { label: 'Difficult', count: 0, isActive: true },
            { label: 'Very Difficult', count: 0, isActive: true },
          ],
          isActive: true,
        },
      ],
    });

    await this.feedItemModel.create({
      type: 'poll',
      refId: poll3._id,
      title: poll3.title,
      description: 'Share your experience to help us improve the portal',
      isForAllCampuses: true,
      campuses: [],
      createdBy: adminUserId,
      status: 'active',
      isPinned: false,
    });

    // Sample Poll 4: Draft poll (not visible)
    await this.pollModel.create({
      title: 'Upcoming School Event Planning',
      isForAllCampuses: true,
      campuses: [],
      isMultipleSelect: true,
      isCommentEnabled: false,
      status: 'draft',
      createdBy: adminUserId,
      questions: [
        {
          text: 'Which events would you like to see this year?',
          choices: [
            { label: 'Science Fair', count: 0, isActive: true },
            { label: 'Sports Day', count: 0, isActive: true },
            { label: 'Cultural Festival', count: 0, isActive: true },
            { label: 'Music Concert', count: 0, isActive: true },
          ],
          isActive: true,
        },
      ],
    });

    console.log('✅ Polls seeded successfully');
    console.log(`   - Created ${await this.pollModel.countDocuments()} polls`);
    console.log(`   - Created ${await this.feedItemModel.countDocuments({ type: 'poll' })} feed items`);
  }
}

