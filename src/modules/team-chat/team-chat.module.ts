import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TeamChat, TeamChatSchema } from './schemas/team-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TeamChatService } from './services/team-chat.service';
import { TeamChatController } from './controllers/team-chat.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TeamChat.name, schema: TeamChatSchema },
      { name: User.name, schema: UserSchema },
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
    TeamChatController,
  ],
  providers: [
    TeamChatService,
  ],
  exports: [
    TeamChatService,
  ],
})
export class TeamChatModule {}
