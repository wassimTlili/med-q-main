import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
  // Check email verification only if configured and applicable
  const hasResend = !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your-resend-api-key';
  const requireEmailVerification = (process.env.AUTH_REQUIRE_EMAIL_VERIFICATION ?? 'true') !== 'false' && hasResend;
  if (requireEmailVerification && user.password && user.status !== 'verified') {
      return NextResponse.json(
        { 
          error: 'Please verify your email address before logging in. Check your inbox for a verification link.',
          needsVerification: true
        },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data (without password) and token
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    const response = NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Login successful'
    });
    
    // Set HTTP-only cookie
    const proto = (request.headers.get('x-forwarded-proto') || request.nextUrl.protocol || '').replace(':','');
    const secure = proto === 'https';
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 