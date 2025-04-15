# MedConnect Frontend Development Phases

This document outlines the phased approach for developing the MedConnect frontend application using React. Each phase builds upon the previous one, gradually integrating with the backend API endpoints that have been tested and confirmed through the API test script.

## Phase 1: Authentication and User Management

**Objective:** Implement user authentication and basic profile management.

### API Endpoints:

#### User Registration
- **Endpoint:** `POST /api/v1/users/register`
- **Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "role": "patient|doctor|admin"
}
```
- **Response (201):**
```json
{
  "token": "string",
  "user": {
    "userId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "role": "string",
    "createdAt": "number",
    "updatedAt": "number",
    "isActive": "boolean"
  }
}
```

#### User Login
- **Endpoint:** `POST /api/v1/users/login`
- **Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```
- **Response (200):**
```json
{
  "token": "string",
  "user": {
    "userId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "role": "string",
    "createdAt": "number",
    "updatedAt": "number",
    "isActive": "boolean"
  }
}
```

#### Get User Profile
- **Endpoint:** `GET /api/v1/users/profile`
- **Response (200):**
```json
{
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "role": "string",
  "createdAt": "number",
  "updatedAt": "number",
  "isActive": "boolean",
  "profileImage": "string",
  "specialization": "string (for doctors)"
}
```

#### Update User Profile
- **Endpoint:** `PUT /api/v1/users/profile`
- **Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "profileImage": "string (base64)"
}
```
- **Response (200):**
```json
{
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "role": "string",
  "profileImage": "string (URL)",
  "updatedAt": "number"
}
```

#### Forgot Password
- **Endpoint:** `POST /api/v1/users/forgot-password`
- **Request Body:**
```json
{
  "email": "string"
}
```
- **Response (200):**
```json
{
  "message": "string"
}
```

### Implementation Tasks:
1. Create authentication pages (Login, Register, Forgot Password)
2. Implement user profile management
3. Set up JWT token storage and management
4. Create role-based route protection
5. Implement responsive layouts for all device sizes

## Phase 2: Appointment Management

**Objective:** Implement the appointment scheduling and management system, including doctor schedules.

### API Endpoints:

#### Get All Appointments
- **Endpoint:** `GET /api/v1/appointments`
- **Response (200):**
```json
{
  "appointments": [
    {
      "appointmentId": "string",
      "patientId": "string",
      "doctorId": "string",
      "startTime": "string (ISO date)",
      "endTime": "string (ISO date)",
      "status": "string",
      "appointmentType": "string",
      "notes": "string",
      "createdAt": "number",
      "updatedAt": "number",
      "patientName": "string",
      "doctorName": "string"
    }
  ]
}
```

#### Create Appointment
- **Endpoint:** `POST /api/v1/appointments`
- **Request Body:**
```json
{
  "patientId": "string",
  "doctorId": "string",
  "startTime": "string (ISO date)",
  "endTime": "string (ISO date)",
  "appointmentType": "string",
  "notes": "string"
}
```
- **Response (201):**
```json
{
  "appointment": {
    "appointmentId": "string",
    "patientId": "string",
    "doctorId": "string",
    "startTime": "string (ISO date)",
    "endTime": "string (ISO date)",
    "status": "string",
    "appointmentType": "string",
    "notes": "string",
    "createdAt": "number",
    "updatedAt": "number"
  }
}
```

#### Get Appointment By ID
- **Endpoint:** `GET /api/v1/appointments/:id`
- **Response (200):**
```json
{
  "appointmentId": "string",
  "patientId": "string",
  "doctorId": "string",
  "startTime": "string (ISO date)",
  "endTime": "string (ISO date)",
  "status": "string",
  "appointmentType": "string",
  "notes": "string",
  "createdAt": "number",
  "updatedAt": "number",
  "patientDetails": {
    "userId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "profileImage": "string"
  },
  "doctorDetails": {
    "userId": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "profileImage": "string",
    "specialization": "string"
  }
}
```

#### Update Appointment
- **Endpoint:** `PUT /api/v1/appointments/:id`
- **Request Body:**
```json
{
  "status": "string",
  "notes": "string"
}
```
- **Response (200):**
```json
{
  "appointmentId": "string",
  "patientId": "string",
  "doctorId": "string",
  "startTime": "string (ISO date)",
  "endTime": "string (ISO date)",
  "status": "string",
  "appointmentType": "string",
  "notes": "string",
  "updatedAt": "number"
}
```

#### Delete Appointment
- **Endpoint:** `DELETE /api/v1/appointments/:id`
- **Response (200):**
```json
{
  "message": "Appointment successfully deleted"
}
```

#### Get Doctor Availability
- **Endpoint:** `GET /api/v1/appointments/doctor/:id/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Response (200):**
```json
{
  "doctorId": "string",
  "availableSlots": [
    {
      "date": "string (YYYY-MM-DD)",
      "slots": [
        {
          "startTime": "string (ISO date)",
          "endTime": "string (ISO date)"
        }
      ]
    }
  ]
}
```

