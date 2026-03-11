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
import { SchoolReadinessChecklistService } from '../services/school-readiness-checklist.service';
import { CreateSchoolReadinessChecklistDto } from '../dto/create-school-readiness-checklist.dto';
import { UpdateSchoolReadinessChecklistDto } from '../dto/update-school-readiness-checklist.dto';
import { QuerySchoolReadinessChecklistDto } from '../dto/query-school-readiness-checklist.dto';
import { SchoolReadinessChecklist } from '../schemas/school-readiness-checklist.schema';

@ApiTags('school-readiness-checklist')
@Controller('school-readiness-checklist')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class SchoolReadinessChecklistController {
  constructor(
    private readonly schoolReadinessChecklistService: SchoolReadinessChecklistService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new school readiness checklist' })
  @ApiResponse({ status: 201, description: 'School readiness checklist created successfully' })
  create(
    @Body() dto: CreateSchoolReadinessChecklistDto,
    @CurrentUser() currentUser: User,
  ): Promise<SchoolReadinessChecklist> {
    return this.schoolReadinessChecklistService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all school readiness checklists' })
  @ApiResponse({ status: 200, description: 'Return all school readiness checklists' })
  findAll(@Query() query: QuerySchoolReadinessChecklistDto): Promise<SchoolReadinessChecklist[]> {
    return this.schoolReadinessChecklistService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school readiness checklist by ID' })
  @ApiResponse({ status: 200, description: 'Return the school readiness checklist' })
  @ApiResponse({ status: 404, description: 'School readiness checklist not found' })
  findOne(@Param('id') id: string): Promise<SchoolReadinessChecklist> {
    return this.schoolReadinessChecklistService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a school readiness checklist' })
  @ApiResponse({ status: 200, description: 'School readiness checklist updated successfully' })
  @ApiResponse({ status: 404, description: 'School readiness checklist not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolReadinessChecklistDto,
    @CurrentUser() currentUser: User,
  ): Promise<SchoolReadinessChecklist> {
    return this.schoolReadinessChecklistService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a school readiness checklist' })
  @ApiResponse({ status: 200, description: 'School readiness checklist deleted successfully' })
  @ApiResponse({ status: 404, description: 'School readiness checklist not found' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.schoolReadinessChecklistService.remove(id);
    return { success: true };
  }
}


