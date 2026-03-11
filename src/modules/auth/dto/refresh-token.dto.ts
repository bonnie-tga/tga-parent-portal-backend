import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// Export a class called RefreshTokenDto
export class RefreshTokenDto {
  // Decorate the refreshToken property with ApiProperty to provide an example and description
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token'
  })
  // Decorate the refreshToken property with IsString to ensure it is a string
  @IsString()
  // Decorate the refreshToken property with IsNotEmpty to ensure it is not empty
  @IsNotEmpty()
  refreshToken: string;
}
