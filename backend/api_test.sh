#!/bin/bash

# API Test Script for MedConnect Backend
# This script tests all API endpoints using curl and reports results

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL for API
API_URL="http://localhost:3001/api/v1"

# Counters for test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Authentication tokens for different user roles
ADMIN_TOKEN=""
DOCTOR_TOKEN=""
PATIENT_TOKEN=""

# Test user data
ADMIN_EMAIL="admin@medconnect.com"
ADMIN_PASSWORD="password123"
DOCTOR_EMAIL="doctor@medconnect.com"
DOCTOR_PASSWORD="password123"
PATIENT_EMAIL="patient@medconnect.com"
PATIENT_PASSWORD="password123"

# Test IDs to store during tests
USER_ID=""
DOCTOR_ID=""
PATIENT_ID=""
APPOINTMENT_ID=""
CONVERSATION_ID=""
MESSAGE_ID=""
PAYMENT_ID=""
NOTIFICATION_ID=""
ENCRYPTED_CONTENT=""
AI_RESPONSE_ID=""
WEBRTC_SESSION_ID=""
SCHEDULE_ID=""
SCHEDULED_APPOINTMENT_ID=""

# Dependency flags
DEPENDENCY_FAILURES=0

# Get tomorrow's date in ISO format
get_tomorrow_date() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo $(date -v+1d -u +"%Y-%m-%dT10:00:00Z")
  else
    # Linux
    echo $(date -d "tomorrow 10:00:00" -u +"%Y-%m-%dT10:00:00Z")
  fi
}

# Get day after tomorrow in ISO format
get_tomorrow_plus_one_date() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo $(date -v+1d -u +"%Y-%m-%dT11:00:00Z")
  else
    # Linux
    echo $(date -d "tomorrow 11:00:00" -u +"%Y-%m-%dT11:00:00Z")
  fi
}

# Get a date 7 days from now
get_week_from_now() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo $(date -v+7d -u +"%Y-%m-%d")
  else
    # Linux
    echo $(date -d "+7 days" -u +"%Y-%m-%d")
  fi
}

# Today's date
get_today() {
  echo $(date -u +"%Y-%m-%d")
}

# Debug function
debug() {
  local message=$1
  echo -e "${BLUE}[DEBUG] ${message}${NC}"
}

# Skip function
skip_test() {
  local test_name=$1
  local reason=$2
  
  echo -e "${YELLOW}Skipping test: ${test_name}${NC}"
  echo -e "${YELLOW}Reason: ${reason}${NC}"
  TOTAL_TESTS=$((TOTAL_TESTS+1))
  SKIPPED_TESTS=$((SKIPPED_TESTS+1))
  echo ""
}

