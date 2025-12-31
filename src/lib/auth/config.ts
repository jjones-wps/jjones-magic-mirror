import type { NextAuthConfig } from 'next-auth';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: string;
  }
}

// Edge-compatible auth config (no Node.js dependencies)
export const authConfig: NextAuthConfig = {
  providers: [], // Providers added in server-side config

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.name = user.name;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      // Assign custom user object
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
        session.user.role = token.role as string;
      }

      return session;
    },

    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = request.nextUrl.pathname.startsWith('/admin');
      const isOnLogin = request.nextUrl.pathname === '/admin/login';
      const isAdminApi = request.nextUrl.pathname.startsWith('/api/admin');

      // Allow login page access
      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/admin', request.nextUrl));
        }
        return true;
      }

      // Protect admin routes
      if (isOnAdmin || isAdminApi) {
        if (!isLoggedIn) {
          return Response.redirect(new URL('/admin/login', request.nextUrl));
        }
        return true;
      }

      // Allow all other routes (mirror display)
      return true;
    },
  },

  debug: process.env.NODE_ENV === 'development',
};
