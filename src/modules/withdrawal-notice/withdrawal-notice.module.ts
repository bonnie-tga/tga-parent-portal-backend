import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  WithdrawalNotice,
  WithdrawalNoticeSchema,
} from './schemas/withdrawal-notice.schema';
import { WithdrawalNoticeController } from './controllers/withdrawal-notice.controller';
import { WithdrawalNoticeService } from './services/withdrawal-notice.service';
import { TransferNoticeModule } from '../transfer-notice/transfer-notice.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: WithdrawalNotice.name,
        schema: WithdrawalNoticeSchema,
      },
    ]),
    TransferNoticeModule,
  ],
  controllers: [WithdrawalNoticeController],
  providers: [WithdrawalNoticeService],
  exports: [WithdrawalNoticeService],
})
export class WithdrawalNoticeModule {}




