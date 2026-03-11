import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';
import { TeacherService } from './services/teacher.service';
import { TeacherController } from './controllers/teacher.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeachersModule {}
