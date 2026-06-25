export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reportEnvCheckOnBoot } = await import('@/lib/env-check');
    reportEnvCheckOnBoot();
  }
}