### Doctor Schedule Management:

#### Create Doctor Schedule
- **Endpoint:** `POST /api/v1/schedules`
- **Request Body:**
```json
{
  "doctorId": "string",
  "dayOfWeek": "number", // 0-6 (Sunday-Saturday)
  "startTime": "string", // Format: "HH:MM"
  "endTime": "string", // Format: "HH:MM"
  "slotDuration": "number" // Minutes
}
```
- **Response (201):**
```json
{
  "schedule": {
    "scheduleId": "string",
    "doctorId": "string",
    "dayOfWeek": "number",
    "startTime": "string",
    "endTime": "string",
    "slotDuration": "number",
    "createdAt": "number",
    "updatedAt": "number"
  }
}
```

#### Get Doctor Schedules
- **Endpoint:** `GET /api/v1/schedules/doctor/:id`
- **Response (200):**
```json
{
  "schedules": [
    {
      "scheduleId": "string",
      "doctorId": "string",
      "dayOfWeek": "number",
      "startTime": "string",
      "endTime": "string",
      "slotDuration": "number",
      "createdAt": "number",
      "updatedAt": "number"
    }
  ],
  "doctorDetails": {
    "userId": "string",
    "firstName": "string",
    "lastName": "string",
    "specialization": "string",
    "profileImage": "string"
  }
}
```

#### Update Doctor Schedule
- **Endpoint:** `PUT /api/v1/schedules/:id`
- **Request Body:**
```json
{
  "startTime": "string", // Format: "HH:MM"
  "endTime": "string", // Format: "HH:MM"
  "slotDuration": "number" // Minutes
}
```
- **Response (200):**
```json
{
  "scheduleId": "string",
  "doctorId": "string",
  "dayOfWeek": "number",
  "startTime": "string",
  "endTime": "string",
  "slotDuration": "number",
  "updatedAt": "number"
}
```

#### Delete Doctor Schedule
- **Endpoint:** `DELETE /api/v1/schedules/:id`
- **Response (200):**
```json
{
  "message": "Schedule successfully deleted"
}
```

### Implementation Tasks:
1. Create appointment calendar view
2. Implement appointment creation flow
3. Build doctor availability checker
4. Develop appointment details and management screens
5. Implement role-specific appointment views (patient, doctor)
6. Create appointment status tracking system
7. Implement doctor schedule management interface
8. Develop doctor dashboard for managing their schedules and appointments
9. Implement recurring appointment scheduling based on doctor availability
10. Build conflict detection for appointment scheduling
11. Create notification system for appointment changes
12. Develop appointment analytics and reporting for doctors
13. Implement patient appointment request workflow
14. Build doctor's appointment confirmation interface

## Phase 3: Video Consultation

**Objective:** Implement real-time video consultation capabilities.

### API Endpoints:

#### Create Video Session
- **Endpoint:** `POST /api/v1/video/session`
- **Request Body:**
```json
{
  "appointmentId": "string"
}
```
- **Response (201):**
```json
{
  "session": {
    "appointmentId": "string",
    "webrtcData": {
      "sessionId": "string",
      "token": "string",
      "apiKey": "string"
    },
    "createdAt": "number",
    "status": "string"
  }
}
```

#### Get Video Session
- **Endpoint:** `GET /api/v1/video/session/:appointmentId`
- **Response (200):**
```json
{
  "session": {
    "appointmentId": "string",
    "webrtcData": {
      "sessionId": "string",
      "token": "string",
      "apiKey": "string"
    },
    "createdAt": "number",
    "status": "string",
    "appointmentDetails": {
      "patientId": "string",
      "doctorId": "string",
      "startTime": "string (ISO date)",
      "endTime": "string (ISO date)"
    }
  }
}
```

#### Patient Joins Waiting Room
- **Endpoint:** `POST /api/v1/video/session/:appointmentId/waiting-room`
- **Response (200):**
```json
{
  "session": {
    "appointmentId": "string",
    "status": "waiting",
    "updatedAt": "number",
    "waitingSince": "number"
  }
}
```

