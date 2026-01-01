// @ts-nocheck
import NextAuth from 'next-auth';
import { serverAuthConfig } from './config.server';

// Server-side auth for API routes (includes Prisma provider)
const nextAuth = NextAuth(serverAuthConfig);

export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
