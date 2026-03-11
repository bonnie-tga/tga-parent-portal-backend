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
import { AbcBehaviourObservationService } from '../services/abc-behaviour-observation.service';
import { CreateAbcBehaviourObservationDto } from '../dto/create-abc-behaviour-observation.dto';
import { UpdateAbcBehaviourObservationDto } from '../dto/update-abc-behaviour-observation.dto';
import { QueryAbcBehaviourObservationDto } from '../dto/query-abc-behaviour-observation.dto';
import { AbcBehaviourObservation } from '../schemas/abc-behaviour-observation.schema';

@ApiTags('abc-behaviour-observation')
@Controller('abc-behaviour-observation')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class AbcBehaviourObservationController {
  constructor(
    private readonly abcBehaviourObservationService: AbcBehaviourObservationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new ABC behaviour observation' })
  @ApiResponse({
    status: 201,
    description: 'ABC behaviour observation created successfully',
  })
  create(
    @Body() dto: CreateAbcBehaviourObservationDto,
    @CurrentUser() currentUser: User,
  ): Promise<AbcBehaviourObservation> {
    return this.abcBehaviourObservationService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ABC behaviour observations' })
  @ApiResponse({
    status: 200,
    description: 'Return all ABC behaviour observations',
  })
  findAll(
    @Query() query: QueryAbcBehaviourObservationDto,
  ): Promise<AbcBehaviourObservation[]> {
    return this.abcBehaviourObservationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an ABC behaviour observation by ID' })
  @ApiResponse({ status: 200, description: 'Return the ABC behaviour observation' })
  @ApiResponse({ status: 404, description: 'ABC behaviour observation not found' })
  findOne(@Param('id') id: string): Promise<AbcBehaviourObservation> {
    return this.abcBehaviourObservationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an ABC behaviour observation' })
  @ApiResponse({
    status: 200,
    description: 'ABC behaviour observation updated successfully',
  })
  @ApiResponse({ status: 404, description: 'ABC behaviour observation not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAbcBehaviourObservationDto,
    @CurrentUser() currentUser: User,
  ): Promise<AbcBehaviourObservation> {
    return this.abcBehaviourObservationService.update(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an ABC behaviour observation' })
  @ApiResponse({
    status: 200,
    description: 'ABC behaviour observation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'ABC behaviour observation not found' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.abcBehaviourObservationService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for ABC behaviour observations' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for ABC behaviour observations',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.abcBehaviourObservationService.findArchiveMonths();
  }
}


