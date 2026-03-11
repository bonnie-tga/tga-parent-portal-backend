import { Module, NestModule, MiddlewareConsumer, RequestMethod, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    EmailModule,
    UsersModule,
    forwardRef(() => FeedModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    JwtStrategy, 
    RolesGuard,
  ],
  exports: [
    AuthService, 
    RolesGuard,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the authentication middleware to all routes
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
