import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Child, ChildSchema } from './schemas/child.schema';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ChildService } from './services/child.service';
import { ChildController } from './controllers/child.controller';
import { AuthModule } from '../auth/auth.module';
import { ImmunisationReminderModule } from '../immunisation-reminder/immunisation-reminder.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Child.name, schema: ChildSchema },
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    forwardRef(() => ImmunisationReminderModule),
  ],
  controllers: [ChildController],
  providers: [ChildService],
  exports: [ChildService],
})
export class ChildrenModule {}
