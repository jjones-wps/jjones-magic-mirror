import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { authConfig } from './config';

// Extend JWT types for server-side use (next-auth v5)
declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  }
}

// Server-side auth config with Prisma provider
export const serverAuthConfig: NextAuthConfig = {
  ...authConfig,

  providers: [
    Credentials({
      id: 'credentials',
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[Auth] Missing credentials');
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          // First, try to find user in database
          let user = await prisma.user.findUnique({
            where: { email },
          });

          // If no user exists and this is the admin email, create from env
          if (!user && email === process.env.ADMIN_EMAIL) {
            const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;
            if (envPasswordHash && bcrypt.compareSync(password, envPasswordHash)) {
              // Create the admin user in the database
              user = await prisma.user.create({
                data: {
                  email,
                  passwordHash: envPasswordHash,
                  name: 'Admin',
                  role: 'admin',
                },
              });
              console.log('[Auth] Created admin user from env credentials');
            }
          }

          if (!user) {
            console.log('[Auth] User not found:', email);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            console.log('[Auth] Invalid password for:', email);

            // Log failed attempt
            await prisma.activityLog.create({
              data: {
                action: 'auth.login.failed',
                category: 'auth',
                details: JSON.stringify({ email, reason: 'invalid_password' }),
              },
            });

            return null;
          }

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          // Log successful login
          await prisma.activityLog.create({
            data: {
              action: 'auth.login.success',
              category: 'auth',
              userId: user.id,
              details: JSON.stringify({ email }),
            },
          });

          console.log('[Auth] Login successful:', email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('[Auth] Error during authentication:', error);
          return null;
        }
      },
    }),
  ],

  events: {
    async signOut(message) {
      // message can contain either { session } or { token }
      const userId =
        'token' in message && message.token?.id ? (message.token.id as string) : undefined;

      if (userId) {
        try {
          await prisma.activityLog.create({
            data: {
              action: 'auth.logout',
              category: 'auth',
              userId,
            },
          });
        } catch {
          // Ignore errors during signout logging
        }
      }
    },
  },
};
