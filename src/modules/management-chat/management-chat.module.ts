import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ManagementChat, ManagementChatSchema } from './schemas/management-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { ManagementChatService } from './services/management-chat.service';
import { ManagementChatController } from './controllers/management-chat.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ManagementChat.name, schema: ManagementChatSchema },
      { name: User.name, schema: UserSchema },
      { name: Child.name, schema: ChildSchema },
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
    forwardRef(() => ChatModule),
  ],
  controllers: [
    ManagementChatController,
  ],
  providers: [
    ManagementChatService,
  ],
  exports: [
    ManagementChatService,
  ],
})
export class ManagementChatModule {}
