import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PdfService } from './services/pdf.service';
import { PdfController } from './controllers/pdf.controller';
import { GroveCurriculumModule } from '../grove-curriculum/grove-curriculum.module';
import { Campus, CampusSchema } from '../campus/schemas/campus.schema';
import { Room, RoomSchema } from '../campus/schemas/room.schema';

@Module({
  imports: [
    GroveCurriculumModule,
    MongooseModule.forFeature([
      { name: Campus.name, schema: CampusSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
  ],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}

