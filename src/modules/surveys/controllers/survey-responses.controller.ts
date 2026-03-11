import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SurveyResponseDto } from '../dto/survey-responce.dto';
import { SurveyResponsesService } from '../services/survey-responses.service';
import { SurveyResponse } from '../schemas/survey-response.schema';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { User } from 'src/modules/users/schemas/user.schema';
import { Types } from 'mongoose';

@ApiTags('Survey Responses')
@Controller('survey-responses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class SurveyResponsesController {
  constructor(
    private readonly surveyResponsesService: SurveyResponsesService,
  ) {}

  @Get('check/:surveyId')
  @ApiOperation({ summary: 'Check if current user has submitted survey' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns submission status and details if exists',
    schema: {
      type: 'object',
      properties: {
        submitted: { type: 'boolean' },
        isCompleted: { type: 'boolean', nullable: true },
        submittedAt: { type: 'string', format: 'date-time', nullable: true },
        campusId: { type: 'string', nullable: true }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async checkIfSubmitted(
    @Param('surveyId') surveyId: string,
    @CurrentUser() user: User,
  ) {
    const userId = (user as any)._id.toString();
    const campuses = (user as any).campuses || [];
    return this.surveyResponsesService.hasUserSubmittedSurvey(
      userId, 
      surveyId, 
      campuses.map(id => new Types.ObjectId(id))
    );
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit survey response' })
  @ApiResponse({ status: 201, description: 'Survey response submitted successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found or not available' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  submit(
    @Body() dto: SurveyResponseDto,
    @CurrentUser() user: User,
  ): Promise<SurveyResponse> {
    const userId = (user as any)._id.toString();
    const userCampuses = (user as any).campuses || [];  
    return this.surveyResponsesService.submitResponse(userId, userCampuses, dto);
  }


  @Get('survey/:surveyId')
  @ApiOperation({ summary: 'List survey responses for a survey (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of survey responses' })
  @ApiResponse({ status: 400, description: 'Invalid surveyId or bad query params' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  listBySurvey(
    @Param('surveyId') surveyId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @CurrentUser() user: User,
  ) {
    const userCampuses = (user as any).campuses || [];
    return this.surveyResponsesService.listBySurvey(
      surveyId,
      Number(page) || 1,
      Number(limit) || 20,
      userCampuses.map((id: string) => new Types.ObjectId(id))
    );
  }

@Get(':id')
  @ApiOperation({ summary: 'Get survey response by ID' })
  @ApiResponse({ status: 200, description: 'Survey response fetched successfully' })
  @ApiResponse({ status: 404, description: 'Survey response not found' })
  getSurveyResponseById(@Param('id') id: string, @CurrentUser() user: User): Promise<SurveyResponse> {
    return this.surveyResponsesService.findOne(id, user as any);
  }
}
