#!/bin/bash

# Script to start the Next.js frontend with HTTPS enabled
# This ensures the webcam and microphone permissions work correctly

# Set environment variables
export HTTPS=true 
export PORT=3000

echo "Starting MedConnect frontend with HTTPS enabled..."
echo "This will allow proper camera and microphone access for video calls"

# Run the Next.js dev server with HTTPS
npx next dev --port 3000 