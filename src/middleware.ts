import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  // El callback `authorized` en auth.config.ts decide qué dejar pasar.
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
