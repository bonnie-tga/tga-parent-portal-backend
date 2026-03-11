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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { DailyJournalService } from '../services/dailyjournal.service';
import { UserRole } from '../../users/schemas/user.schema';
import { CreateDailyJournalDto } from '../dto/create-dailyjournal.dto';
import { QueryDailyJournalDto } from '../dto/query-dailyjournal.dto';
import { User } from '../../users/schemas/user.schema';
import { UpdateDailyJournalDto } from '../dto/update-dailyjournal.dto';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('daily-journal')
@Controller('daily-journal')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DailyJournalController {
  constructor(private readonly dailyJournalService: DailyJournalService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new daily journal entry' })
  @ApiResponse({ status: 201, description: 'Daily journal entry created successfully' })
  @AutoFeed({ type: 'daily-journal', action: 'create' })
  create(
    @Body() createDailyJournalDto: CreateDailyJournalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.dailyJournalService.create(createDailyJournalDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all daily journal entries with filtering' })
  @ApiResponse({ status: 200, description: 'Return filtered daily journal entries' })
  findAll(
    @Query() queryParams: QueryDailyJournalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.dailyJournalService.findAll(queryParams, currentUser);
  }


  @Get(':id')
  @ApiOperation({ summary: 'Get a daily journal entry by ID' })
  @ApiResponse({ status: 200, description: 'Return the daily journal entry' })
  @ApiResponse({ status: 404, description: 'Daily journal entry not found' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyJournalService.findOne(id, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a daily journal entry' })
  @ApiResponse({ status: 200, description: 'Daily journal entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Daily journal entry not found' })
  @AutoFeed({ type: 'daily-journal', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() updateDailyJournalDto: UpdateDailyJournalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.dailyJournalService.update(id, updateDailyJournalDto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a daily journal entry' })
  @ApiResponse({ status: 200, description: 'Daily journal entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Daily journal entry not found' })
  @AutoFeed({ type: 'daily-journal', action: 'delete' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.dailyJournalService.remove(id, currentUser);
  }

  @Get(':id/likes')
  @ApiOperation({ summary: 'Get like and comment count for a daily journal' })
  @ApiResponse({ status: 200, description: 'Like and comment count retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Daily journal not found' })
  async getLikeCount(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const journal = await this.dailyJournalService.findOne(id, currentUser);
    return { 
      dailyJournalId: id, 
      likeCount: journal.likesCount || 0,
      commentCount: journal.commentsCount || 0 
    };
  }
}
