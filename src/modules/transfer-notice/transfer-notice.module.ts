import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TransferNotice,
  TransferNoticeSchema,
} from './schemas/transfer-notice.schema';
import { TransferNoticeController } from './controllers/transfer-notice.controller';
import { TransferNoticeService } from './services/transfer-notice.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TransferNotice.name,
        schema: TransferNoticeSchema,
      },
    ]),
  ],
  controllers: [TransferNoticeController],
  providers: [TransferNoticeService],
  exports: [TransferNoticeService],
})
export class TransferNoticeModule {}

