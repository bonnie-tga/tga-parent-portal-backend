import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from '../services/email.service';
import { SendEmailDto } from '../dto/send-email.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from 'src/modules/users/schemas/user.schema';

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a custom email' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
    @CurrentUser()  currentUser: User,
  ) {
    return this.emailService.sendCustomEmail(sendEmailDto, currentUser._id.toString());
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get all email messages for the user' })
  @ApiResponse({ status: 200, description: 'Retrieved email messages successfully' })
  async getEmailMessages(
    @CurrentUser()  currentUser: User,
  ) {
    return this.emailService.getAllEmailMessages(currentUser._id.toString());
  }
}
