import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from './schemas/role.schema';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Child, ChildSchema } from '../children/schemas/child.schema';
import { ParentService } from './services/parent.service';
import { ParentController } from './controllers/parent.controller';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';
import { GoogleStorageService } from 'src/google-drive/google-storage.service';
import { FeedModule } from '../feed/feed.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Child.name, schema: ChildSchema },
    ]),
    FeedModule,
  ],
  controllers: [ParentController, UsersController],
  providers: [ParentService, UsersService, GoogleStorageService],
  exports: [ParentService, UsersService],
})
export class UsersModule {}
