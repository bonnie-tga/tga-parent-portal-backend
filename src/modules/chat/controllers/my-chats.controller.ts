import { Controller, Get, Query, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MyChatsService } from '../services/my-chats.service';
import { ChatMessageService } from '../services/chat-message.service';
import { QueryMyChatsDto } from '../dto/query-my-chats.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyChatsController {
  constructor(
    private readonly myChatsService: MyChatsService,
    private readonly chatMessageService: ChatMessageService,
  ) {}

  @Get('my-chats')
  @ApiOperation({ summary: 'Get current user\'s chats from all modules (parent-chat, account-chat, etc.)' })
  @ApiResponse({ status: 200, description: 'Return current user\'s chats from all modules' })
  async findMyChats(
    @Query() query: QueryMyChatsDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.myChatsService.findMyChats(query, currentUser);
  }

  @Get('total-unread-count')
  @ApiOperation({ summary: 'Get total unread message count across all chats' })
  @ApiResponse({ status: 200, description: 'Return total unread count and unread counts by chat' })
  async getTotalUnreadCount(
    @CurrentUser() currentUser: User,
  ) {
    return this.myChatsService.getTotalUnreadCount(currentUser);
  }

  @Delete('thread/:threadId/clear')
  @ApiOperation({ summary: 'Clear all messages in a thread' })
  @ApiResponse({ 
    status: 200, 
    description: 'All messages cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deletedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chat thread not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async clearThreadMessages(
    @Param('threadId') threadId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.chatMessageService.clearThreadMessages(threadId, currentUser);
  }
}
