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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';
import { LearningJourneyService } from '../services/learning-journey.service';
import { CreateLearningJourneyDto } from '../dto/create-learning-journey.dto';
import { UpdateLearningJourneyDto } from '../dto/update-learning-journey.dto';
import { QueryLearningJourneyDto } from '../dto/query-learning-journey.dto';
import { LearningJourney } from '../schemas/learning-journey.schema';
import { LearningJourneyDailyJournalQueryDto } from '../dto/learning-journey-dailyjournal-query.dto';

@ApiTags('learning-journey')
@Controller('learning-journey')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class LearningJourneyController {
  constructor(private readonly learningJourneyService: LearningJourneyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new learning journey' })
  @ApiResponse({ status: 201, description: 'Learning journey created successfully' })
  @AutoFeed({ type: 'learning-journey', action: 'create' })
  create(
    @Body() dto: CreateLearningJourneyDto,
    @CurrentUser() currentUser: User,
  ): Promise<LearningJourney> {
    return this.learningJourneyService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all learning journeys' })
  @ApiResponse({ status: 200, description: 'Return all learning journeys' })
  findAll(@Query() query: QueryLearningJourneyDto): Promise<LearningJourney[]> {
    return this.learningJourneyService.findAll(query);
  }
  
  @Get('daily-journal')
  @ApiOperation({
    summary:
      'Load Individual Learning (photos + learning text) from Daily Journal for a month range',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns any Individual Learning from Daily Journal for the selected months where the child is tagged.',
  })
  getFromDailyJournal(
    @Query() query: LearningJourneyDailyJournalQueryDto,
    @CurrentUser() currentUser: User,
  ): Promise<{
    individualLearning: { date?: Date; photos?: string[]; learning?: string }[];
  }> {
    return this.learningJourneyService.findDailyJournalLearningsByMonth(query, currentUser);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for learning journeys' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for learning journeys',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.learningJourneyService.findArchiveMonths();
  }

  @Get('previous-strength')
  @ApiOperation({
    summary:
      'Load Previous Strength from latest Learning Journey, or from Wellness Plan Additional Strengths if no previous journey exists',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns previous strength text and whether it came from a previous learning journey or from the wellness plan.',
  })
  getPreviousStrength(
    @Query('campus') campusId: string,
    @Query('room') roomId: string,
    @Query('children') childId: string,
    @Query('date') date?: string,
  ): Promise<{
    source: 'learningJourney' | 'wellnessPlan' | 'none';
    previousStrength: string | null;
  }> {
    return this.learningJourneyService.findPreviousStrength(campusId, roomId, childId, date);
  }

  @Get('goal-evaluations/pending')
  @ApiOperation({ summary: 'Get pending goal evaluations by child ID' })
  @ApiResponse({
    status: 200,
    description: 'Return list of pending goal evaluations for the child',
  })
  getPendingGoalEvaluations(
    @Query('childId') childId: string,
  ): Promise<Array<{
    goal: string;
    evaluation: string;
    complete: false;
  }>> {
    return this.learningJourneyService.getPendingGoalsByChild(childId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a learning journey by ID' })
  @ApiResponse({ status: 200, description: 'Return the learning journey' })
  @ApiResponse({ status: 404, description: 'Learning journey not found' })
  findOne(@Param('id') id: string): Promise<LearningJourney> {
    return this.learningJourneyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a learning journey' })
  @ApiResponse({ status: 200, description: 'Learning journey updated successfully' })
  @ApiResponse({ status: 404, description: 'Learning journey not found' })
  @AutoFeed({ type: 'learning-journey', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLearningJourneyDto,
    @CurrentUser() currentUser: User,
  ): Promise<LearningJourney> {
    return this.learningJourneyService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a learning journey' })
  @ApiResponse({ status: 200, description: 'Learning journey deleted successfully' })
  @ApiResponse({ status: 404, description: 'Learning journey not found' })
  @AutoFeed({ type: 'learning-journey', action: 'delete' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.learningJourneyService.remove(id);
    return { success: true };
  }
}


