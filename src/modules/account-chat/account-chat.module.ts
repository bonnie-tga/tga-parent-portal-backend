import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountChat, AccountChatSchema } from './schemas/account-chat.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { AccountChatService } from './services/account-chat.service';
import { AccountChatController } from './controllers/account-chat.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccountChat.name, schema: AccountChatSchema },
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
    AccountChatController,
  ],
  providers: [
    AccountChatService,
  ],
  exports: [
    AccountChatService,
  ],
})
export class AccountChatModule {}
