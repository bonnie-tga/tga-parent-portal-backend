import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from '../services/messages.service';
import { CreateMessageDto } from '../dto/create-message.dto';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { QueryConversationsDto } from '../dto/query-conversations.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/schemas/user.schema';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @Body() createConversationDto: CreateConversationDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.messagesService.createConversation(createConversationDto, currentUser);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  @ApiResponse({ status: 200, description: 'Return all conversations' })
  async getConversations(
    @Query() queryParams: QueryConversationsDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.messagesService.getConversations(queryParams, currentUser);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation by ID' })
  @ApiResponse({ status: 200, description: 'Return the conversation' })
  async getConversationById(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.messagesService.getConversationById(id, currentUser);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.messagesService.createMessage(createMessageDto, currentUser);
  }

  @Get('by-conversation/:conversationId')
  @ApiOperation({ summary: 'Get all messages in a conversation' })
  @ApiResponse({ status: 200, description: 'Return all messages' })
  async getMessagesByConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.messagesService.getMessagesByConversation(conversationId, currentUser);
  }

  @Patch('mark-read/:conversationId')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markMessagesAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: User,
  ) {
    await this.messagesService.markMessagesAsRead(conversationId, currentUser);
    return { success: true };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread messages for the current user' })
  @ApiResponse({ status: 200, description: 'Return unread message counts' })
  async getUnreadMessageCount(@CurrentUser() currentUser: User) {
    return this.messagesService.getUnreadMessageCount(currentUser);
  }
}
