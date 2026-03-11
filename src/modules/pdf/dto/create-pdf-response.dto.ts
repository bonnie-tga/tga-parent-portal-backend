import { ApiProperty } from '@nestjs/swagger';

export class CreatePdfResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'File URL if PDF was saved to storage',
    example: 'https://your-server.com/files/attendance-report.pdf',
    required: false,
  })
  fileUrl?: string;

  @ApiProperty({
    description: 'Response message',
    example: 'PDF generated successfully',
    required: false,
  })
  message?: string;
}

