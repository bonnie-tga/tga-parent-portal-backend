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
import { WithdrawalNoticeService } from '../services/withdrawal-notice.service';
import { CreateWithdrawalNoticeDto } from '../dto/create-withdrawal-notice.dto';
import { UpdateWithdrawalNoticeDto } from '../dto/update-withdrawal-notice.dto';
import { QueryWithdrawalNoticeDto } from '../dto/query-withdrawal-notice.dto';
import { WithdrawalNotice } from '../schemas/withdrawal-notice.schema';

@ApiTags('withdrawal-notice')
@Controller('withdrawal-notice')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiSecurityAuth()
export class WithdrawalNoticeController {
  constructor(
    private readonly withdrawalNoticeService: WithdrawalNoticeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a withdrawal notice request' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal notice request created successfully',
  })
  create(
    @Body() dto: CreateWithdrawalNoticeDto,
    @CurrentUser() currentUser: User,
  ): Promise<WithdrawalNotice> {
    return this.withdrawalNoticeService.create(dto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Get withdrawal notice requests' })
  @ApiResponse({
    status: 200,
    description: 'Return withdrawal notice requests',
  })
  findAll(
    @Query() query: QueryWithdrawalNoticeDto,
  ): Promise<WithdrawalNotice[]> {
    return this.withdrawalNoticeService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal notice request by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return withdrawal notice request',
  })
  findOne(
    @Param('id') id: string,
  ): Promise<WithdrawalNotice> {
    return this.withdrawalNoticeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update withdrawal notice request' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal notice request updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWithdrawalNoticeDto,
  ): Promise<WithdrawalNotice> {
    return this.withdrawalNoticeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete withdrawal notice request' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal notice request deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal notice not found' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    await this.withdrawalNoticeService.remove(id);
    return { success: true };
  }

  @Get('archive/months')
  @ApiOperation({ summary: 'Get archive months for withdrawal notice' })
  @ApiResponse({
    status: 200,
    description:
      'Return unique year-month combinations for withdrawal notice records',
  })
  findArchiveMonths(): Promise<{ value: string; label: string }[]> {
    return this.withdrawalNoticeService.findArchiveMonths();
  }
}




