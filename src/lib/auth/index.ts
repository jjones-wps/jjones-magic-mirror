import NextAuth from 'next-auth';
import { authConfig } from './config';

// Edge-compatible auth for middleware (no JWT utilities, no Prisma)
export const { auth } = NextAuth(authConfig);

// Re-export config
export { authConfig } from './config';