#### Doctor Admits Patient
- **Endpoint:** `POST /api/v1/video/session/:appointmentId/admit/:patientId`
- **Response (200):**
```json
{
  "session": {
    "appointmentId": "string",
    "status": "active",
    "updatedAt": "number",
    "participants": [
      {
        "userId": "string",
        "role": "string",
        "status": "string"
      }
    ]
  }
}
```

#### Start Screen Sharing
- **Endpoint:** `POST /api/v1/video/session/:appointmentId/screen-sharing`
- **Response (200):**
```json
{
  "session": {
    "appointmentId": "string",
    "screenSharing": {
      "active": "boolean",
      "userId": "string",
      "startedAt": "number"
    },
    "updatedAt": "number"
  }
}
```

### Implementation Tasks:
1. Implement WebRTC integration
2. Create video consultation interface
3. Build virtual waiting room for patients
4. Implement doctor's admission control panel
5. Add screen sharing functionality
6. Create consultation controls (mute, camera toggle, end call)
7. Implement session recording options (if enabled)

## Phase 4: Secure Messaging

**Objective:** Implement end-to-end encrypted chat between patients and healthcare providers.

### API Endpoints:

#### Get All Conversations
- **Endpoint:** `GET /api/v1/chats`
- **Response (200):**
```json
{
  "conversations": [
    {
      "conversationId": "string",
      "participants": ["string"],
      "subject": "string",
      "lastMessage": {
        "messageId": "string",
        "content": "string",
        "senderId": "string",
        "timestamp": "number",
        "readBy": ["string"]
      },
      "unreadCount": "number",
      "createdAt": "number",
      "updatedAt": "number"
    }
  ]
}
```

#### Create Conversation
- **Endpoint:** `POST /api/v1/chats`
- **Request Body:**
```json
{
  "participants": ["string"],
  "subject": "string",
  "e2eeEnabled": "boolean"
}
```
- **Response (201):**
```json
{
  "conversation": {
    "conversationId": "string",
    "participants": ["string"],
    "subject": "string",
    "e2eeEnabled": "boolean",
    "createdAt": "number",
    "createdBy": "string"
  }
}
```

#### Get Messages
- **Endpoint:** `GET /api/v1/chats/:conversationId/messages`
- **Response (200):**
```json
{
  "messages": [
    {
      "messageId": "string",
      "conversationId": "string",
      "senderId": "string",
      "senderName": "string",
      "content": "string",
      "timestamp": "number",
      "readBy": ["string"],
      "encryptionMetadata": {
        "algorithm": "string",
        "keyId": "string"
      }
    }
  ],
  "conversationDetails": {
    "conversationId": "string",
    "subject": "string",
    "participants": [
      {
        "userId": "string",
        "firstName": "string",
        "lastName": "string",
        "role": "string",
        "profileImage": "string"
      }
    ],
    "e2eeEnabled": "boolean"
  }
}
```

#### Send Message
- **Endpoint:** `POST /api/v1/chats/:conversationId/messages`
- **Request Body:**
```json
{
  "content": "string",
  "encryptionMetadata": {
    "algorithm": "string",
    "keyId": "string"
  }
}
```
- **Response (201):**
```json
{
  "messageDetails": {
    "messageId": "string",
    "conversationId": "string",
    "senderId": "string",
    "content": "string",
    "timestamp": "number",
    "encryptionMetadata": {
      "algorithm": "string",
      "keyId": "string"
    }
  }
}
```

#### Mark Messages as Read
- **Endpoint:** `PUT /api/v1/chats/:conversationId/read`
- **Request Body:**
```json
{
  "messageIds": ["string"]
}
```
- **Response (200):**
```json
{
  "success": "boolean",
  "updatedMessages": ["string"]
}
```

#### Get AI Response
- **Endpoint:** `POST /api/v1/chats/:conversationId/ai-response`
- **Request Body:**
```json
{
  "message": "string"
}
```
- **Response (201):**
```json
{
  "messageDetails": {
    "messageId": "string",
    "conversationId": "string",
    "senderId": "system",
    "content": "string",
    "timestamp": "number",
    "isAI": "boolean"
  }
}
```

### Implementation Tasks:
1. Implement conversation list and message threads
2. Create message composition UI
3. Implement end-to-end encryption for messages
4. Add read receipts functionality
5. Create typing indicators
6. Implement message search
7. Integrate Dialogflow AI responses
8. Create automatic message categorization

