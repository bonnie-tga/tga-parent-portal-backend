import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

/**
 * Authentication Middleware
 * This intercepts Basic Auth headers, validates credentials, and converts to Bearer token
 * Works for both Swagger UI and actual API endpoints to provide seamless authentication
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Process all API requests
    // We'll handle both Swagger UI and actual API endpoints

    const authHeader = req.headers.authorization;
    
    // Check if using Basic Auth
    if (authHeader && authHeader.startsWith('Basic ')) {
      try {
        // Decode Basic Auth header
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [email, password] = credentials.split(':');

        // Validate credentials and get token
        const authResult = await this.authService.login({ email, password });
        
        // Replace Basic Auth header with Bearer token
        req.headers.authorization = `Bearer ${authResult.access_token}`;
        
        // Store user info in request for potential use
        (req as any).user = authResult.user;
      } catch (error) {
        // If authentication fails, continue without modifying headers
        console.log('Basic Auth failed:', error.message);
      }
    }

    next();
  }
}
