import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: string;
    hasActiveSubscription?: boolean;
  };
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest | null> {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        email: true, 
        role: true,
        hasActiveSubscription: true,
        subscriptionExpiresAt: true
      }
    });
    
    if (!user) {
      return null;
    }
    
    // Check if subscription is still active
    const hasActiveSubscription = user.hasActiveSubscription && 
      (!user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date());
    
    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      hasActiveSubscription
    };
    
    return authenticatedRequest;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export function requireAuth<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const authenticatedRequest = await authenticateRequest(request);
    
    if (!authenticatedRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return handler(authenticatedRequest, ...args);
  };
}

export function requireAdmin<T extends any[]>(
  handler: (req: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T) => {
    const authenticatedRequest = await authenticateRequest(request);
    
    if (!authenticatedRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (authenticatedRequest.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    return handler(authenticatedRequest, ...args);
  };
}

export async function verifyAuth(request: NextRequest): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('auth-token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return { success: false, error: 'No token provided' };
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true }
    });
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Invalid token' };
  }
} 