## Phase 5: Payment Processing

**Objective:** Implement secure payment processing for appointments.

### API Endpoints:

#### Process Payment
- **Endpoint:** `POST /api/v1/payments`
- **Request Body:**
```json
{
  "appointmentId": "string",
  "amount": "number",
  "paymentMethod": "string",
  "cardDetails": {
    "number": "string",
    "expiryMonth": "string",
    "expiryYear": "string",
    "cvc": "string"
  }
}
```
- **Response (200):**
```json
{
  "payment": {
    "paymentId": "string",
    "appointmentId": "string",
    "userId": "string",
    "amount": "number",
    "status": "string",
    "transactionId": "string",
    "paymentMethod": "string",
    "createdAt": "number"
  }
}
```

#### Get Payment By ID
- **Endpoint:** `GET /api/v1/payments/:id`
- **Response (200):**
```json
{
  "paymentId": "string",
  "appointmentId": "string",
  "userId": "string",
  "amount": "number",
  "status": "string",
  "transactionId": "string",
  "paymentMethod": "string",
  "createdAt": "number",
  "appointmentDetails": {
    "appointmentId": "string",
    "patientId": "string",
    "doctorId": "string",
    "startTime": "string (ISO date)",
    "endTime": "string (ISO date)",
    "appointmentType": "string"
  }
}
```

#### Get Payment History
- **Endpoint:** `GET /api/v1/payments`
- **Response (200):**
```json
{
  "payments": [
    {
      "paymentId": "string",
      "appointmentId": "string",
      "amount": "number",
      "status": "string",
      "paymentMethod": "string",
      "createdAt": "number",
      "appointmentDetails": {
        "appointmentId": "string",
        "startTime": "string (ISO date)",
        "doctorName": "string",
        "appointmentType": "string"
      }
    }
  ]
}
```

#### Get Appointment Payments
- **Endpoint:** `GET /api/v1/payments/appointment/:appointmentId`
- **Response (200):**
```json
{
  "payments": [
    {
      "paymentId": "string",
      "appointmentId": "string",
      "userId": "string",
      "amount": "number",
      "status": "string",
      "transactionId": "string",
      "paymentMethod": "string",
      "createdAt": "number"
    }
  ],
  "appointmentDetails": {
    "appointmentId": "string",
    "patientId": "string",
    "doctorId": "string",
    "startTime": "string (ISO date)",
    "endTime": "string (ISO date)",
    "appointmentType": "string",
    "status": "string"
  }
}
```

### Implementation Tasks:
1. Create payment form with card validation
2. Implement payment processing workflow
3. Build payment history and receipt views
4. Create payment status tracking
5. Implement payment confirmation notifications
6. Add invoice generation functionality

## Phase 6: Notifications and Integration

**Objective:** Implement notifications and integrate all previous phases into a cohesive application.

### API Endpoints:

#### Get Notifications
- **Endpoint:** `GET /api/v1/notifications`
- **Response (200):**
```json
{
  "notifications": [
    {
      "notificationId": "string",
      "userId": "string",
      "type": "string",
      "content": "string",
      "relatedId": "string",
      "isRead": "boolean",
      "createdAt": "number"
    }
  ]
}
```

#### Mark Notification as Read
- **Endpoint:** `PUT /api/v1/notifications/:id/read`
- **Response (200):**
```json
{
  "notificationId": "string",
  "isRead": "boolean",
  "updatedAt": "number"
}
```

#### Mark All Notifications as Read
- **Endpoint:** `PUT /api/v1/notifications/read-all`
- **Response (200):**
```json
{
  "success": "boolean",
  "updatedCount": "number"
}
```

### Implementation Tasks:
1. Create notification center
2. Implement real-time notification updates
3. Build system-wide search functionality
4. Create dashboard views for different user roles
5. Implement analytics and reporting (for admin/doctors)
6. Create responsive mobile views for all features
7. Perform end-to-end testing and integration
8. Implement feedback and rating system for consultations


## Integration Strategy

After each phase:

1. **Integration Testing:** Conduct thorough testing to ensure new features work with existing ones
2. **User Testing:** Gather feedback from stakeholders representing different user roles
3. **Documentation:** Update user and technical documentation for new features
4. **Performance Review:** Analyze application performance and make necessary optimizations
5. **Security Audit:** Review and validate security measures for new features

This phased approach ensures gradual, stable development while providing functional increments at the end of each phase. Each phase builds upon previous ones, resulting in a fully integrated application by the end of the process. 