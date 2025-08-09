import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;
  
  // Check if user is authenticated
  const isAuthenticated = token ? verifyToken(token) : false;
  
  // Define protected routes - all routes that require authentication
  const protectedRoutes = [
    '/dashboard', 
    '/admin', 
    '/profile', 
    '/settings', 
    '/lecture', 
    '/specialty',
    '/exercices'
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  // Define auth routes
  const isAuthPage = pathname.startsWith('/auth');
  
  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  
  // If user is authenticated and trying to access auth page
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Check admin routes
  if (pathname.startsWith('/admin') && isAuthenticated) {
    try {
      const decoded = jwt.verify(token!, JWT_SECRET) as { role: string };
      if (decoded.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }
  
  return NextResponse.next();
}

function verifyToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (error) {
    return false;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 