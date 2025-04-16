import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic API proxy that forwards requests to the backend
 * This allows the frontend to share the same hostname with the backend
 * making cross-origin requests much simpler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return await proxyRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return await proxyRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return await proxyRequest(request, params.path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return await proxyRequest(request, params.path, 'DELETE');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return await proxyRequest(request, params.path, 'OPTIONS');
}

/**
 * Helper function to proxy requests to the backend
 */
async function proxyRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  // Get the current hostname (works in both browser and server environments)
  const hostname = request.headers.get('host')?.split(':')[0] || 'localhost';
  
  // Get backend port from environment variable, default to 3001
  const apiPort = process.env.NEXT_PUBLIC_API_PORT || '3001';
  
  // Use the same hostname with the backend port
  const apiUrl = `http://${hostname}:${apiPort}/api/v1/${path.join('/')}`;
  
  // Log the proxy request
  console.log(`Proxying ${method} request to ${apiUrl}`);
  
  // Create options for fetch with the right method
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Forward authorization header if it exists
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    options.headers = {
      ...options.headers,
      'authorization': authHeader,
    };
  }

  // Add body for non-GET/HEAD/OPTIONS requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      const body = await request.json();
      options.body = JSON.stringify(body);
    } catch (e) {
      // Ignore JSON parsing errors for empty bodies
    }
  }

  try {
    const response = await fetch(apiUrl, options);
    const data = await response.json();
    
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 500 }
    );
  }
} 