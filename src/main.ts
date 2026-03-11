import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { swaggerConfig, BEARER_AUTH_NAME, BASIC_AUTH_NAME } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: false,
  });
  const configService = app.get(ConfigService);
  const port = configService.get('port') || 4000;

  // Increase body parser limit for file uploads (5MB)
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ limit: '5mb', extended: true }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  // Security
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  // Ensure uploads directory exists
  const uploadsDir = join(process.cwd(), 'uploads', 'chat-messages');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve static files from uploads directory
  app.use('/api/uploads', require('express').static(join(process.cwd(), 'uploads')));

  // Swagger documentation
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  // Custom Swagger UI options with authentication instructions
  const customOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      displayRequestDuration: true,
      // Set default security definition to our bearer auth
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 1,
      defaultModelRendering: 'model',
      // Ensure consistent security scheme usage
      initOAuth: {
        usePkceWithAuthorizationCodeGrant: false
      }
    },
    customSiteTitle: 'TGA Parent Portal API Documentation',
    customCss: `
      .swagger-ui .topbar { display: none } 
      .swagger-ui .info { margin: 20px 0 } 
      .swagger-ui .info .title { font-size: 2.5em } 
      .auth-instructions { background-color: #e7f7ff; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 5px solid #49cc90; }
      .swagger-ui .auth-wrapper .authorize {
        margin-right: 10px;
        background-color: #49cc90;
        border-color: #49cc90;
        color: #fff;
        padding: 5px 10px;
        border-radius: 4px;
        transition: all 0.3s;
      }
      .swagger-ui .auth-wrapper .authorize:hover {
        background-color: #3aa77a;
      }
      .swagger-ui .auth-btn-wrapper {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }
      .swagger-ui .auth-container {
        margin: 0 0 10px 0;
        padding: 10px;
        border-bottom: 1px solid rgba(59,65,81,.3);
      }
      .swagger-ui .auth-container h3 {
        margin: 5px 0;
      }
    `,
    customfavIcon: '',
    customJs: '/custom-swagger.js',
    customCssUrl: '',
  };
  
  // Setup Swagger with custom options
  const swaggerPath = 'api/docs';
  SwaggerModule.setup(swaggerPath, app, document, customOptions);
  
  // Serve a custom JS file that adds authentication instructions to the Swagger UI
  app.use(`/${swaggerPath}/custom-swagger.js`, (req, res) => {
    res.type('application/javascript');
    res.send(`
      window.onload = function() {
        // Add authentication instructions
        setTimeout(function() {
          const infoContainer = document.querySelector('.swagger-ui .info');
          if (infoContainer) {
            const authInstructions = document.createElement('div');
            authInstructions.className = 'auth-instructions';
            authInstructions.innerHTML = '<h3>Authentication Instructions</h3>' +
              '<p>You have two options to authenticate:</p>' +
              '<h4>Option 1: Direct Email/Password Login</h4>' +
              '<p><strong>Step 1:</strong> Click the "Authorize" button at the top of this page.</p>' +
              '<p><strong>Step 2:</strong> Enter your email and password in the "email-password" section.</p>' +
              '<p><strong>Step 3:</strong> Click "Authorize" and close the popup. You are now authenticated!</p>' +
              '<h4>Option 2: JWT Token</h4>' +
              '<p><strong>Step 1:</strong> Use the <code>/auth/login</code> endpoint to get an access token.</p>' +
              '<p><strong>Step 2:</strong> Click the "Authorize" button at the top of this page.</p>' +
              '<p><strong>Step 3:</strong> In the "access-token" section, enter your token (without the "Bearer" prefix).</p>' +
              '<p><strong>Step 4:</strong> Click "Authorize" and close the popup.</p>';
            infoContainer.appendChild(authInstructions);
          }
          
          // Fix authorization dialog behavior
          const authorizeButton = document.querySelector('.swagger-ui .auth-wrapper .authorize');
          if (authorizeButton) {
            // Make the authorize button more prominent
            authorizeButton.innerHTML = '<span>Authorize</span>';
            authorizeButton.style.fontWeight = 'bold';
            
            // Add click handler to fix authorization dialog
            authorizeButton.addEventListener('click', function() {
              setTimeout(function() {
                // Find the JWT token input field
                const bearerInput = document.querySelector('input[data-name="${BEARER_AUTH_NAME}"]');
                if (bearerInput) {
                  bearerInput.placeholder = 'JWT token (without Bearer prefix)';
                  
                  // Find the parent container
                  const bearerContainer = bearerInput.closest('.auth-container');
                  if (bearerContainer) {
                    // Add helper text
                    const bearerHelperText = document.createElement('p');
                    bearerHelperText.className = 'auth-helper-text';
                    bearerHelperText.style.color = '#666';
                    bearerHelperText.style.fontSize = '12px';
                    bearerHelperText.style.marginTop = '5px';
                    bearerHelperText.innerHTML = 'Enter only the token value from the login response, without the "Bearer" prefix';
                    
                    // Insert after the input
                    const bearerInputWrapper = bearerInput.parentNode;
                    bearerInputWrapper.parentNode.insertBefore(bearerHelperText, bearerInputWrapper.nextSibling);
                  }
                }
                
                // Find the Basic Auth username/password fields
                const basicAuthContainer = document.querySelector('.auth-container[data-name="${BASIC_AUTH_NAME}"]');
                if (basicAuthContainer) {
                  // Find the username and password inputs
                  const usernameInput = basicAuthContainer.querySelector('input[type="text"]');
                  const passwordInput = basicAuthContainer.querySelector('input[type="password"]');
                  
                  if (usernameInput && passwordInput) {
                    // Update placeholders
                    usernameInput.placeholder = 'Email address';
                    passwordInput.placeholder = 'Password';
                    
                    // Add helper text
                    const basicAuthHelperText = document.createElement('p');
                    basicAuthHelperText.className = 'auth-helper-text';
                    basicAuthHelperText.style.color = '#666';
                    basicAuthHelperText.style.fontSize = '12px';
                    basicAuthHelperText.style.marginTop = '5px';
                    basicAuthHelperText.innerHTML = 'Enter your email address and password to authenticate directly';
                    
                    // Find the container and insert helper text
                    const inputsContainer = passwordInput.closest('.wrapper');
                    if (inputsContainer) {
                      inputsContainer.parentNode.insertBefore(basicAuthHelperText, inputsContainer.nextSibling);
                    }
                    
                    // Update the section title
                    const sectionTitle = basicAuthContainer.querySelector('h4, h3');
                    if (sectionTitle) {
                      sectionTitle.textContent = 'Email/Password Login';
                    }
                  }
                }
              }, 100);
            });
          }
        }, 500);
      };
    `);
  });

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();