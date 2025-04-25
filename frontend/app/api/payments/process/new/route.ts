import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/app/lib/networkUtils';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // Get authentication token from request headers or cookies as fallback
    const authHeader = req.headers.get('Authorization');
    let authToken;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token from Authorization header
      authToken = authHeader.split(' ')[1];
    } else {
      // Fallback to cookies if header is not present
      authToken = cookies().get('authToken')?.value;
    }
    
    if (!authToken) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const paymentData = await req.json();
    
    // Forward request to backend API
    const API_URL = getApiUrl();
    const response = await fetch(`${API_URL}/payments/process/new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(paymentData)
    });
    
    // Get response data
    const data = await response.json();
    
    // Return same status code and data from backend
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { message: error.message || 'Error processing payment' },
      { status: 500 }
    );
  }
} 