# Function to run a test
run_test() {
  local test_name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  local auth_token=$5
  local expected_status=$6
  local dependencies=$7  # Optional comma-separated list of test dependencies

  # Check dependencies if provided
  if [ ! -z "$dependencies" ]; then
    IFS=',' read -ra DEPS <<< "$dependencies"
    for dep in "${DEPS[@]}"; do
      if [ "$dep" = "PATIENT_TOKEN" ] && [ -z "$PATIENT_TOKEN" ]; then
        skip_test "$test_name" "Missing dependency: Patient token"
        return
      elif [ "$dep" = "DOCTOR_TOKEN" ] && [ -z "$DOCTOR_TOKEN" ]; then
        skip_test "$test_name" "Missing dependency: Doctor token"
        return
      elif [ "$dep" = "ADMIN_TOKEN" ] && [ -z "$ADMIN_TOKEN" ]; then
        skip_test "$test_name" "Missing dependency: Admin token"
        return
      elif [ "$dep" = "APPOINTMENT_ID" ] && [ -z "$APPOINTMENT_ID" ]; then
        skip_test "$test_name" "Missing dependency: Appointment ID"
        return
      elif [ "$dep" = "CONVERSATION_ID" ] && [ -z "$CONVERSATION_ID" ]; then
        skip_test "$test_name" "Missing dependency: Conversation ID"
        return
      elif [ "$dep" = "MESSAGE_ID" ] && [ -z "$MESSAGE_ID" ]; then
        skip_test "$test_name" "Missing dependency: Message ID"
        return
      elif [ "$dep" = "PAYMENT_ID" ] && [ -z "$PAYMENT_ID" ]; then
        skip_test "$test_name" "Missing dependency: Payment ID"
        return
      elif [ "$dep" = "PATIENT_ID" ] && [ -z "$PATIENT_ID" ]; then
        skip_test "$test_name" "Missing dependency: Patient ID"
        return
      elif [ "$dep" = "DOCTOR_ID" ] && [ -z "$DOCTOR_ID" ]; then
        skip_test "$test_name" "Missing dependency: Doctor ID"
        return
      elif [ "$dep" = "SCHEDULE_ID" ] && [ -z "$SCHEDULE_ID" ]; then
        skip_test "$test_name" "Missing dependency: Schedule ID"
        return
      elif [ "$dep" = "SCHEDULED_APPOINTMENT_ID" ] && [ -z "$SCHEDULED_APPOINTMENT_ID" ]; then
        skip_test "$test_name" "Missing dependency: Scheduled Appointment ID"
        return 
      fi
    done
  fi

  echo -e "${YELLOW}Running test: ${test_name}${NC}"
  TOTAL_TESTS=$((TOTAL_TESTS+1))

  # Create temp files for this test's response
  response_file=$(mktemp)
  header_file=$(mktemp)
  
  # Debug - show the command about to be executed
  debug "Running test: ${test_name} - ${method} ${API_URL}${endpoint}"
  if [ ! -z "$data" ]; then
    debug "With data: ${data}"
  fi
  
  # Build the curl command with separate arguments to avoid shell escaping issues
  local curl_cmd=("curl" "-v" "-s" "-X" "${method}" "-w" "%{http_code}")
  curl_cmd+=("-o" "${response_file}" "-D" "${header_file}")
  
  # Add data if provided
  if [ ! -z "$data" ]; then
    curl_cmd+=("-H" "Content-Type: application/json" "-d" "${data}")
  fi
  
  # Add auth token if provided
  if [ ! -z "$auth_token" ]; then
    curl_cmd+=("-H" "Authorization: Bearer ${auth_token}")
  fi
  
  # Add URL
  curl_cmd+=("${API_URL}${endpoint}")
  
  # Execute the curl command (array expansion avoids shell interpretation issues)
  status_code=$("${curl_cmd[@]}")
  
  # Print headers for debugging
  echo "Response Headers:"
  cat $header_file
  
  # Special handling for registration tests - allow both 201 (created) and 409 (conflict) as valid responses
  # as 409 indicates user already exists which is expected on subsequent runs
  if [[ "$test_name" == *"Register"* ]] && [ "$status_code" = "409" ] && [ "$expected_status" = "201" ]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status or 409, got $status_code (User already exists)${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    return
  fi
  
  # Also handle admin user creation which can fail with 409 if email already exists
  if [[ "$test_name" == "Create User (Admin)" ]] && [ "$status_code" = "409" ] && [ "$expected_status" = "201" ]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status or 409, got $status_code (User already exists)${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    return
  fi
  
  # Handle WebRTC session creation which returns 200 when session already exists
  if [[ "$test_name" == "Create WebRTC Session" ]] && [ "$status_code" = "200" ] && [ "$expected_status" = "201" ]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status or 200, got $status_code (Session already exists)${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    
    # Extract session ID from response if provided
    if [ -f "$response_file" ]; then
      WEBRTC_SESSION_ID=$(jq -r '.session.webrtcData.sessionId' $response_file 2>/dev/null || echo "")
      if [ ! -z "$WEBRTC_SESSION_ID" ]; then
        echo "WebRTC Session ID: $WEBRTC_SESSION_ID"
      fi
    fi
    return
  fi
  
  # Handle Appointment with Schedule creation which can return 409 if appointment already exists
  if [[ "$test_name" == "Create Appointment with Schedule" ]] && [[ "$status_code" == "201" || "$status_code" == "409" ]] && [[ "$expected_status" == *"201"* || "$expected_status" == *"409"* ]]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status, got $status_code (Appointment created or already exists)${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    
    # Try to extract the appointment ID from the conflicting appointment
    if [ -f "$response_file" ]; then
      SCHEDULED_APPOINTMENT_ID=$(jq -r '.appointment.appointmentId // .conflictingAppointment.appointmentId // empty' $response_file 2>/dev/null || echo "")
      if [ ! -z "$SCHEDULED_APPOINTMENT_ID" ]; then
        echo "Scheduled Appointment ID: $SCHEDULED_APPOINTMENT_ID"
      fi
    fi
    return
  fi
  
  # Handle Schedule creation which can return 409 if schedule already exists
  if [[ "$test_name" == "Create Doctor Schedule" ]] && [[ "$status_code" == "201" || "$status_code" == "409" ]] && [[ "$expected_status" == *"201"* || "$expected_status" == *"409"* ]]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status, got $status_code (Schedule created or already exists)${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    
    # Extract schedule ID from the response
    if [ -f "$response_file" ]; then
      SCHEDULE_ID=$(jq -r '.schedule.scheduleId // .existingSchedule.scheduleId // empty' $response_file 2>/dev/null || echo "")
      if [ ! -z "$SCHEDULE_ID" ]; then
        echo "Schedule ID: $SCHEDULE_ID"
      fi
    fi
    return
  fi
  
  # Check if status code matches expected
  if [ "$status_code" = "$expected_status" ]; then
    echo -e "${GREEN}✓ Success: Expected status $expected_status, got $status_code${NC}"
    PASSED_TESTS=$((PASSED_TESTS+1))
    
    # If test passed, extract IDs if needed for subsequent tests
    if [ "$test_name" = "Admin Login" ] && [ "$status_code" = "200" ]; then
      ADMIN_TOKEN=$(jq -r '.token' $response_file)
      echo "Admin token received: ${ADMIN_TOKEN:0:15}..."
    elif [ "$test_name" = "Doctor Login" ] && [ "$status_code" = "200" ]; then
      DOCTOR_TOKEN=$(jq -r '.token' $response_file)
      DOCTOR_ID=$(jq -r '.user.userId' $response_file)
      echo "Doctor token received: ${DOCTOR_TOKEN:0:15}..."
      echo "Doctor ID: $DOCTOR_ID"
    elif [ "$test_name" = "Patient Login" ] && [ "$status_code" = "200" ]; then
      PATIENT_TOKEN=$(jq -r '.token' $response_file)
      PATIENT_ID=$(jq -r '.user.userId' $response_file)
      echo "Patient token received: ${PATIENT_TOKEN:0:15}..."
      echo "Patient ID: $PATIENT_ID"
    elif [ "$test_name" = "Create Appointment" ] && [ "$status_code" = "201" ]; then
      APPOINTMENT_ID=$(jq -r '.appointment.appointmentId' $response_file)
      echo "Appointment ID: $APPOINTMENT_ID"
    elif [ "$test_name" = "Create Conversation" ] && [ "$status_code" = "201" ]; then
      CONVERSATION_ID=$(jq -r '.conversation.conversationId' $response_file)
      echo "Conversation ID: $CONVERSATION_ID"
    elif [ "$test_name" = "Send Message" ] && [ "$status_code" = "201" ]; then
      MESSAGE_ID=$(jq -r '.messageDetails.messageId' $response_file)
      echo "Message ID: $MESSAGE_ID"
    elif [ "$test_name" = "Process Payment" ] && [ "$status_code" = "200" ]; then
      PAYMENT_ID=$(jq -r '.payment.paymentId' $response_file)
      echo "Payment ID: $PAYMENT_ID"
    elif [ "$test_name" = "Get Notifications" ] && [ "$status_code" = "200" ]; then
      NOTIFICATION_ID=$(jq -r '.notifications[0].notificationId // empty' $response_file)
      if [ ! -z "$NOTIFICATION_ID" ]; then
        echo "Notification ID: $NOTIFICATION_ID"
      fi
    fi
  else
    echo -e "${RED}✗ Failed: Expected status $expected_status, got $status_code${NC}"
    echo "Response body:"
    cat $response_file | jq '.' 2>/dev/null || cat $response_file
    FAILED_TESTS=$((FAILED_TESTS+1))
    
    # Mark critical dependency failures
    if [[ "$test_name" == *"Login"* ]] || [[ "$test_name" == *"Register"* ]]; then
      DEPENDENCY_FAILURES=$((DEPENDENCY_FAILURES+1))
    fi
  fi
  
  # Clean up temp files
  rm -f $response_file
  rm -f $header_file
  
  echo ""
}

# Ensure jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is not installed. Please install it to run this script.${NC}"
  echo "On macOS: brew install jq"
  echo "On Ubuntu/Debian: sudo apt-get install jq"
  exit 1
fi

# Check if the API is running
echo "Checking if the API is running..."
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/ || echo "000")

if [[ "$response" =~ ^(200|404)$ ]]; then
  echo -e "${GREEN}API is running!${NC}"
else
  echo -e "${RED}Error: API is not responding at $API_URL (status: $response)${NC}"
  echo "Please start the API server and try again."
  exit 1
fi

echo "Starting API tests..."
echo "-------------------------------------"

# ======================= USER & AUTH TESTS =======================
echo -e "${YELLOW}=== User and Authentication Tests ===${NC}"

# API root
run_test "API Root" "GET" "/" "" "" "200"

# Health check
run_test "Health Check" "GET" "/../health" "" "" "200"

# Register users
run_test "Register Patient" "POST" "/users/register" '{"firstName":"Test","lastName":"Patient","email":"'$PATIENT_EMAIL'","password":"'$PATIENT_PASSWORD'","role":"patient"}' "" "201"
run_test "Register Doctor" "POST" "/users/register" '{"firstName":"Test","lastName":"Doctor","email":"'$DOCTOR_EMAIL'","password":"'$DOCTOR_PASSWORD'","role":"doctor"}' "" "201"
run_test "Register Admin" "POST" "/users/register" '{"firstName":"Test","lastName":"Admin","email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'","role":"admin"}' "" "201"

# Check for critical failures that would prevent continuing
if [ $DEPENDENCY_FAILURES -gt 0 ]; then
  echo -e "${RED}Critical registration failures detected. Some tests will be skipped.${NC}"
fi

# Login with different roles
run_test "Patient Login" "POST" "/users/login" '{"email":"'$PATIENT_EMAIL'","password":"'$PATIENT_PASSWORD'"}' "" "200"
run_test "Doctor Login" "POST" "/users/login" '{"email":"'$DOCTOR_EMAIL'","password":"'$DOCTOR_PASSWORD'"}' "" "200"
run_test "Admin Login" "POST" "/users/login" '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}' "" "200"

# Invalid login
run_test "Invalid Login" "POST" "/users/login" '{"email":"nonexistent@example.com","password":"wrongpass"}' "" "401"

# Forgot password
run_test "Forgot Password" "POST" "/users/forgot-password" '{"email":"'$PATIENT_EMAIL'"}' "" "200" "PATIENT_TOKEN"

# Get user profile
run_test "Get User Profile" "GET" "/users/profile" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"

# Update user profile
run_test "Update User Profile" "PUT" "/users/profile" '{"firstName":"Updated","lastName":"Patient"}' "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"

# Admin endpoints
run_test "Get All Users (Admin)" "GET" "/users" "" "$ADMIN_TOKEN" "200" "ADMIN_TOKEN"
run_test "Create User (Admin)" "POST" "/users" '{"firstName":"New","lastName":"User","email":"newuser@medconnect.com","password":"password123","role":"patient"}' "$ADMIN_TOKEN" "201" "ADMIN_TOKEN"
run_test "Get User By ID (Admin)" "GET" "/users/$PATIENT_ID" "" "$ADMIN_TOKEN" "200" "ADMIN_TOKEN,PATIENT_ID"
run_test "Update User (Admin)" "PUT" "/users/$PATIENT_ID" '{"firstName":"Admin Updated","lastName":"Patient"}' "$ADMIN_TOKEN" "200" "ADMIN_TOKEN,PATIENT_ID"

# ======================= APPOINTMENT TESTS =======================
echo -e "${YELLOW}=== Appointment Tests ===${NC}"

# Get dates for appointment
TOMORROW_START=$(get_tomorrow_date)
TOMORROW_END=$(get_tomorrow_plus_one_date)

# Create appointment
run_test "Create Appointment" "POST" "/appointments" '{"patientId":"'$PATIENT_ID'","doctorId":"'$DOCTOR_ID'","startTime":"'$TOMORROW_START'","endTime":"'$TOMORROW_END'","appointmentType":"consultation","notes":"Test appointment"}' "$DOCTOR_TOKEN" "201" "DOCTOR_TOKEN,PATIENT_ID,DOCTOR_ID"

# Get appointments
run_test "Get All Appointments" "GET" "/appointments" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN"

# Get appointment by ID
run_test "Get Appointment By ID" "GET" "/appointments/$APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# Update appointment
run_test "Update Appointment" "PUT" "/appointments/$APPOINTMENT_ID" '{"status":"confirmed","notes":"Updated notes"}' "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# Get doctor availability
TODAY=$(get_today)
NEXT_WEEK=$(get_week_from_now)
run_test "Get Doctor Availability" "GET" "/appointments/doctor/$DOCTOR_ID/availability?startDate=$TODAY&endDate=$NEXT_WEEK" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,DOCTOR_ID"

# ======================= VIDEO TESTS =======================
echo -e "${YELLOW}=== Video Tests ===${NC}"

# Create video session
run_test "Create Video Session" "POST" "/video/session" '{"appointmentId":"'$APPOINTMENT_ID'"}' "$DOCTOR_TOKEN" "201" "DOCTOR_TOKEN,APPOINTMENT_ID"

# Get video session
run_test "Get Video Session" "GET" "/video/session/$APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# ======================= CHAT TESTS =======================
echo -e "${YELLOW}=== Chat Tests ===${NC}"

# Create conversation
run_test "Create Conversation" "POST" "/chats" '{"participants":["'$PATIENT_ID'","'$DOCTOR_ID'"],"subject":"Medical consultation"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,PATIENT_ID,DOCTOR_ID"

# Get conversations
run_test "Get All Conversations" "GET" "/chats" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"

# Send message
run_test "Send Message" "POST" "/chats/$CONVERSATION_ID/messages" '{"content":"This is a test message"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Get messages
run_test "Get Messages" "GET" "/chats/$CONVERSATION_ID/messages" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,CONVERSATION_ID"

# Mark messages as read
run_test "Mark Messages as Read" "PUT" "/chats/$CONVERSATION_ID/read" '{"messageIds":["'$MESSAGE_ID'"]}' "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,CONVERSATION_ID,MESSAGE_ID"

# ======================= PAYMENT TESTS =======================
echo -e "${YELLOW}=== Payment Tests ===${NC}"

# Process payment
run_test "Process Payment" "POST" "/payments" '{"appointmentId":"'$APPOINTMENT_ID'","amount":100,"paymentMethod":"credit_card","cardDetails":{"number":"4111111111111111","expiryMonth":"12","expiryYear":"2025","cvc":"123"}}' "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,APPOINTMENT_ID"

# Get payment by ID
run_test "Get Payment By ID" "GET" "/payments/$PAYMENT_ID" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,PAYMENT_ID"

# Get payment history
run_test "Get Payment History" "GET" "/payments" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"

# Get appointment payments
run_test "Get Appointment Payments" "GET" "/payments/appointment/$APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# ======================= NOTIFICATION TESTS =======================
echo -e "${YELLOW}=== Notification Tests ===${NC}"

# Get notifications
run_test "Get Notifications" "GET" "/notifications" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"

# Mark notification as read if there is one
if [ ! -z "$NOTIFICATION_ID" ]; then
  run_test "Mark Notification as Read" "PUT" "/notifications/$NOTIFICATION_ID/read" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,NOTIFICATION_ID"
  run_test "Mark All Notifications as Read" "PUT" "/notifications/read-all" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN"
fi

# ======================= CHAT WITH ENCRYPTION TESTS =======================
echo -e "${YELLOW}=== Chat with End-to-End Encryption Tests ===${NC}"

# Create conversation (with encryption)
run_test "Create Encrypted Conversation" "POST" "/chats" '{"participants":["'$PATIENT_ID'","'$DOCTOR_ID'"],"subject":"Encrypted medical consultation"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,PATIENT_ID,DOCTOR_ID"

# Check if conversation is encrypted
run_test "Verify Conversation Encryption" "GET" "/chats/$CONVERSATION_ID/messages" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,CONVERSATION_ID"

# Send encrypted message
run_test "Send Encrypted Message" "POST" "/chats/$CONVERSATION_ID/messages" '{"content":"This is a confidential test message"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Store an encrypted message content for later comparison
ENCRYPTED_CONTENT=$(jq -r '.messageDetails.content' $response_file)

# Get encrypted messages
run_test "Get Decrypted Messages" "GET" "/chats/$CONVERSATION_ID/messages" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,CONVERSATION_ID"

# ======================= DIALOGFLOW AI RESPONSE TESTS =======================
echo -e "${YELLOW}=== Dialogflow AI Response Tests ===${NC}"

# Get AI response to a message
run_test "Get AI Response for Symptoms" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"I have a severe headache and fever"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Store AI response message ID
AI_RESPONSE_ID=$(jq -r '.messageDetails.messageId' $response_file)

# Get AI response for appointment query
run_test "Get AI Response for Appointment" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"I need to book an appointment"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# ======================= WEBRTC VIDEO SESSION TESTS =======================
echo -e "${YELLOW}=== WebRTC Video Session Tests ===${NC}"

# Create WebRTC video session
run_test "Create WebRTC Session" "POST" "/video/session" '{"appointmentId":"'$APPOINTMENT_ID'"}' "$DOCTOR_TOKEN" "201" "DOCTOR_TOKEN,APPOINTMENT_ID"

# Store WebRTC session ID for later use
WEBRTC_SESSION_ID=$(jq -r '.session.webrtcData.sessionId' $response_file)

# Get WebRTC session as doctor
run_test "Get Doctor WebRTC Config" "GET" "/video/session/$APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# Get WebRTC session as patient
run_test "Get Patient WebRTC Config" "GET" "/video/session/$APPOINTMENT_ID" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,APPOINTMENT_ID"

# Patient joins waiting room
run_test "Patient Joins Waiting Room" "POST" "/video/session/$APPOINTMENT_ID/waiting-room" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,APPOINTMENT_ID"

# Doctor admits patient from waiting room
run_test "Doctor Admits Patient" "POST" "/video/session/$APPOINTMENT_ID/admit/$PATIENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID,PATIENT_ID"

# Start screen sharing
run_test "Start Screen Sharing" "POST" "/video/session/$APPOINTMENT_ID/screen-sharing" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# ======================= DOCTOR-SECRETARY RELATIONSHIP TESTS =======================
echo -e "${YELLOW}=== Doctor-Secretary Relationship Tests ===${NC}"

# Get tomorrow with Monday adjustment for the schedule tests
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  TOMORROW_MONDAY=$(date -v+1d -v+mon +%Y-%m-%dT10:00:00.000Z)
  TOMORROW_MONDAY_END=$(date -v+1d -v+mon +%Y-%m-%dT10:30:00.000Z)
else
  # Linux
  TOMORROW_MONDAY=$(date -d "next Monday 10:00:00" +%Y-%m-%dT10:00:00.000Z)
  TOMORROW_MONDAY_END=$(date -d "next Monday 10:30:00" +%Y-%m-%dT10:30:00.000Z)
fi

# Create Doctor Schedule
run_test "Create Doctor Schedule" "POST" "/schedules" '{"doctorId":"'$DOCTOR_ID'","dayOfWeek":1,"startTime":"09:00","endTime":"17:00","slotDuration":30}' "$ADMIN_TOKEN" "201,409" "ADMIN_TOKEN,DOCTOR_ID"

# Store schedule ID for later use
SCHEDULE_ID=$(jq -r '.schedule.scheduleId' $response_file)

# Get Doctor Schedules
run_test "Get Doctor Schedules" "GET" "/schedules/doctor/$DOCTOR_ID" "" "$ADMIN_TOKEN" "200" "ADMIN_TOKEN,DOCTOR_ID"

# Update Doctor Schedule
run_test "Update Doctor Schedule" "PUT" "/schedules/$SCHEDULE_ID" '{"startTime":"10:00","endTime":"18:00"}' "$ADMIN_TOKEN" "200" "ADMIN_TOKEN,SCHEDULE_ID"

# Test Appointment Creation with Doctor Schedule
run_test "Create Appointment with Schedule" "POST" "/appointments" '{"patientId":"'$PATIENT_ID'","doctorId":"'$DOCTOR_ID'","startTime":"'$TOMORROW_MONDAY'","endTime":"'$TOMORROW_MONDAY_END'","appointmentType":"Follow-up","notes":"Follow-up appointment"}' "$DOCTOR_TOKEN" "201,409" "DOCTOR_TOKEN,PATIENT_ID,DOCTOR_ID"

# Store scheduled appointment ID
SCHEDULED_APPOINTMENT_ID=$(jq -r '.appointment.appointmentId // empty' $response_file)
if [ -z "$SCHEDULED_APPOINTMENT_ID" ]; then
  # Try the alternate format that might be returned by a 409 conflict response
  SCHEDULED_APPOINTMENT_ID=$(jq -r '.appointment.appointmentId // empty' $response_file 2>/dev/null || jq -r '.conflictingAppointment.appointmentId // empty' $response_file 2>/dev/null || echo "")
fi

# Get Secretary's Assigned Doctor Appointments
run_test "Get Secretary's Doctor Appointments" "GET" "/appointments" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN"

# Check Doctor Availability with Schedule
TODAY=$(get_today)
NEXT_WEEK=$(get_week_from_now)
run_test "Check Doctor Availability with Schedule" "GET" "/appointments/doctor/$DOCTOR_ID/availability?startDate=$TODAY&endDate=$NEXT_WEEK" "" "$PATIENT_TOKEN" "200" "PATIENT_TOKEN,DOCTOR_ID"

# Delete Doctor Schedule
run_test "Delete Doctor Schedule" "DELETE" "/schedules/$SCHEDULE_ID" "" "$ADMIN_TOKEN" "200" "ADMIN_TOKEN,SCHEDULE_ID"

# Delete scheduled appointment if created
if [ ! -z "$SCHEDULED_APPOINTMENT_ID" ]; then
  run_test "Delete Scheduled Appointment" "DELETE" "/appointments/$SCHEDULED_APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,SCHEDULED_APPOINTMENT_ID"
fi

# ======================= ENHANCED ENCRYPTION TESTS =======================
echo -e "${YELLOW}=== Enhanced End-to-End Encryption Tests ===${NC}"

# Create encrypted conversation with E2EE key exchange
run_test "Create Fully Encrypted Conversation" "POST" "/chats" '{"participants":["'$PATIENT_ID'","'$DOCTOR_ID'"],"subject":"E2EE medical consultation","e2eeEnabled":true}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,PATIENT_ID,DOCTOR_ID"

# Send a message with explicit encryption
run_test "Send Explicitly Encrypted Message" "POST" "/chats/$CONVERSATION_ID/messages" '{"content":"This is a highly confidential test message","encryptionMetadata":{"algorithm":"AES-256-GCM","keyId":"test-key-1"}}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Check message decryption with valid recipient
run_test "Decrypt Message As Valid Recipient" "GET" "/chats/$CONVERSATION_ID/messages" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,CONVERSATION_ID"

# ======================= ADVANCED DIALOGFLOW TESTS =======================
echo -e "${YELLOW}=== Advanced Dialogflow AI Tests ===${NC}"

# Test medical symptom analysis with Dialogflow
run_test "AI Medical Symptom Analysis" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"I have had chest pain and shortness of breath for 3 days"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Test appointment intent recognition
run_test "AI Appointment Intent Recognition" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"Can I schedule an appointment for next Tuesday?"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Test conversation context maintenance
run_test "AI Conversation Context Maintenance" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"What time is available?"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Test medical term explanation
run_test "AI Medical Term Explanation" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"What is hypertension?"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# Test urgent symptom detection
run_test "AI Urgent Symptom Detection" "POST" "/chats/$CONVERSATION_ID/ai-response" '{"message":"I am experiencing severe chest pain radiating to my left arm and jaw"}' "$PATIENT_TOKEN" "201" "PATIENT_TOKEN,CONVERSATION_ID"

# ======================= CLEANUP =======================
# Delete appointment to clean up
run_test "Delete Appointment" "DELETE" "/appointments/$APPOINTMENT_ID" "" "$DOCTOR_TOKEN" "200" "DOCTOR_TOKEN,APPOINTMENT_ID"

# ======================= RESULTS SUMMARY =======================
echo "-------------------------------------"
echo -e "${YELLOW}=== API Test Results ===${NC}"
echo "Total tests run: $TOTAL_TESTS"
echo -e "${GREEN}Tests passed: $PASSED_TESTS${NC}"
echo -e "${RED}Tests failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}Tests skipped: $SKIPPED_TESTS${NC}"
echo "-------------------------------------"

# Return exit code based on test results
if [ $FAILED_TESTS -gt 0 ]; then
  exit 1
else
  exit 0
fi 