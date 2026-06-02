import { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      role: Role;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
    };
  }

  interface User {
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }
}
