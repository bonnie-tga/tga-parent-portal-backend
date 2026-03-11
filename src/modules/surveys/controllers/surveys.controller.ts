import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SurveysService } from '../services/surveys.service';
import { CreateSurveyDto } from '../dto/create-survey.dto';
import { UpdateSurveyDto } from '../dto/update-survey.dto';
import { QuerySurveyDto } from '../dto/query-survey.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { Survey } from '../schemas/survey.schema';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('Surveys')
@Controller('surveys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post('create')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Create a new survey' })
  @ApiResponse({ status: 201, description: 'Survey created successfully' })
  @HttpCode(HttpStatus.CREATED)
  @AutoFeed({ type: 'survey', action: 'create' })
  async create(
    @Body() dto: CreateSurveyDto,
    @CurrentUser() user: any,
  ): Promise<Survey> {
    return this.surveysService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List surveys with filters' })
  @ApiResponse({ status: 200, description: 'List of surveys returned' })
  list(@Query() query: QuerySurveyDto, @CurrentUser() user: any) {
    return this.surveysService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey fetched successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  get(@Param('id') id: string, @CurrentUser() user: User): Promise<Survey> {
    const userCampuses = (user as any).campuses || [];
    return this.surveysService.findOne(id, userCampuses);
  }

  @Patch(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Update survey' })
  @ApiResponse({ status: 200, description: 'Survey updated successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  @AutoFeed({ type: 'survey', action: 'update' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSurveyDto,
    @CurrentUser() user: any,
  ): Promise<Survey> {
    return this.surveysService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(
    UserRole.ADMINISTRATOR,
    UserRole.AREA_MANAGER,
    UserRole.DIRECTOR,
    UserRole.ASSISTANT_DIRECTOR,
    UserRole.EDUCATIONAL_LEADER,
    UserRole.CENTRE_LOGIN,
  )
  @ApiOperation({ summary: 'Soft delete survey' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  @AutoFeed({ type: 'survey', action: 'delete' })
  remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    return this.surveysService.remove(id, user);
  }
}
