import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { ChatThread } from '../schemas/chat-thread.schema';
import { ChatMessage, ChatAttachmentType } from '../schemas/chat-message.schema';
import { ParentChat } from '../../parent-chat/schemas/parent-chat.schema';
import { AccountChat } from '../../account-chat/schemas/account-chat.schema';
import { ManagementChat } from '../../management-chat/schemas/management-chat.schema';
import { ChatMessageService } from '../services/chat-message.service';
import { checkChatThreadAccess, checkChatStatusForParent } from '../utils/chat-access.util';
import { ChatAttachmentDto } from '../dto/create-chat-message.dto';

interface AuthenticatedSocket extends Socket {
  user?: User;
  userId?: string;
  joinedRooms?: Set<string>;
  lastPing?: number;
}

interface UserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen: Date;
}

interface MessageAck {
  users: Set<string>;
  createdAt: number;
}

/**
 * Chat Gateway - Real-time Socket.IO communication
 *
 * Architecture:
 * - Attachments: Uploaded via REST API (POST /api/chat-messages/upload-media)
 * - Socket: Only used for real-time events (messages, typing, presence, etc.)
 * - File uploads: NOT supported via socket (security & performance)
 *
 * Missed Messages Sync:
 * - On reconnect, frontend should fetch missed messages via REST API:
 *   GET /api/chat-messages?threadId={id}&page=1&limit=50
 * - Frontend can track last received message timestamp and request messages after that timestamp
 * - Alternative: Future socket event 'sync-messages' can be implemented if needed
 *
 * Security:
 * - JWT token accepted only from Authorization header or handshake.auth.token
 * - Query params NOT used for tokens (prevents leakage in logs/proxies)
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
  maxHttpBufferSize: 5 * 1024 * 1024, // 5MB - socket event payload limit (no file uploads via socket)
  pingInterval: 25000, // 25 seconds
  pingTimeout: 60000, // 60 seconds
  transports: ['websocket', 'polling'],
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userPresence = new Map<string, UserPresence>();
  private readonly userSockets = new Map<string, Set<string>>();
  private readonly typingUsers = new Map<string, Set<string>>();
  private readonly messageAcks = new Map<string, MessageAck>();
  private readonly threadRoomUsers = new Map<string, Set<string>>();
  private readonly MAX_CONNECTIONS_PER_USER = 5;
  private readonly GRACE_PERIOD_MS = 30000; // 30 seconds grace period for reconnects
  private readonly RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
  private readonly RATE_LIMIT_MAX = 100; // Max 100 messages per window
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute window

  private mapThreadTypeToChatType(threadType: string): 'parent-chat' | 'account-chat' | 'management-chat' | 'team-chat' | 'staff-chat' {
    const typeMap: Record<string, 'parent-chat' | 'account-chat' | 'management-chat' | 'team-chat' | 'staff-chat'> = {
      PARENT: 'parent-chat',
      ACCOUNT: 'account-chat',
      MANAGEMENT: 'management-chat',
      TEAM: 'team-chat',
      STAFF: 'staff-chat',
    };
    return typeMap[threadType] || 'parent-chat';
  }

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(ChatThread.name) private chatThreadModel: Model<ChatThread>,
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessage>,
    @InjectModel(ParentChat.name) private parentChatModel: Model<ParentChat>,
    @InjectModel(AccountChat.name) private accountChatModel: Model<AccountChat>,
    @InjectModel(ManagementChat.name) private managementChatModel: Model<ManagementChat>,
    private chatMessageService: ChatMessageService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const authenticated = await this.authenticateClient(client);
      if (!authenticated) {
        return;
      }

      const userId = client.user._id.toString();

      // Check max connections per user
      const userSocketCount = this.userSockets.get(userId)?.size || 0;
      if (userSocketCount >= this.MAX_CONNECTIONS_PER_USER) {
        this.logger.warn(`User ${userId} exceeded max connections (${this.MAX_CONNECTIONS_PER_USER})`);
        client.emit('error', { message: 'Maximum connections limit reached. Please close other sessions.' });
        client.disconnect();
        return;
      }

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
      client.userId = userId;
      client.joinedRooms = new Set();
      client.lastPing = Date.now();

      // Update presence - only emit online status if this is the first socket for this user
      const sockets = this.userSockets.get(userId);
      const isFirstSocket = !sockets || sockets.size === 1;
      
      if (isFirstSocket) {
        this.updateUserPresence(userId, true);
        this.broadcastUserStatus(userId, true);
      } else {
        // Update presence silently for additional sockets
        this.updateUserPresence(userId, true);
      }

      // Setup ping handler
      client.on('ping', () => {
        client.lastPing = Date.now();
        client.emit('pong');
      });

      // Emit connection success
      client.emit('authenticated', {
        userId,
        message: 'Connection authenticated successfully',
      });

      this.logger.log(`Client connected: ${client.user.firstName} ${client.user.lastName} (${client.user.role}) - Socket: ${client.id}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        client.emit('force-logout', { message: 'Authentication failed. Please login again.' });
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (!client.user || !client.userId) {
      return;
    }

    const userId = client.userId;

    // Remove socket from tracking
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Cleanup typing indicators
    this.cleanupTypingIndicators(userId, client);

    // Cleanup message acknowledgments
    this.cleanupMessageAcks();

    // Remove user from thread rooms
    if (client.joinedRooms) {
      for (const roomName of client.joinedRooms) {
        const roomUsers = this.threadRoomUsers.get(roomName);
        if (roomUsers) {
          roomUsers.delete(userId);
          if (roomUsers.size === 0) {
            this.threadRoomUsers.delete(roomName);
          }
        }
      }
    }

    // Schedule presence update with grace period (offline broadcast only after grace period)
    this.schedulePresenceUpdate(userId);

    this.logger.log(`Client disconnected: ${client.user.firstName} ${client.user.lastName} - Socket: ${client.id}`);
  }

  @SubscribeMessage('join-thread')
  async handleJoinThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string },
  ) {
    if (!client.user || !client.userId) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const thread = await this.chatThreadModel.findById(payload.threadId).exec();
      if (!thread || thread.isDeleted) {
        client.emit('error', { message: 'Chat thread not found' });
        return;
      }

      checkChatThreadAccess(thread, client.user);
      await checkChatStatusForParent(thread, client.user, this.parentChatModel, this.accountChatModel, this.managementChatModel);

      const roomName = payload.threadId;

      // Prevent duplicate joins
      if (client.joinedRooms?.has(roomName)) {
        client.emit('joined-thread', { threadId: payload.threadId, alreadyJoined: true });
        return;
      }

      await client.join(roomName);
      client.joinedRooms?.add(roomName);

      const userId = client.user._id.toString();
      if (!this.threadRoomUsers.has(roomName)) {
        this.threadRoomUsers.set(roomName, new Set());
      }
      this.threadRoomUsers.get(roomName).add(userId);

      this.logger.log(`User ${client.user.firstName} joined thread ${payload.threadId}`);
      client.emit('joined-thread', { threadId: payload.threadId });
    } catch (error) {
      this.logger.error('Join thread error:', error);
      client.emit('error', { message: error.message || 'Failed to join thread' });
    }
  }

  @SubscribeMessage('leave-thread')
  async handleLeaveThread(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string },
  ) {
    if (!client.user || !client.userId) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      const roomName = payload.threadId;
      const userId = client.user._id.toString();

      // Remove user from thread room users tracking
      if (this.threadRoomUsers.has(roomName)) {
        this.threadRoomUsers.get(roomName).delete(userId);
        // Clean up empty sets
        if (this.threadRoomUsers.get(roomName).size === 0) {
          this.threadRoomUsers.delete(roomName);
        }
      }

      // Leave socket room
      await client.leave(roomName);
      client.joinedRooms?.delete(roomName);

      this.logger.log(`User ${client.user.firstName} left thread ${payload.threadId}`);
      client.emit('left-thread', { threadId: payload.threadId });
    } catch (error) {
      this.logger.error('Leave thread error:', error);
      client.emit('error', { message: error.message || 'Failed to leave thread' });
    }
  }

  @SubscribeMessage('restore-sessions')
  async handleRestoreSessions(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadIds?: string[] },
  ) {
    if (!client.user || !client.userId) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    try {
      // Re-authenticate on reconnect
      const authenticated = await this.authenticateClient(client);
      if (!authenticated) {
        return;
      }

      const restoredRooms: string[] = [];

      if (payload.threadIds && Array.isArray(payload.threadIds)) {
        for (const threadId of payload.threadIds) {
          try {
            const thread = await this.chatThreadModel.findById(threadId).exec();
            if (thread && !thread.isDeleted) {
              checkChatThreadAccess(thread, client.user);
              await checkChatStatusForParent(thread, client.user, this.parentChatModel);

              const roomName = threadId;
              if (!client.joinedRooms?.has(roomName)) {
                await client.join(roomName);
                client.joinedRooms?.add(roomName);
                restoredRooms.push(threadId);

                const userId = client.user._id.toString();
                if (!this.threadRoomUsers.has(roomName)) {
                  this.threadRoomUsers.set(roomName, new Set());
                }
                this.threadRoomUsers.get(roomName).add(userId);

                // Emit joined-thread event for consistency (frontend expects this event)
                client.emit('joined-thread', { threadId, restored: true });
              }
            }
          } catch (error) {
            this.logger.warn(`Failed to restore thread ${threadId}: ${error.message}`);
          }
        }
      }

      // Emit sessions-restored event with summary
      client.emit('sessions-restored', { threadIds: restoredRooms });
      this.logger.log(`User ${client.user.firstName} restored ${restoredRooms.length} sessions`);
    } catch (error) {
      this.logger.error('Restore sessions error:', error);
      client.emit('error', { message: error.message || 'Failed to restore sessions' });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: {
      threadId: string;
      message: string;
      messageId?: string;
      attachments?: Array<{
        url: string;
        type: string;
        name?: string;
        size?: number;
        mimeType?: string;
      }>;
    },
  ) {
    if (!client.user || !client.userId) {
      client.emit('error', { message: 'Authentication required' });
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(client.userId)) {
      client.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
      return;
    }

    // Validate: User must join thread before sending messages
    if (!client.joinedRooms?.has(payload.threadId)) {
      client.emit('error', { message: 'You must join the thread before sending messages. Use join-thread event first.' });
      return;
    }

    try {
      // Convert attachments to proper format with enum type
      const attachments: ChatAttachmentDto[] = payload.attachments
        ? payload.attachments.map((att) => ({
            url: att.url,
            type: att.type as ChatAttachmentType,
            name: att.name,
            size: att.size,
            mimeType: att.mimeType,
          }))
        : [];

      const thread = await this.chatThreadModel.findById(payload.threadId).exec();
      if (!thread || thread.isDeleted) {
        client.emit('error', { message: 'Chat thread not found' });
        return;
      }

      const message = await this.chatMessageService.create(
        {
          threadId: payload.threadId,
          message: payload.message,
          attachments,
        },
        client.user,
      );

      const roomName = payload.threadId;
      const messageObj = typeof message.toObject === 'function' ? message.toObject() : message;
      const messageWithAck = {
        ...messageObj,
        _ackId: payload.messageId || message._id.toString(),
      };

      // Track message for acknowledgment
      if (payload.messageId) {
        this.messageAcks.set(payload.messageId, {
          users: new Set(),
          createdAt: Date.now(),
        });
      }

      // Automatically mark message as read for all users currently in the thread room
      const roomUsers = this.threadRoomUsers.get(roomName);
      const senderUserId = client.user._id.toString();
      
      if (roomUsers && roomUsers.size > 0) {
        const userIdsToMarkRead = Array.from(roomUsers).filter(userId => userId !== senderUserId);
        
        if (userIdsToMarkRead.length > 0) {
          await this.chatMessageModel.updateOne(
            { _id: message._id },
            { $addToSet: { readBy: { $each: userIdsToMarkRead.map(id => new Types.ObjectId(id)) } } },
          );
        }
      }

      // Broadcast message
      this.server.to(roomName).emit('new-message', messageWithAck);

      // Send acknowledgment to sender
      if (payload.messageId) {
        client.emit('message-ack', {
          messageId: payload.messageId,
          serverMessageId: message._id.toString(),
          status: 'delivered',
        });
      }

      this.logger.log(
        `Message sent in thread ${payload.threadId} by ${client.user.firstName}${attachments.length ? ` with ${attachments.length} attachment(s)` : ''}`,
      );
    } catch (error) {
      this.logger.error('Send message error:', error);
      client.emit('error', { message: error.message || 'Failed to send message' });
      if (payload.messageId) {
        client.emit('message-ack', {
          messageId: payload.messageId,
          status: 'failed',
          error: error.message,
        });
      }
    }
  }

  @SubscribeMessage('message-ack')
  async handleMessageAck(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; status: 'read' | 'delivered' },
  ) {
    if (!client.user || !client.userId) {
      return;
    }

    const messageAck = this.messageAcks.get(payload.messageId);
    if (messageAck) {
      messageAck.users.add(client.userId);
      this.logger.debug(`Message ${payload.messageId} acknowledged by ${client.userId}`);
    }
  }

  @SubscribeMessage('typing-start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string },
  ) {
    if (!client.user || !client.userId) {
      return;
    }

    const roomName = payload.threadId;
    if (!this.typingUsers.has(roomName)) {
      this.typingUsers.set(roomName, new Set());
    }
    this.typingUsers.get(roomName).add(client.userId);

    client.to(roomName).emit('user-typing', {
      threadId: payload.threadId,
      userId: client.userId,
      userName: `${client.user.firstName} ${client.user.lastName}`,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing-stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { threadId: string },
  ) {
    if (!client.user || !client.userId) {
      return;
    }

    const roomName = payload.threadId;
    const typingSet = this.typingUsers.get(roomName);
    if (typingSet) {
      typingSet.delete(client.userId);
      if (typingSet.size === 0) {
        this.typingUsers.delete(roomName);
      }
    }

    client.to(roomName).emit('user-typing', {
      threadId: payload.threadId,
      userId: client.userId,
      userName: `${client.user.firstName} ${client.user.lastName}`,
      isTyping: false,
    });
  }

  private async authenticateClient(client: AuthenticatedSocket): Promise<boolean> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('No token provided');
      client.emit('error', { message: 'Authentication token required' });
      client.disconnect();
      return false;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET') || this.configService.get<string>('jwt.secret'),
      });

      const user = await this.userModel.findById(payload.sub).exec();
      if (!user || !user.isActive) {
        this.logger.warn('Invalid user or inactive');
        client.emit('force-logout', { message: 'User account is inactive or invalid' });
        client.disconnect();
        return false;
      }

      client.user = {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accessScope: user.accessScope,
        campuses: user.campuses || [],
        rooms: user.rooms || [],
        children: user.children || [],
        isActive: user.isActive,
      } as User;

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        this.logger.warn('Token expired');
        client.emit('force-logout', { message: 'Session expired. Please login again.' });
      } else if (error.name === 'JsonWebTokenError') {
        this.logger.warn('Invalid token');
        client.emit('force-logout', { message: 'Invalid authentication token.' });
      } else {
        this.logger.error('Authentication error:', error);
        client.emit('error', { message: 'Authentication failed' });
      }
      client.disconnect();
      return false;
    }
  }

  /**
   * Extract JWT token from socket handshake.
   * Security: Token is only accepted from Authorization header or handshake.auth.token.
   * Query params are NOT used to prevent token leakage in logs/proxies.
   */
  private extractToken(client: Socket): string | null {
    // Priority 1: Authorization header (Bearer token)
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Priority 2: handshake.auth.token (Socket.IO auth object)
    const token = client.handshake.auth?.token;
    if (token && typeof token === 'string') {
      return token;
    }

    return null;
  }

  private updateUserPresence(userId: string, isOnline: boolean): void {
    if (!this.userPresence.has(userId)) {
      this.userPresence.set(userId, {
        userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    }

    const presence = this.userPresence.get(userId);
    presence.isOnline = isOnline;
    presence.lastSeen = new Date();
  }

  /**
   * Schedule user presence update after grace period.
   * User is marked offline only if no reconnection occurred within grace period.
   * This prevents temporary disconnects from immediately marking user as offline.
   */
  private schedulePresenceUpdate(userId: string): void {
    setTimeout(() => {
      const userSockets = this.userSockets.get(userId);
      // Only mark offline if no active connections after grace period
      if (!userSockets || userSockets.size === 0) {
        this.updateUserPresence(userId, false);
        this.broadcastUserStatus(userId, false);
        this.logger.debug(`User ${userId} marked offline after grace period`);
      }
    }, this.GRACE_PERIOD_MS);
  }

  private broadcastUserStatus(userId: string, isOnline: boolean): void {
    this.server.emit('user-status', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  private cleanupTypingIndicators(userId: string, client: AuthenticatedSocket): void {
    for (const [roomName, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);
        client.to(roomName).emit('user-typing', {
          threadId: roomName,
          userId,
          isTyping: false,
        });
        if (typingSet.size === 0) {
          this.typingUsers.delete(roomName);
        }
      }
    }
  }

  /**
   * Cleanup old message acknowledgments (older than 5 minutes).
   * Uses stored createdAt timestamp for safe cleanup.
   */
  private cleanupMessageAcks(): void {
    const now = Date.now();
    const MAX_AGE_MS = 300000; // 5 minutes

    for (const [messageId, messageAck] of this.messageAcks.entries()) {
      const messageAge = now - messageAck.createdAt;
      if (messageAge > MAX_AGE_MS) {
        this.messageAcks.delete(messageId);
        this.logger.debug(`Cleaned up old message ack: ${messageId}`);
      }
    }
  }

  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.RATE_LIMIT.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      this.RATE_LIMIT.set(userId, {
        count: 1,
        resetAt: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT_MAX) {
      return false;
    }

    userLimit.count++;
    return true;
  }
}
