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
import { TransferNoticeService } from '../services/transfer-notice.service';
import { CreateTransferNoticeDto } from '../dto/create-transfer-notice.dto';
import { UpdateTransferNoticeDto } from '../dto/update-transfer-notice.dto';
import { QueryTransferNoticeDto } from '../dto/query-transfer-notice.dto';
import { TransferNotice } from '../schemas/transfer-notice.schema';

@ApiTags('transfer-notice')
@Controller('transfer-notice')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class TransferNoticeController {
  constructor(
    private readonly transferNoticeService: TransferNoticeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a transfer notice request' })
  @ApiResponse({
    status: 201,
    description: 'Transfer notice request created successfully',
  })
  create(
    @Body() dto: CreateTransferNoticeDto,
    @CurrentUser() currentUser: User,
  ): Promise<TransferNotice> {
    return this.transferNoticeService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get transfer notice requests' })
  @ApiResponse({
    status: 200,
    description: 'Return transfer notice requests',
  })
  findAll(
    @Query() query: QueryTransferNoticeDto,
  ): Promise<TransferNotice[]> {
    return this.transferNoticeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transfer notice request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return transfer notice request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<TransferNotice> {
    return this.transferNoticeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update transfer notice request' })
  @ApiResponse({
    status: 200,
    description: 'Transfer notice request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTransferNoticeDto,
  ): Promise<TransferNotice> {
    return this.transferNoticeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transfer notice request' })
  @ApiResponse({
    status: 200,
    description: 'Transfer notice request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Transfer notice not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.transferNoticeService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for transfer notice' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for transfer notice records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.transferNoticeService.findArchiveMonths();
  }
}

