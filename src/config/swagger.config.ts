import { DocumentBuilder } from '@nestjs/swagger';

// Define security scheme names
export const BEARER_AUTH_NAME = 'access-token';
export const BASIC_AUTH_NAME = 'email-password';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('TGA Parent Portal API')
  .setDescription('The TGA Parent Portal API documentation')
  .setVersion('1.0')
  // Add bearer auth
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token (without Bearer prefix)',
      in: 'header',
    },
    BEARER_AUTH_NAME,
  )
  // Add basic auth for email/password
  .addBasicAuth(
    {
      type: 'http',
      scheme: 'basic',
      name: 'Authorization',
      description: 'Enter email and password',
      in: 'header',
    },
    BASIC_AUTH_NAME,
  )
  .build();

// This is used in the auth.controller.ts to document the login response
export const loginResponseExample = {
  user: {
    _id: '60d21b4667d0d8992e610c85',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'PARENT',
    isActive: true,
    // other user properties...
  },
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiI2MGQyMWI0NjY3ZDBkODk5MmU2MTBjODUiLCJpYXQiOjE2MzA1MjQzNDUsImV4cCI6MTYzMDUyNzk0NX0.7QQEZgJhJ7QJ7Z6J7Z6J7Z6J7Z6J7Z6J7Z6J7Z6J',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJzdWIiOiI2MGQyMWI0NjY3ZDBkODk5MmU2MTBjODUiLCJpYXQiOjE2MzA1MjQzNDUsImV4cCI6MTYzMTEyOTE0NX0.8RRFgJhJ8RRJ8Z6J8Z6J8Z6J8Z6J8Z6J8Z6J8Z6J8Z6J'
};