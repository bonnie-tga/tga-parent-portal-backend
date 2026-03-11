import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../schemas/message.schema';
import { Conversation, ConversationType } from '../schemas/conversation.schema';
import { User, UserRole } from '../../users/schemas/user.schema';
import { CreateMessageDto } from '../dto/create-message.dto';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { QueryConversationsDto } from '../dto/query-conversations.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createConversation(createConversationDto: CreateConversationDto, currentUser: User): Promise<Conversation> {
    const newConversation = new this.conversationModel({
      ...createConversationDto,
      participants: [...(createConversationDto.participants || []), currentUser._id],
    });
    
    return newConversation.save();
  }

  async getConversations(queryParams: QueryConversationsDto, currentUser: User): Promise<Conversation[]> {
    const query: any = {
      participants: currentUser._id,
      isActive: true,
    };

    if (queryParams.type) {
      query.type = queryParams.type;
    }

    if (queryParams.child) {
      query.child = new Types.ObjectId(queryParams.child);
    }

    if (queryParams.room) {
      query.room = new Types.ObjectId(queryParams.room);
    }

    if (queryParams.campus) {
      query.campus = new Types.ObjectId(queryParams.campus);
    }

    return this.conversationModel
      .find(query)
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'firstName lastName email role')
      .populate('child', 'firstName lastName')
      .populate('room', 'name')
      .populate('campus', 'name')
      .exec();
  }

  async getConversationById(id: string, currentUser: User): Promise<Conversation> {
    const conversation = await this.conversationModel
      .findById(id)
      .populate('participants', 'firstName lastName email role')
      .populate('child', 'firstName lastName')
      .populate('room', 'name')
      .populate('campus', 'name')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant or has admin access
    const isParticipant = conversation.participants.some(
      (participant: any) => participant._id.toString() === currentUser._id.toString(),
    );
    
    const hasAdminAccess = [
      UserRole.ADMINISTRATOR, 
      UserRole.AREA_MANAGER, 
      UserRole.DIRECTOR, 
      UserRole.ASSISTANT_DIRECTOR, 
      UserRole.EDUCATIONAL_LEADER
    ].includes(currentUser.role as UserRole);

    if (!isParticipant && !hasAdminAccess) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return conversation;
  }

  async createMessage(createMessageDto: CreateMessageDto, currentUser: User): Promise<Message> {
    const conversation = await this.conversationModel.findById(createMessageDto.conversation);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant or has admin access
    const isParticipant = conversation.participants.some(
      participant => participant.toString() === currentUser._id.toString(),
    );
    
    const hasAdminAccess = [
      UserRole.ADMINISTRATOR, 
      UserRole.AREA_MANAGER, 
      UserRole.DIRECTOR, 
      UserRole.ASSISTANT_DIRECTOR, 
      UserRole.EDUCATIONAL_LEADER
    ].includes(currentUser.role as UserRole);

    if (!isParticipant && !hasAdminAccess) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Create and save the message
    const newMessage = new this.messageModel({
      ...createMessageDto,
      sender: currentUser._id,
      readBy: [currentUser._id],
    });

    // Update the conversation's lastMessageAt
    await this.conversationModel.findByIdAndUpdate(
      conversation._id,
      { lastMessageAt: new Date() },
    );

    return newMessage.save();
  }

  async getMessagesByConversation(conversationId: string, currentUser: User): Promise<Message[]> {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant or has admin access
    const isParticipant = conversation.participants.some(
      participant => participant.toString() === currentUser._id.toString(),
    );
    
    const hasAdminAccess = [
      UserRole.ADMINISTRATOR, 
      UserRole.AREA_MANAGER, 
      UserRole.DIRECTOR, 
      UserRole.ASSISTANT_DIRECTOR, 
      UserRole.EDUCATIONAL_LEADER
    ].includes(currentUser.role as UserRole);

    if (!isParticipant && !hasAdminAccess) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return this.messageModel
      .find({ 
        conversation: conversationId,
        isDeleted: false 
      })
      .sort({ createdAt: 1 })
      .populate('sender', 'firstName lastName email role')
      .exec();
  }

  async markMessagesAsRead(conversationId: string, currentUser: User): Promise<void> {
    const conversation = await this.conversationModel.findById(conversationId);
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      participant => participant.toString() === currentUser._id.toString(),
    );

    if (!isParticipant) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Mark all messages in the conversation as read by the current user
    await this.messageModel.updateMany(
      { 
        conversation: conversationId,
        readBy: { $ne: currentUser._id }
      },
      { $addToSet: { readBy: currentUser._id } }
    );
  }

  async getUnreadMessageCount(currentUser: User): Promise<{ total: number, byConversation: Record<string, number> }> {
    // Get all conversations where the user is a participant
    const conversations = await this.conversationModel.find({
      participants: currentUser._id,
      isActive: true,
    });

    const conversationIds = conversations.map(conv => conv._id);
    
    // Get all unread messages from these conversations
    const unreadMessages = await this.messageModel.find({
      conversation: { $in: conversationIds },
      sender: { $ne: currentUser._id },
      readBy: { $ne: currentUser._id },
      isDeleted: false,
    });

    // Count by conversation
    const byConversation: Record<string, number> = {};
    unreadMessages.forEach(message => {
      const convId = message.conversation.toString();
      byConversation[convId] = (byConversation[convId] || 0) + 1;
    });

    return {
      total: unreadMessages.length,
      byConversation,
    };
  }
}
