import { auth } from '@/auth';

export default auth((_req) => {
  // El callback `authorized` en auth.ts ya decide qué dejar pasar.
  // Aquí solo necesitamos que el middleware se ejecute para que ese
  // callback corra en cada navegación.
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
