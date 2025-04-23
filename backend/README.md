# MedConnect Backend

This is the backend server for the MedConnect telemedicine platform. It provides RESTful API endpoints for user management, appointment scheduling, video consultations, secure messaging, and payment processing.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** AWS DynamoDB
- **Storage:** AWS S3
- **Authentication:** JWT (JSON Web Tokens)

## Prerequisites

- Node.js 14.x or higher
- AWS Account with DynamoDB and S3 access
- AWS CLI configured with appropriate credentials

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd medconnect/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on the provided `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration details.

5. Start the development server:
```bash
npm run dev
```

The server will start on http://localhost:3000 by default.

## AWS Authentication

The application supports multiple ways to authenticate with AWS:

1. **Environment Variables (Recommended)** - Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your `.env` file. This is the easiest method for team members who don't have AWS CLI installed.

2. **IAM Roles** - When deployed to AWS services like EC2, ECS, or Lambda, you can use IAM roles for authentication without storing credentials in the application.

3. **AWS CLI credentials** - If you have AWS CLI installed and configured (via `aws configure`), you'll need to set `AWS_SDK_LOAD_CONFIG=1` in your environment to use these credentials.

4. **Named Profiles** - Set `AWS_PROFILE` in your environment to use a specific profile from your AWS CLI configuration.

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middlewares/    # Express middlewares
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── server.js       # Main application file
├── .env.example        # Environment variables example
├── package.json        # Project dependencies
└── README.md           # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/v1/users/register` - Register a new user
- `POST /api/v1/users/login` - User login
- `POST /api/v1/users/forgot-password` - Initiate password reset
- `POST /api/v1/users/reset-password` - Reset password with token

### User Management
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update user profile
- `POST /api/v1/users/profile/image` - Upload profile image

### Appointments
- `GET /api/v1/appointments` - List appointments
- `POST /api/v1/appointments` - Create appointment
- `GET /api/v1/appointments/:id` - Get appointment details
- `PUT /api/v1/appointments/:id` - Update appointment
- `DELETE /api/v1/appointments/:id` - Cancel appointment

### Video Consultations
- `POST /api/v1/video/session` - Create video session
- `GET /api/v1/video/session/:id` - Get session details
- `POST /api/v1/video/session/:id/recording` - Save recording

### Messaging
- `GET /api/v1/chats` - Get conversations
- `POST /api/v1/chats` - Create new conversation
- `GET /api/v1/chats/:id/messages` - Get messages
- `POST /api/v1/chats/:id/messages` - Send message

### Payments
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments` - Get payment history
- `GET /api/v1/payments/:id` - Get payment details

## AWS Integration

The application uses the following AWS services:

- **DynamoDB Tables:**
  - `medconnect_users` - User accounts
  - `medconnect_appointments` - Appointment data
  - `medconnect_messages` - Chat messages
  - `medconnect_payments` - Payment records

- **S3 Buckets:**
  - Stores video recordings, medical documents, and profile images

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Deployment

The application is designed to be deployed to AWS services:

1. Set up required AWS resources (DynamoDB tables, S3 buckets)
2. Configure environment variables
3. Deploy the Node.js application to AWS EC2, ECS, or Elastic Beanstalk

### Recommended Deployment Setup

For production deployments, we recommend:

1. Create an IAM role with the minimum required permissions for DynamoDB and S3 access
2. Assign this role to the compute service running your application
3. Set the appropriate environment variables for table names and bucket names

This approach eliminates the need to store AWS credentials in your application.

## Notes

- Email functionality is intentionally not implemented as specified
- For local development, you can use AWS CLI configured credentials 