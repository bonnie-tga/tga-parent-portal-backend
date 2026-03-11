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
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { HandoverService } from '../services/handover.service';
import { CreateHandoverDto } from '../dto/create-handover.dto';
import { UpdateHandoverDto } from '../dto/update-handover.dto';
import { QueryHandoverDto } from '../dto/query-handover.dto';
import { Handover } from '../schemas/handover.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
// import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('handover')
@Controller('handover')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class HandoverController {
  constructor(private readonly service: HandoverService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new handover record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  // @AutoFeed({ type: 'handover', action: 'create' })
  create(@Body() dto: CreateHandoverDto, @CurrentUser() user: User): Promise<Handover> {
    return this.service.create(dto, String(user._id), user);
  }

  @Get()
  @ApiOperation({ summary: 'List handover records with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Return paginated handover records' })
  findAll(
    @Query() query: QueryHandoverDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<Handover>> {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a handover record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<Handover> {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a handover record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  // @AutoFeed({ type: 'handover', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateHandoverDto, @CurrentUser() user: User): Promise<Handover> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a handover record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  // @AutoFeed({ type: 'handover', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.service.remove(id, user);
    return { success: true };
  }
}


