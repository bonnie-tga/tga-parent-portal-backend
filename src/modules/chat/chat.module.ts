import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatThread, ChatThreadSchema } from './schemas/chat-thread.schema';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ParentChat, ParentChatSchema } from '../parent-chat/schemas/parent-chat.schema';
import { AccountChat, AccountChatSchema } from '../account-chat/schemas/account-chat.schema';
import { ManagementChat, ManagementChatSchema } from '../management-chat/schemas/management-chat.schema';
import { StaffChat, StaffChatSchema } from '../staff-chat/schemas/staff-chat.schema';
import { TeamChat, TeamChatSchema } from '../team-chat/schemas/team-chat.schema';
import { ChatThreadService } from './services/chat-thread.service';
import { ChatMessageService } from './services/chat-message.service';
import { ChatThreadController } from './controllers/chat-thread.controller';
import { ChatMessageController } from './controllers/chat-message.controller';
import { MyChatsController } from './controllers/my-chats.controller';
import { MyChatsService } from './services/my-chats.service';
import { ChatGateway } from './gateways/chat.gateway';
import { GoogleStorageService } from '../../google-drive/google-storage.service';
import { ParentChatModule } from '../parent-chat/parent-chat.module';
import { AccountChatModule } from '../account-chat/account-chat.module';
import { ManagementChatModule } from '../management-chat/management-chat.module';
import { StaffChatModule } from '../staff-chat/staff-chat.module';
import { TeamChatModule } from '../team-chat/team-chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatThread.name, schema: ChatThreadSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: ParentChat.name, schema: ParentChatSchema },
      { name: AccountChat.name, schema: AccountChatSchema },
      { name: ManagementChat.name, schema: ManagementChatSchema },
      { name: StaffChat.name, schema: StaffChatSchema },
      { name: TeamChat.name, schema: TeamChatSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    ConfigModule,
    forwardRef(() => ParentChatModule),
    forwardRef(() => AccountChatModule),
    forwardRef(() => ManagementChatModule),
    forwardRef(() => StaffChatModule),
    forwardRef(() => TeamChatModule),
  ],
  controllers: [
    ChatThreadController,
    ChatMessageController,
    MyChatsController,
  ],
  providers: [
    ChatThreadService,
    ChatMessageService,
    MyChatsService,
    ChatGateway,
    GoogleStorageService,
  ],
  exports: [
    ChatThreadService,
    ChatMessageService,
    ChatGateway,
  ],
})
export class ChatModule {}
