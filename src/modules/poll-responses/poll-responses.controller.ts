import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PollResponsesService } from './poll-responses.service';
import { SubmitPollResponseDto } from './dto/submit-response.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../auth/decorators/api-bearer-auth.decorator';
import { User } from '../users/schemas/user.schema';

@ApiTags('Poll Responses')
@Controller('poll-responses')
@UseGuards(JwtAuthGuard)
@ApiSecurityAuth()
export class PollResponsesController {
  constructor(
    private readonly pollResponsesService: PollResponsesService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Submit or update a poll response',
    description: 'Creates a new response or updates existing one. Supports multiple calls to update choices or comments. Send empty array for selectedChoiceLabels to delete response.'
  })
  @ApiResponse({ status: 201, description: 'Response submitted/updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Poll not found' })
  submit(@CurrentUser() user: User, @Body() dto: SubmitPollResponseDto) {
    const userId = (user as any)._id.toString();
    const userCampuses = (user as any).campuses || [];
    return this.pollResponsesService.submit(userId, userCampuses, dto);
  }

  @Get('my-responses')
  @ApiOperation({ summary: 'Get all my poll responses' })
  @ApiResponse({ status: 200, description: 'Returns all user poll responses' })
  allMyResponses(@CurrentUser() user: User) {
    const userId = (user as any)._id.toString();
    return this.pollResponsesService.getAllMyResponses(userId);
  }

  @Get('mine/:pollId')
  @ApiOperation({ summary: 'Get my responses for a specific poll' })
  @ApiResponse({ status: 200, description: 'Returns user responses' })
  myResponses(@CurrentUser() user: User, @Param('pollId') pollId: string) {
    const userId = (user as any)._id.toString();
    return this.pollResponsesService.getMyResponses(userId, pollId);
  }

  @Get('stats/:pollId')
  @ApiOperation({ summary: 'Get poll statistics' })
  @ApiResponse({ status: 200, description: 'Returns poll statistics' })
  stats(@CurrentUser() user: User, @Param('pollId') pollId: string) {
    const userId = (user as any)._id?.toString();
    return this.pollResponsesService.getPollStats(pollId, userId);
  }

  @Get('by-campus/:pollId')
  @ApiOperation({
    summary: 'Get responses filtered by campus (Admin/Staff only)',
  })
  @ApiResponse({ status: 200, description: 'Returns campus responses' })
  byCampus(
    @CurrentUser() user: User,
    @Param('pollId') pollId: string,
    @Query('campusId') campusId: string,
  ) {
    return this.pollResponsesService.getResponsesByCampus(pollId, campusId, user as any);
  }

  @Get('aggregated/:pollId/:questionId')
  @ApiOperation({ summary: 'Get aggregated statistics for a question' })
  @ApiResponse({ status: 200, description: 'Returns aggregated stats' })
  aggregated(
    @Param('pollId') pollId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.pollResponsesService.getAggregatedStats(pollId, questionId);
  }
}

