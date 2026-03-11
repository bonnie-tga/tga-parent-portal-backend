import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeedService } from './feed.service';
import { CreateFeedItemDto } from './dto/create-feed-item.dto';
import { QueryFeedDto } from './dto/query-feed.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../auth/decorators/api-bearer-auth.decorator';
import { User } from '../users/schemas/user.schema';
import { Child } from '../children/schemas/child.schema';
import { Announcement, AnnouncementType, AnnouncementStatus } from '../announcements/schemas/announcement.schema';
import { Event } from '../event/schema/event.schema';
import { isAdministrator } from 'src/common/access/access-filter.util';

@ApiTags('Feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiSecurityAuth()
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    @InjectModel(Child.name) private childModel: Model<Child>,
    @InjectModel(Announcement.name) private announcementModel: Model<Announcement>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a feed item (Admin/Staff only)' })
  @ApiResponse({ status: 201, description: 'Feed item created successfully' })
  create(@Body() createFeedItemDto: CreateFeedItemDto, @CurrentUser() user: User) {
    return this.feedService.create(createFeedItemDto, (user as any)._id.toString());
  }

  @Get('months')
  @ApiOperation({ 
    summary: 'Get all months that have data for a specific type in a year',
    description: 'Returns array of month names where feed items exist for the given type in the specified year. Query params: type (required), year (required, format: YYYY)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns array of month names (e.g., ["January", "February", "September"])',
    type: [String],
  })
  async getMonthsByTypeAndYear(
    @Query('type') type: string,
    @Query('year') year: string,
    @CurrentUser() user: User,
  ) {
    const userCampuses = (user as any).campuses || [];
    return this.feedService.getMonthsByTypeAndYear(
      type,
      year,
      userCampuses.map((c: any) => new Types.ObjectId(c)),
      user,
    );
  }

  @Get('dates')
  @ApiOperation({ 
    summary: 'Get dates that have feed items for a specific type in a month',
    description: 'Returns array of dates (YYYY-MM-DD format) that have feed items for the given type in the specified month. Query params: type (required), month (required, format: YYYY-MM)'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns array of dates in YYYY-MM-DD format',
    type: [String],
  })
  async getDatesByTypeAndMonth(
    @Query('type') type: string,
    @Query('month') month: string,
    @CurrentUser() user: User,
  ) {
    const userCampuses = (user as any).campuses || [];
    return this.feedService.getDatesByTypeAndMonth(
      type,
      month,
      userCampuses.map((c: any) => new Types.ObjectId(c)),
      user,
    );
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get feed for current user',
    description: 'Supports filtering by specific child or all children. Returns feed items with visible children info, latest announcements, and upcoming events.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns structured feed data with feed items, latest announcements, and upcoming events' 
  })
  async list(@CurrentUser() user: User, @Query() queryDto: QueryFeedDto) {
    const userCampuses = (user as any).campuses || [];
    let targetCampuses: Types.ObjectId[] = userCampuses;
    let allUserChildren: any[] = [];

    // Get user's children for parent role
    if ((user as any).role === 'parent' && (user as any).children?.length) {
      allUserChildren = await this.childModel
        .find({
          _id: { $in: (user as any).children },
          // isArchived: false,
        })
        .select('_id fullName campus room')
        .lean()
        .exec();

      // If specific child selected
      if (queryDto.childId) {
        const selectedChild = allUserChildren.find(
          (c) => c._id.toString() === queryDto.childId,
        );

        if (selectedChild) {
          targetCampuses = [selectedChild.campus];
          queryDto.selectedChild = selectedChild;
          // Pass single child as array for visibleChildren
          queryDto.selectedChildren = [selectedChild];
        } else {
          // Invalid childId, return empty
          return {
            feedItems: [],
            latestAnnouncements: [],
            upcomingEvents: [],
          };
        }
      } else {
        // "All children" mode - combine all unique campuses
        const childCampuses = allUserChildren.map((c) => c.campus);
        const uniqueCampuses = [
          ...new Set([
            ...userCampuses.map((id) => id.toString()),
            ...childCampuses.map((id) => id.toString()),
          ]),
        ].map((id) => new Types.ObjectId(id));

        targetCampuses = uniqueCampuses;
        queryDto.selectedChildren = allUserChildren;
      }
    }

    // Get user's children rooms for room-based filtering (deduplicate)
    let targetRooms: Types.ObjectId[] = [];
    if ((user as any).role === 'parent' && allUserChildren.length > 0) {
      const roomIds = allUserChildren.map((c: any) => c.room?.toString()).filter(Boolean);
      const uniqueRoomIds = [...new Set(roomIds)];
      targetRooms = uniqueRoomIds.map((id) => new Types.ObjectId(id));
    }

    // Get feed items
    const feedItems = await this.feedService.listForUser(targetCampuses, queryDto, user, targetRooms);

    // Build common announcement filter for campus targeting
    const now = new Date();
    const announcementBaseFilter: any = {
      status: AnnouncementStatus.PUBLISHED,
      isDeleted: false,
      isActive: true,
      $and: [
        { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
      ],
    };

    // Campus targeting for announcements
    const admin = isAdministrator(user as any);
    if (targetCampuses && targetCampuses.length > 0) {
      announcementBaseFilter.$or = [
        { scope: 'all' },
        { campuses: { $in: targetCampuses } },
      ];
    } else if (!admin) {
      // Non-admin without campuses: only ALL-scoped announcements
      announcementBaseFilter.scope = 'all';
    }

    const eventBaseFilter: any = {
      status: 'Published',
      isDeleted: false,
      startDate: { $gte: now },
    };
    if (targetCampuses && targetCampuses.length > 0) {
      eventBaseFilter.$or = [
        { campus: { $in: targetCampuses } },
        { campus: { $exists: false } },
        { campus: { $size: 0 } },
      ];
    } else if (!admin) {
      eventBaseFilter.$or = [
        { campus: { $exists: false } },
        { campus: { $size: 0 } },
      ];
    }

    const [latestAnnouncements, upcomingEvents] = await Promise.all([
      this.announcementModel
        .find({
          ...announcementBaseFilter,
          type: AnnouncementType.ANNOUNCEMENT,
        })
        .sort({ publishDate: -1, createdAt: -1 })
        .limit(3)
        .select('title shortDescription content featuredImage publishDate createdAt campuses scope')
        .populate('campuses', 'name')
        .lean()
        .exec(),
      this.eventModel
        .find(eventBaseFilter)
        .sort({ startDate: 1 })
        .limit(5)
        .select('title shortDescription content bannerUrl startDate endDate createdAt campus')
        .populate('campus', 'name')
        .lean()
        .exec(),
    ]);

    return {
      feedItems,
      latestAnnouncements,
      upcomingEvents,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single feed item by ID' })
  @ApiResponse({ status: 200, description: 'Returns feed item details' })
  @ApiResponse({ status: 404, description: 'Feed item not found' })
  get(@Param('id') id: string, @CurrentUser() user: User) {
    const userCampuses = (user as any).campuses || [];
    return this.feedService.findOne(id, userCampuses);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a feed item (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Feed item updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateFeedItemDto>,
  ) {
    return this.feedService.update(id, updateDto);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a feed item (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Feed item archived successfully' })
  archive(@Param('id') id: string) {
    return this.feedService.archive(id);
  }

  @Patch(':id/toggle-pin')
  @ApiOperation({ summary: 'Toggle pin status (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Pin status toggled successfully' })
  togglePin(@Param('id') id: string) {
    return this.feedService.togglePin(id);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment view count' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  incrementView(@Param('id') id: string) {
    return this.feedService.incrementViewCount(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a feed item (Admin/Staff only)' })
  @ApiResponse({ status: 200, description: 'Feed item deleted successfully' })
  remove(@Param('id') id: string) {
    return this.feedService.remove(id);
  }
}

