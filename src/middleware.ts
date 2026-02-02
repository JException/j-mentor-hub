import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Allow Server Actions (POST requests) to pass through
  // If we don't do this, the middleware might redirect a login attempt 
  // returning HTML to a function expecting JSON, causing the crash.
  if (request.method === 'POST') {
    return NextResponse.next();
  }

  // 2. Get the path the user is trying to visit
  const path = request.nextUrl.pathname;

  // 3. Define public paths
  const isPublicPath = path === '/login';

  // 4. Get the "nametag" (cookie)
  const token = request.cookies.get('audit_user')?.value || '';

  // 5. REDIRECT LOGIC:
  
  // A. If user is on Login page but HAS a token -> Go to Dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // B. If user is on Dashboard (protected) but NO token -> Go to Login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }
  
  return NextResponse.next();
}

// 6. Updated Matcher (Standard Next.js Pattern)
// This prevents the middleware from running on static files/images unintentionally
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};