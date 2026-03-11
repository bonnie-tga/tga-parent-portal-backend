import { Module } from '@nestjs/common';
import { User, UserSchema } from '../users/schemas/user.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffService } from './services/staff.service';
import { StaffController } from './controllers/staff.controller';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
