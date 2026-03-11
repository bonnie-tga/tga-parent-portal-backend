import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ApiSecurityAuth } from '../../auth/decorators/api-bearer-auth.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';
import { LittleAboutMeService } from '../services/little-about-me.service';
import { CreateLittleAboutMeDto } from '../dto/create-little-about-me.dto';
import { LittleAboutMe } from '../schemas/little-about-me.schema';
import { QueryLittleAboutMeDto } from '../dto/query-little-about-me.dto';
import { UpdateLittleAboutMeDto } from '../dto/update-little-about-me.dto';
import { SignLittleAboutMeDto } from '../dto/sign-little-about-me.dto';

@ApiTags('little-about-me')
@Controller('little-about-me')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class LittleAboutMeController {
  constructor(
    private readonly littleAboutMeService: LittleAboutMeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or update Little About Me form for a child' })
  @ApiResponse({
    status: 200,
    description: 'Form saved successfully',
  })
  save(
    @Body() dto: CreateLittleAboutMeDto,
    @CurrentUser() currentUser: User,
  ): Promise<LittleAboutMe> {
    return this.littleAboutMeService.save(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get Little About Me entries' })
  @ApiResponse({
    status: 200,
    description: 'Return Little About Me entries',
  })
  findAll(
    @Query() query: QueryLittleAboutMeDto,
  ): Promise<LittleAboutMe[]> {
    return this.littleAboutMeService.findAll(query);
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for Little About Me entries' })
  @ApiResponse({
    status: 200,
    description: 'Return unique year-month combinations for Little About Me entries',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.littleAboutMeService.findArchiveMonths();
  }

  @Get('child/:childId')
  @ApiOperation({ summary: 'Get Little About Me history for a child' })
  @ApiResponse({
    status: 200,
    description: 'Return all Little About Me submissions for the child',
  })
  findByChild(
    @Param('childId') childId: string,
  ): Promise<LittleAboutMe[]> {
    return this.littleAboutMeService.findByChild(childId);
  }

  @Get('child/:childId/latest')
  @ApiOperation({ summary: 'Get latest Little About Me entry for a child (for form population)' })
  @ApiResponse({
    status: 200,
    description: 'Return latest Little About Me entry for the child',
  })
  findLatestByChild(
    @Param('childId') childId: string,
  ): Promise<LittleAboutMe | null> {
    return this.littleAboutMeService.findLatestByChild(childId);
  }

  @Get('child/:childId/history')
  @ApiOperation({ summary: 'Get update history for a child' })
  @ApiResponse({
    status: 200,
    description: 'Return history of all updates for the child',
  })
  findHistoryByChild(
    @Param('childId') childId: string,
  ) {
    return this.littleAboutMeService.findHistoryByChild(childId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get update history for a specific entry' })
  @ApiResponse({
    status: 200,
    description: 'Return history of all updates for the entry',
  })
  findHistoryByEntryId(
    @Param('id') id: string,
  ) {
    return this.littleAboutMeService.findHistoryByEntryId(id);
  }

  @Get('history/:historyId')
  @ApiOperation({ summary: 'Get a specific history entry by history ID' })
  @ApiResponse({
    status: 200,
    description: 'Return history entry',
  })
  @ApiResponse({ status: 404, description: 'History entry not found' })
  findHistoryById(
    @Param('historyId') historyId: string,
  ) {
    return this.littleAboutMeService.findHistoryById(historyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Little About Me entry by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return Little About Me entry',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<LittleAboutMe> {
    return this.littleAboutMeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Little About Me entry' })
  @ApiResponse({
    status: 200,
    description: 'Little About Me entry updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLittleAboutMeDto,
    @CurrentUser() currentUser: User,
  ): Promise<LittleAboutMe> {
    return this.littleAboutMeService.update(id, dto, currentUser);
  }

  @Post(':id/sign')
  @ApiOperation({ summary: 'Sign Little About Me entry (staff and/or parent signatures)' })
  @ApiResponse({
    status: 200,
    description: 'Signatures saved successfully',
  })
  @ApiResponse({ status: 404, description: 'Little About Me entry not found' })
  sign(
    @Param('id') id: string,
    @Body() dto: SignLittleAboutMeDto,
    @CurrentUser() currentUser: User,
  ): Promise<LittleAboutMe> {
    return this.littleAboutMeService.sign(id, dto, currentUser);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Little About Me entry' })
  @ApiResponse({
    status: 200,
    description: 'Little About Me entry deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Little About Me entry not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.littleAboutMeService.remove(id);
    return { success: true };
  }
}