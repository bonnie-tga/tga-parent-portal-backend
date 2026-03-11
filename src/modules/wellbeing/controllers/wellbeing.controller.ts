import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { WellbeingService } from '../services/wellbeing.service';
import { CreateWellbeingDto } from '../dto/create-wellbeing.dto';
import { QueryWellbeingDto } from '../dto/query-wellbeing.dto';
import { Types } from 'mongoose';

@ApiTags('wellbeing')
@Controller('wellbeing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class WellbeingController {
  private readonly logger = new Logger(WellbeingController.name);

  constructor(private readonly wellbeingService: WellbeingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create wellbeing event (called by other modules)' })
  @ApiResponse({ status: 201, description: 'Wellbeing event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateWellbeingDto, @CurrentUser() user: User) {
    try {
      if (!dto.refId || !dto.childId) {
        throw new BadRequestException('refId and childId are required');
      }

      if (!Types.ObjectId.isValid(dto.refId.toString())) {
        throw new BadRequestException('Invalid refId format');
      }

      if (!Types.ObjectId.isValid(dto.childId.toString())) {
        throw new BadRequestException('Invalid childId format');
      }

      const result = await this.wellbeingService.create(
        dto.type,
        dto.refId.toString(),
        dto.childId.toString(),
        dto.payload,
        user._id.toString(),
        [],
        dto.notes,
      );

      this.logger.log(`Wellbeing event created by user ${user._id}: ${dto.type} for child ${dto.childId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create wellbeing event: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get activities summary for parent - latest by default or filtered by date/child/campus/type' })
  @ApiResponse({
    status: 200,
    description: 'Return latest activities for the child with most recent activity, or filtered activities',
    example: {
      'nappy-change': {
        id: '507f1f77bcf86cd799439011',
        childId: '6905155520c04d2a2e01d19a',
        payload: {
          slots: [
            { categories: ['wet', 'soiled'], doneTime: '8:45 AM', time: '8:30 AM' },
            { categories: ['dry'], doneTime: '10:15 AM', time: '10:00 AM' },
          ],
          totalCompleted: 2,
          lastCompleted: '10:15 AM',
        },
        createdAt: '2024-01-15T08:39:00.000Z',
      },
      'sleep-timer': {
        id: '507f1f77bcf86cd799439012',
        childId: '6905155520c04d2a2e01d19a',
        payload: { status: 'sleeping', startTime: '2024-01-15T14:00:00.000Z', cotRoom: 'Room 101' },
        createdAt: '2024-01-15T14:00:00.000Z',
      },
      'daily-chart': {
        id: '507f1f77bcf86cd799439013',
        childId: '6905155520c04d2a2e01d19a',
        payload: { mealType: 'lunch', status: 'completed', time: '12:30 PM' },
        createdAt: '2024-01-15T12:30:00.000Z',
      },
      'toilet-training': {
        id: '507f1f77bcf86cd799439014',
        childId: '6905155520c04d2a2e01d19a',
        payload: { result: 'success', location: 'toilet', time: '10:15 AM' },
        createdAt: '2024-01-15T10:15:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@CurrentUser() user: User, @Query() queryDto: QueryWellbeingDto): Promise<any> {
    try {
      if (queryDto?.childId && !Types.ObjectId.isValid(queryDto.childId)) {
        throw new BadRequestException('Invalid childId format');
      }

      if (queryDto?.campusId && !Types.ObjectId.isValid(queryDto.campusId)) {
        throw new BadRequestException('Invalid campusId format');
      }

      if (queryDto?.createdBy && !Types.ObjectId.isValid(queryDto.createdBy)) {
        throw new BadRequestException('Invalid createdBy format');
      }

      return this.wellbeingService.findAll(user, queryDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to find wellbeing activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar view with activity dots for parent (all children combined)' })
  @ApiQuery({ name: 'month', required: false, example: '2024-01', description: 'Month in YYYY-MM format' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['nappy-change', 'toilet-training', 'sleep-timer', 'daily-chart'],
    example: 'nappy-change',
    description: 'Filter by activity type. If not provided, returns all activity types',
  })
  @ApiResponse({
    status: 200,
    description: 'Return calendar data with active dates and timeline for all parent children',
    example: {
      month: '2024-01',
      activeDates: ['2024-01-15', '2024-01-16', '2024-01-18'],
      activitiesByDate: {
        '2024-01-15': ['nappy-change', 'sleep-timer'],
        '2024-01-16': ['toilet-training'],
      },
      timeline: [
        {
          id: '507f1f77bcf86cd799439011',
          type: 'nappy-change',
          date: '2024-01-15',
          time: '7:30 AM',
          childId: '6905155520c04d2a2e01d19a',
          childName: 'John Doe',
        },
      ],
      totalActivities: 5,
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid month format or type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCalendar(
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('type') type?: string,
  ) {
    try {
      if (month && !/^\d{4}-\d{2}$/.test(month)) {
        throw new BadRequestException('Invalid month format. Expected YYYY-MM');
      }

      if (type && !['nappy-change', 'toilet-training', 'sleep-timer', 'daily-chart'].includes(type)) {
        throw new BadRequestException('Invalid type. Must be one of: nappy-change, toilet-training, sleep-timer, daily-chart');
      }

      return this.wellbeingService.getCalendar(user, month, type);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get calendar: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get timeline view of activities for parent (all children)' })
  @ApiQuery({ name: 'startDate', required: false, example: '2024-01-01', description: 'Start date filter' })
  @ApiQuery({ name: 'endDate', required: false, example: '2024-01-31', description: 'End date filter' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Number of activities to return' })
  @ApiResponse({ status: 200, description: 'Return timeline activities with populated references' })
  @ApiResponse({ status: 400, description: 'Invalid date format or limit' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTimeline(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      if (startDate && isNaN(new Date(startDate).getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }

      if (limit !== undefined && (limit < 1 || limit > 100)) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      return this.wellbeingService.getTimeline(user, startDate, endDate, limit ? +limit : 20);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get timeline: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get activities for specific date for parent (all children)' })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15', description: 'Date in YYYY-MM-DD format' })
  @ApiResponse({ status: 200, description: 'Return activities for the specified date' })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActivitiesByDate(@CurrentUser() user: User, @Query('date') date: string) {
    try {
      if (!date) {
        throw new BadRequestException('Date parameter is required');
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      const testDate = new Date(`${date}T00:00:00.000Z`);
      if (isNaN(testDate.getTime())) {
        throw new BadRequestException('Invalid date value');
      }

      return this.wellbeingService.getActivitiesByDate(user, date);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get activities by date: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('sleep-details')
  @ApiOperation({ summary: 'Get sleep timer details for all children with total sleeping time calculation' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2024-01-15',
    description: 'Date in YYYY-MM-DD format. If not provided, returns current date data by default',
  })
  @ApiResponse({
    status: 200,
    description: 'Return sleep details for all children',
    example: [
      {
        child: {
          _id: '6905155520c04d2a2e01d19a',
          fullName: 'John Doe',
        },
        status: 'awake',
        totalSleepingTime: 125,
        totalSleepingTimeFormatted: '2h 5m',
        startSleepTime: '2024-01-15T14:00:00.000Z',
        endSleepTime: '2024-01-15T16:05:00.000Z',
      },
    ],
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChildrenSleepDetails(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    try {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      if (date) {
        const testDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(testDate.getTime())) {
          throw new BadRequestException('Invalid date value');
        }
      }

      return this.wellbeingService.getChildrenSleepDetails(user, date);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children sleep details: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('toilet-training-details')
  @ApiOperation({ summary: 'Get toilet training details for all children' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2024-01-15',
    description: 'Date in YYYY-MM-DD format. If not provided, returns current date data by default',
  })
  @ApiResponse({
    status: 200,
    description: 'Return toilet training details for all children',
    example: [
      {
        child: {
          _id: '6905155520c04d2a2e01d19a',
          fullName: 'John Doe',
        },
        slots: [
          {
            doneTime: '8:45 AM',
            categories: ['toilet_wet'],
            staff: {
              _id: '507f1f77bcf86cd799439011',
              firstName: 'Jane',
              lastName: 'Smith',
            },
            comments: 'Successfully used toilet',
          },
        ],
      },
    ],
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChildrenToiletTrainingDetails(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    try {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      if (date) {
        const testDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(testDate.getTime())) {
          throw new BadRequestException('Invalid date value');
        }
      }

      return this.wellbeingService.getChildrenToiletTrainingDetails(user, date);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children toilet training details: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('nappy-change-details')
  @ApiOperation({ summary: 'Get nappy change details for all children' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2024-01-15',
    description: 'Date in YYYY-MM-DD format. If not provided, returns current date data by default',
  })
  @ApiResponse({
    status: 200,
    description: 'Return nappy change details for all children',
    example: [
      {
        child: {
          _id: '6905155520c04d2a2e01d19a',
          fullName: 'John Doe',
        },
        slots: [
          {
            doneTime: '8:45 AM',
            categories: ['wet', 'soiled'],
            staff: {
              _id: '507f1f77bcf86cd799439011',
              firstName: 'Jane',
              lastName: 'Smith',
            },
            time: '8:30 AM',
            refId: {
              _id: '507f1f77bcf86cd799439014',
              date: '2024-01-15T00:00:00.000Z',
            },
          },
        ],
      },
    ],
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChildrenNappyChangeDetails(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    try {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      if (date) {
        const testDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(testDate.getTime())) {
          throw new BadRequestException('Invalid date value');
        }
      }

      return this.wellbeingService.getChildrenNappyChangeDetails(user, date);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children nappy change details: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('daily-chart-details')
  @ApiOperation({ summary: 'Get daily chart details for all children' })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2024-01-15',
    description: 'Date in YYYY-MM-DD format. If not provided, returns current date data by default',
  })
  @ApiResponse({
    status: 200,
    description: 'Return daily chart details for all children',
    example: [
      {
        child: {
          _id: '6905155520c04d2a2e01d19a',
          fullName: 'John Doe',
        },
        date: '2025-11-25',
        categories: [
          {
            category: 'morning_tea',
            time: '8:30 AM',
            dailyChartItems: [
              {
                child: '6905155520c04d2a2e01d19a',
                tea_lunch: 'half',
                fruit_quantity: 'little',
                water_options: '1/4 Cup',
                comments: 'Ate well',
                bottles: [],
              },
            ],
          },
          {
            category: 'lunch',
            time: '11:00 AM',
            dailyChartItems: [
              {
                child: '6905155520c04d2a2e01d19a',
                tea_lunch: 'one',
                fruit_quantity: 'two_slices',
                water_options: '1/2 Cup',
                comments: 'Finished meal',
                bottles: [],
              },
            ],
          },
        ],
        childrenBottles: [
          {
            child: '6905155520c04d2a2e01d19a',
            bottles: [
              {
                amount: ['50 ml'],
                time: '09:35',
              },
            ],
          },
        ],
      },
    ],
  })
  @ApiResponse({ status: 400, description: 'Invalid date format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChildrenDailyChartDetails(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    try {
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      if (date) {
        const testDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(testDate.getTime())) {
          throw new BadRequestException('Invalid date value');
        }
      }

      return this.wellbeingService.getChildrenDailyChartDetails(user, date);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to get children daily chart details: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('child/:childId')
  @ApiOperation({
    summary: 'Get activities for a specific child by date and type (defaults to current date if date not provided)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    example: '2024-01-15',
    description: 'Date in YYYY-MM-DD format. If not provided, returns current date activities',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['nappy-change', 'toilet-training', 'sleep-timer', 'daily-chart'],
    example: 'nappy-change',
    description: 'Filter by activity type. If not provided, returns all activity types',
  })
  @ApiResponse({
    status: 200,
    description: 'Return activities for the specified child, date, and type',
    example: [
      {
        _id: '507f1f77bcf86cd799439011',
        childId: { _id: '6905155520c04d2a2e01d19a', fullName: 'John Doe' },
        type: 'nappy-change',
        payload: { slots: [{ categories: ['wet'], doneTime: '8:45 AM', time: '8:30 AM' }] },
        createdAt: '2024-01-15T08:39:00.000Z',
        refId: { _id: '507f1f77bcf86cd799439012', date: '2024-01-15T00:00:00.000Z' },
        createdBy: { _id: '507f1f77bcf86cd799439013', firstName: 'Jane', lastName: 'Smith' },
      },
    ],
  })
  @ApiResponse({ status: 400, description: 'Invalid childId, date format, or type' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getActivitiesByChildIdAndDate(
    @CurrentUser() user: User,
    @Param('childId') childId: string,
    @Query('date') date?: string,
    @Query('type') type?: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(childId)) {
        throw new BadRequestException('Invalid childId format');
      }

      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }

      if (date) {
        const testDate = new Date(`${date}T00:00:00.000Z`);
        if (isNaN(testDate.getTime())) {
          throw new BadRequestException('Invalid date value');
        }
      }

      if (type && !['nappy-change', 'toilet-training', 'sleep-timer', 'daily-chart'].includes(type)) {
        throw new BadRequestException('Invalid type. Must be one of: nappy-change, toilet-training, sleep-timer, daily-chart');
      }

      return this.wellbeingService.getActivitiesByChildIdAndDate(user, childId, date, type);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Failed to get activities for child ${childId} on date ${date || 'current'} with type ${type || 'all'}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wellbeing event by ID' })
  @ApiResponse({ status: 200, description: 'Return wellbeing event details' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wellbeing event not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid wellbeing ID format');
      }

      return this.wellbeingService.findOne(id, user);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to find wellbeing event ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update wellbeing event payload/notes' })
  @ApiResponse({ status: 200, description: 'Wellbeing event updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format or request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wellbeing event not found' })
  async update(@Param('id') id: string, @Body() updateData: { payload?: Record<string, any>; notes?: string }) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid wellbeing ID format');
      }

      if (!updateData || (updateData.payload === undefined && updateData.notes === undefined)) {
        throw new BadRequestException('At least one field (payload or notes) must be provided');
      }

      const result = await this.wellbeingService.update(id, updateData.payload, updateData.notes);
      this.logger.log(`Wellbeing event updated: ${id}`);
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update wellbeing event ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete wellbeing event' })
  @ApiResponse({ status: 200, description: 'Wellbeing event deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ID format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wellbeing event not found' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid wellbeing ID format');
      }

      await this.wellbeingService.remove(id);
      this.logger.log(`Wellbeing event deleted: ${id}`);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to delete wellbeing event ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }
}
