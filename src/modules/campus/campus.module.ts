import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campus, CampusSchema } from './schemas/campus.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { CotRoom, CotRoomSchema } from './schemas/cot-room.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CampusService } from './services/campus.service';
import { RoomService } from './services/room.service';
import { CotRoomService } from './services/cot-room.service';
import { CampusDirectorService } from './services/campus-director.service';
import { CampusController } from './controllers/campus.controller';
import { RoomController } from './controllers/room.controller';
import { CotRoomController } from './controllers/cot-room.controller';
import { CampusDirectorController } from './controllers/campus-director.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
      { name: CotRoom.name, schema: CotRoomSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CampusController, RoomController, CotRoomController, CampusDirectorController],
  providers: [CampusService, RoomService, CotRoomService, CampusDirectorService],
  exports: [CampusService, RoomService, CotRoomService, CampusDirectorService],
})
export class CampusModule {}
