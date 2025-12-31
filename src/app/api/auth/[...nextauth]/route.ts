import NextAuth from 'next-auth';
import { serverAuthConfig } from '@/lib/auth/config.server';

// Server-side auth handlers with Prisma provider
const { handlers } = NextAuth(serverAuthConfig);

export const { GET, POST } = handlers;
