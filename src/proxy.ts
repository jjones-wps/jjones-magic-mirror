import { auth } from '@/lib/auth';

export default auth;

export const config = {
  // Protect admin routes and admin API routes
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
