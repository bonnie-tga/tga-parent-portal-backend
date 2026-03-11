import { Controller, Post, Body, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { AddUserDto } from '../dto/add-user.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { Public } from '../decorators/public.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User, UserRole } from '../../users/schemas/user.schema';
import { ApiSecurityAuth } from '../decorators/api-bearer-auth.decorator';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
@ApiSecurityAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ 
    summary: 'Login with email or username and password',
    description: 'Use this endpoint to obtain a JWT token for API access. After login, copy the access_token value and use it as a Bearer token in the Authorize dialog.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'User credentials',
    examples: {
      example1: {
        summary: 'Login with email',
        description: 'Login using email and password',
        value: {
          email: 'user@example.com',
          password: 'password123'
        }
      },
      example2: {
        summary: 'Login with username',
        description: 'Login using username and password',
        value: {
          username: 'username123',
          password: 'password123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful. Use the access_token as a Bearer token for API authorization.',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', example: 'PARENT' },
            isActive: { type: 'boolean', example: true }
          }
        },
        access_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'JWT token to be used for API authorization. Copy this token and click on the "Authorize" button at the top of the Swagger UI. Then paste this token in the value field (with the format: Bearer your_token)'
        },
        refresh_token: { 
          type: 'string', 
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          description: 'Token used to get a new access token when it expires'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }


  @Post('add-user')
  @Roles(UserRole.ADMINISTRATOR)
  @ApiOperation({ summary: 'Add a new user' })
  @ApiResponse({ status: 201, description: 'User added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async addUser(@Body() addUserDto: AddUserDto, @CurrentUser() currentUser: User) {
    return this.authService.addUser(addUserDto, currentUser);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Request password reset',
    description: 'Send a password reset email to the user. The email will contain a secure token to reset the password.'
  })
  @ApiBody({ 
    type: ForgotPasswordDto,
    description: 'User email address for password reset',
    examples: {
      example1: {
        summary: 'Example request',
        description: 'A typical forgot password request',
        value: {
          email: 'user@example.com'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If the email exists, a password reset link has been sent'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid email format' 
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Reset password with token',
    description: 'Reset user password using the token received via email. The token expires after 1 hour.'
  })
  @ApiBody({ 
    type: ResetPasswordDto,
    description: 'Password reset token and new password',
    examples: {
      example1: {
        summary: 'Example request',
        description: 'A typical password reset request',
        value: {
          token: 'abc123def456ghi789',
          newPassword: 'NewSecurePassword123!'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been reset successfully'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid or expired token' 
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: User) {
    const userId = (user as any)?._id?.toString();
    return this.authService.getProfile(userId);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token',
    examples: {
      example1: {
        summary: 'Example request',
        description: 'A typical refresh token request',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Check if user session is valid',
    description: 'Validates the current user session and returns user information if valid'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session is valid',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d21b4667d0d8992e610c85' },
            email: { type: 'string', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', example: 'PARENT' },
            isActive: { type: 'boolean', example: true }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized or session invalid' })
  async checkSession(@CurrentUser() user: User) {
    return this.authService.checkSession(user._id.toString());
  }

  @Post('change-password')
  @ApiOperation({ 
    summary: 'Change user password',
    description: 'Allows authenticated users to change their password by providing their current password and a new password'
  })
  @ApiBody({ 
    type: ChangePasswordDto,
    description: 'Current password and new password',
    examples: {
      example1: {
        summary: 'Example request',
        description: 'A typical password change request',
        value: {
          currentPassword: 'OldP@ss123',
          newPassword: 'NewP@ss123'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid password format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(user._id.toString(), changePasswordDto);
  }

  @Public()
  @Post('set-password')
  @ApiOperation({ 
    summary: 'Set password for admin-created users',
    description: 'Set a new password for a user account created by an admin. Requires a valid token received via email.'
  })
  @ApiBody({ 
    type: SetPasswordDto,
    description: 'Set password token, email, and new password',
    examples: {
      example1: {
        summary: 'Example request',
        description: 'A typical set password request',
        value: {
          token: 'abc123def456ghi789',
          email: 'user@example.com',
          newPassword: 'NewSecurePassword123!'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Password set successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password has been set successfully'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid or expired token' 
  })
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    return this.authService.setPassword(
      setPasswordDto.email,
      setPasswordDto.token, 
      setPasswordDto.newPassword
    );
  }
}