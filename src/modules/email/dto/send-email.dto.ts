import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({
    description: 'Email address of the recipient',
    example: 'user@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Subject of the email',
    example: 'Meeting Invitation'
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Content of the email message',
    example: 'Hello, this is the message content.'
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
