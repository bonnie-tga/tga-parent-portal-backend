import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParentChat, ParentChatSchema } from './schemas/parent-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { ParentChatService } from './services/parent-chat.service';
import { ParentChatController } from './controllers/parent-chat.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ParentChat.name, schema: ParentChatSchema },
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
    ParentChatController,
  ],
  providers: [
    ParentChatService,
  ],
  exports: [
    ParentChatService,
  ],
})
export class ParentChatModule {}
