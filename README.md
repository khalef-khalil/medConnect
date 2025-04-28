# Telemedicine Platform

A comprehensive telemedicine application developed as part of our education at the Higher Institute of Computer Science of Tunis (ISI).

## Project Overview

This platform connects patients with doctors through secure video consultations, messaging, and appointment scheduling. The application provides a complete telemedicine experience with features for both healthcare providers and patients.

## Features

- **Secure Video Consultations**: Real-time video appointments using WebRTC
- **Instant Messaging**: Chat between patients and doctors via WebSockets
- **Appointment Scheduling**: Book, manage, and track medical appointments
- **User Profiles**: Detailed profiles for doctors and patients
- **Payment Processing**: Secure payment integration for consultations
- **Document Storage**: Upload and share medical documents and images

## Tech Stack

### Frontend
- **Next.js**: React framework for building the user interface
- **TailwindCSS**: For responsive design and styling
- **WebRTC**: For real-time video communication
- **Socket.io-client**: For real-time messaging

### Backend
- **Node.js & Express**: Server framework for the API
- **Socket.io**: For managing WebSocket connections
- **JWT**: For authentication and authorization
- **AWS Services**:
  - **DynamoDB**: NoSQL database for data storage
  - **S3**: Object storage for files and images

## Project Structure

```
.
├── frontend/             # Next.js application
│   ├── app/              # Application pages and components
│   ├── public/           # Static assets
│   └── ...
├── backend/              # Node.js server
│   ├── src/              # Source code
│   │   ├── controllers/  # API controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── config/       # Configuration files
│   │   ├── middlewares/  # Express middlewares
│   │   └── utils/        # Utility functions
│   └── ...
└── docs/                 # Documentation
```

## Team Members

- Eya Belkadhi
- Mariem Guesmi
- Nada Yakoubi
- Eya Bouden
- Ines Ghali
- Brahim Khalil Khalef

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- AWS account (for DynamoDB and S3)

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   ```

2. Install frontend dependencies
   ```
   cd frontend
   npm install
   ```

3. Install backend dependencies
   ```
   cd backend
   npm install
   ```

4. Set up environment variables
   - Create `.env` files in both frontend and backend directories
   - Configure AWS credentials and other necessary variables

### Running the Application

1. Start the backend server
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend application
   ```
   cd frontend
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## License

This project was developed for educational purposes at the Higher Institute of Computer Science of Tunis (ISI). 