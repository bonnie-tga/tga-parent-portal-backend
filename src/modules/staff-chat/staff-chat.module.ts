import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StaffChat, StaffChatSchema } from './schemas/staff-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { StaffChatService } from './services/staff-chat.service';
import { StaffChatController } from './controllers/staff-chat.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StaffChat.name, schema: StaffChatSchema },
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
    StaffChatController,
  ],
  providers: [
    StaffChatService,
  ],
  exports: [
    StaffChatService,
  ],
})
export class StaffChatModule {}
