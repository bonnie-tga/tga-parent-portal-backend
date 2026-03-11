import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MediaService } from './media.service';
import { AuthModule } from '../auth/auth.module';
import { Media, MediaSchema } from './media.entity';
import { MediaController } from './media.controller';
import { GoogleStorageService } from 'src/google-drive/google-storage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Media.name, schema: MediaSchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers:[MediaController],
  providers: [MediaService, GoogleStorageService],
  exports: [MediaService, GoogleStorageService],
})
export class MediaModule {}
