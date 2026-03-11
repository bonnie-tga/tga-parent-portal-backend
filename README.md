# TGA Parent Portal Backend

This is the backend API for the TGA Parent Portal, a comprehensive platform for childcare centers to manage communication between staff and parents.

## Features

- **User Management**: Role-based access control with multiple user types (Administrator, Area Manager, Director, Staff, Parents, etc.)
- **Campus & Room Management**: Organize users and children by campus and room
- **Announcements & Events**: Create and manage announcements and events for specific campuses or rooms
- **My Day & Photos**: Document daily activities and share photos with parents
- **Messaging**: Real-time communication between staff and parents
- **Wellbeing Tracking**: Track children's daily activities, meals, sleep, and more

## Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT-based authentication
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js (v20.11.0 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd tga-parent-portal-web-be
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create environment files:
   - Create `.env.development` for development environment
   - Create `.env.production` for production environment

   Example `.env.development`:
   ```
   PORT=3000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/tga-parent-portal
   JWT_SECRET=your-secret-key-for-development
   JWT_EXPIRES_IN=24h
   THROTTLE_TTL=60
   THROTTLE_LIMIT=100
   ```

## Running the Application

### Development Mode
```
npm run start:dev
```

### Production Mode
```
npm run build
npm run start:prod
```

## API Documentation

Once the application is running, you can access the Swagger API documentation at:
```
http://localhost:3000/api/docs
```

## User Roles and Access Control

The system implements a comprehensive role-based access control:

1. **Administrator**: Full access to all features and data
2. **Area Manager**: Access to multiple campuses
3. **Director, Assistant Director, Educational Leader**: Access to a single campus
4. **Enrolments**: Access to multiple campuses for enrollment purposes
5. **WHS Medical**: Access to medical and checklist data for a single campus
6. **Centre Login**: Shared account for a single campus
7. **Room Login**: Shared account for a specific room
8. **Staff**: Individual account with access to a specific room
9. **Parent**: Access to their child's data only

## Project Structure

```
src/
├── config/               # Configuration files
├── modules/
│   ├── auth/             # Authentication module
│   ├── users/            # User management
│   ├── campus/           # Campus and room management
│   ├── children/         # Children management
│   ├── staff/            # Staff management
│   ├── announcements/    # Announcements and events
│   ├── photos/           # My Day and photo gallery
│   ├── messages/         # Messaging system
│   └── wellbeing/        # Wellbeing tracking (daily chart, sleep, etc.)
├── app.controller.ts     # Main application controller
├── app.module.ts         # Main application module
├── app.service.ts        # Main application service
└── main.ts               # Application entry point
```

## License

This project is proprietary and confidential.