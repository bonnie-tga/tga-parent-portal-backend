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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { BreakfastService } from '../services/breakfast.service';
import { CreateBreakfastDto } from '../dto/create-breakfast.dto';
import { QueryBreakfastDto } from '../dto/query-breakfast.dto';
import { User } from '../../users/schemas/user.schema';
import { UpdateBreakfastDto } from '../dto/update-breakfast.dto';
import { Breakfast } from '../schemas/breakfast.schema';
import { PaginatedResultDto } from '../../campus/dto/paginated-result.dto';
import { AutoFeed } from '../../auto-feed/auto-feed.decorator';

@ApiTags('breakfast')
@Controller('breakfast')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BreakfastController {
  constructor(private readonly breakfastService: BreakfastService) {}

  @Post()
  @ApiOperation({ summary: 'Create a breakfast record' })
  @ApiResponse({ status: 201, description: 'Record created successfully' })
  @AutoFeed({ type: 'breakfast', action: 'create' })
  create(@Body() dto: CreateBreakfastDto, @CurrentUser() user: User): Promise<Breakfast> {
    return this.breakfastService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List breakfast records (campus-scoped access)' })
  @ApiResponse({ status: 200, description: 'Return breakfast records' })
  findAll(
    @Query() query: QueryBreakfastDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<Breakfast>> {
    return this.breakfastService.findAll(query, user);
  }

  @Get('parent/my-children')
  @ApiOperation({ summary: 'Get breakfast records for parent user\'s children' })
  @ApiResponse({ status: 200, description: 'Return breakfast records for parent\'s children' })
  findForParent(
    @Query() query: QueryBreakfastDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResultDto<Breakfast>> {
    return this.breakfastService.findForParent(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a breakfast record by id' })
  @ApiResponse({ status: 200 })
  findOne(@Param('id') id: string, @CurrentUser() user: User): Promise<Breakfast> {
    return this.breakfastService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a breakfast record' })
  @ApiResponse({ status: 200, description: 'Record updated successfully' })
  @AutoFeed({ type: 'breakfast', action: 'update' })
  update(@Param('id') id: string, @Body() dto: UpdateBreakfastDto, @CurrentUser() user: User): Promise<Breakfast> {
    return this.breakfastService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a breakfast record' })
  @ApiResponse({ status: 200, description: 'Record deleted successfully' })
  @AutoFeed({ type: 'breakfast', action: 'delete' })
  async remove(@Param('id') id: string, @CurrentUser() user: User): Promise<{ success: true }> {
    await this.breakfastService.remove(id, user);
    return { success: true };
  }
}
