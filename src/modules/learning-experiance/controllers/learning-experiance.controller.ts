import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { LearningExperianceService } from '../services/learning-experiance.service';
import { CreateLearningExperianceDto } from '../dto/create-learning-experiance.dto';
import { GetExperienceFromDailyJournalDto } from '../dto/get-experience-from-daily-journal.dto';
import { UpdateLearningExperienceDto } from '../dto/update-learning-experience.dto';
import { User } from '../../users/schemas/user.schema';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';

@ApiTags('learning-experience')
@Controller('learning-experience')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class LearningExperianceController {
  constructor(private readonly learningExperianceService: LearningExperianceService) {}

  @Get('from-daily-journal')
  @ApiOperation({
    summary: 'Get Experience data from Daily Journal for Learning Experience',
    description: 'Extracts Experience section from published Daily Journals. Groups by date and returns Date, Question, Experience, and Grove Categories. Loads weekly data based on selected date (Mon-Fri of that week). Filters by date, campus, and room.',
  })
  @ApiResponse({
    status: 200,
    description: 'Experience data grouped by date from published Daily Journals',
  })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  getExperienceFromDailyJournal(
    @Query() queryParams: GetExperienceFromDailyJournalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.learningExperianceService.getExperienceFromDailyJournal(queryParams, currentUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get Learning Experience data from table',
    description: 'Gets Learning Experience entry from the database table based on date, campus, and room. Finds entry by weekBeginning calculated from the selected date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Learning Experience entry found or null if not found',
  })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  getLearningExperience(
    @Query() queryParams: GetExperienceFromDailyJournalDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.learningExperianceService.getLearningExperience(queryParams, currentUser);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new learning experience entry' })
  @ApiResponse({ status: 201, description: 'Learning experience entry created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  create(
    @Body() createLearningExperianceDto: CreateLearningExperianceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.learningExperianceService.create(createLearningExperianceDto, currentUser);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update Learning Experience entry by date, campus, and room',
    description: 'Updates Learning Experience entry from the database table. Finds or creates entry based on weekBeginning calculated from the selected date. Can update activities and weekBeginning.',
  })
  @ApiResponse({ status: 200, description: 'Learning Experience entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Campus or Room not found' })
  updateLearningExperience(
    @Body() updateDto: UpdateLearningExperienceDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.learningExperianceService.updateLearningExperience(updateDto, currentUser);
  }

  @Put(':id/activities')
  @ApiOperation({ 
    summary: 'Update activities for a learning experience entry by ID',
    description: 'Update activities (add, modify, or remove) for a specific week. Activities are grouped by date.'
  })
  @ApiParam({ name: 'id', description: 'Learning Experience entry ID' })
  @ApiResponse({ status: 200, description: 'Activities updated successfully' })
  @ApiResponse({ status: 404, description: 'Learning Experience entry not found' })
  updateActivities(
    @Param('id') id: string,
    @Body() body: { activities: any[] },
    @CurrentUser() currentUser: User,
  ) {
    return this.learningExperianceService.updateActivities(id, body.activities, currentUser);
  }
}

