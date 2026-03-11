import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sunscreen, SunscreenSchema } from './schemas/sunscreen.schema';
import { SunscreenService } from './services/sunscreen.service';
import { SunscreenController } from './controllers/sunscreen.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sunscreen.name, schema: SunscreenSchema },
    ]),
  ],
  controllers: [SunscreenController],
  providers: [SunscreenService],
  exports: [SunscreenService],
})
export class SunscreenModule {}


