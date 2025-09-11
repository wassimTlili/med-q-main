import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });
    
    // Clear the auth cookie
    const proto = (request.headers.get('x-forwarded-proto') || request.nextUrl.protocol || '').replace(':','');
    const secure = proto === 'https';
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 