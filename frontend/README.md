# MedConnect Frontend

This is the frontend for the MedConnect telemedicine platform, a comprehensive solution for remote healthcare services.

## Features

- Appointment scheduling and management
- Video consultations with WebRTC
- Secure messaging between patients and doctors
- Interactive calendar for appointment booking
- Integrated payment system
- Role-based access control

## Running the Application

### Standard Development Mode

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### HTTPS Mode (Recommended for Video Calls)

For video calls to work properly, the application should run over HTTPS to get access to camera and microphone permissions. We've provided a secure start script:

```bash
# Make the script executable (if needed)
chmod +x scripts/start-secure.sh

# Run the frontend with HTTPS enabled
./scripts/start-secure.sh
```

This will start the development server on port 3000 with HTTPS enabled. You'll need to accept the self-signed certificate in your browser.

### Backend Configuration

The frontend is configured to connect to a backend API running on:
- HTTP: Port 3001
- HTTPS: Port 3443

Make sure your backend is running on these ports or update the `.env.local` file with the correct configuration.

## Video Call Flow

The video call functionality follows this flow:

1. Doctor creates a video call session for a confirmed appointment
2. When the doctor joins, the doctor is immediately in the active call
3. Patient sees "Join Video Call" button enabled once the doctor has created the session
4. Patient clicks the button and enters a virtual waiting room
5. Doctor gets notification of patient in waiting room
6. Doctor admits the patient from the waiting room interface
7. Patient automatically joins the call after being admitted

## Environment Variables

Configure the application by creating a `.env.local` file:

```
# API Configuration
NEXT_PUBLIC_API_PORT=3001
NEXT_PUBLIC_API_HTTPS_PORT=3443

# Video call configuration
NEXT_PUBLIC_USE_DYNAMIC_IP=true

# Connection retry configuration
NEXT_PUBLIC_MAX_CONNECTION_RETRIES=3
```

## Browser Support

For best results, use Chrome, Firefox, or Edge. Safari has some limitations with WebRTC.

## Development Approach

The application is being developed following a phased approach:

1. Authentication and User Management
2. Appointment Management
3. Video Consultation
4. Secure Messaging
5. Payment Processing
6. Notifications and Integration

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- WebRTC (for video consultations)
- End-to-end encryption for messaging

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
