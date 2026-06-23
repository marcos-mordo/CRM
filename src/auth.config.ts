import type { NextAuthConfig } from 'next-auth';

/**
 * Configuración "thin" compartida entre Edge (middleware) y Node (auth.ts).
 * NO incluir nada que use bcrypt, prisma o APIs Node — solo lo que pueda
 * ejecutarse en Edge Runtime para que el middleware funcione.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  providers: [], // Los providers reales se añaden en auth.ts (Node)
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Login Credentials trae todos los campos en `user`
        if ((user as any).organizationId) {
          token.id = (user as any).id;
          token.role = (user as any).role;
          token.organizationId = (user as any).organizationId;
          token.organizationName = (user as any).organizationName;
          token.organizationSlug = (user as any).organizationSlug;
        } else if (user.email) {
          // OAuth: el provider solo da email/name, hay que leer de DB
          // (no podemos importar prisma aquí porque también corre en edge,
          // así que la lectura ocurre en requireAuth() la primera vez)
          token.email = user.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
        (session.user as any).organizationSlug = token.organizationSlug;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/dashboard', request.nextUrl));
        }
        return true;
      }

      if (
        pathname === '/' ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/health') ||
        pathname.startsWith('/api/stripe/webhook') ||
        pathname.startsWith('/api/v1') ||
        pathname.startsWith('/_next')
      ) {
        return true;
      }

      return isLoggedIn;
    },
  },
};
