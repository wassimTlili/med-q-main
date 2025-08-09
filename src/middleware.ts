import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth/') ||
    pathname === '/auth' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated by looking for the auth token cookie
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated users, let the page handle profile completion check
  // This avoids the Edge Runtime issues with Prisma and JWT verification
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (authentication pages)
     * - profile/complete (profile completion page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth|profile/complete).*)',
  ],
}; 