'use server';

import { redirect } from 'next/navigation';
import { clearPortalCookie } from '@/lib/portal-auth';

export async function signOutPortal() {
  await clearPortalCookie();
  redirect('/portal/login');
}
