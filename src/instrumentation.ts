export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { reportEnvCheckOnBoot } = await import('@/lib/env-check');
    reportEnvCheckOnBoot();

    // Sync de email periódico en despliegues persistentes (desktop .exe,
    // Docker, VPS). En Vercel (serverless) el proceso no persiste: allí
    // lo cubre el cron declarado en vercel.json.
    if (!process.env.VERCEL) {
      const { syncAllEmailAccounts } = await import('@/lib/email-sync');
      const run = () =>
        syncAllEmailAccounts()
          .then((r) => { if (r.imported > 0) console.log(`[email-sync] ${r.imported} nuevos de ${r.accounts} cuentas`); })
          .catch((e) => console.error('[email-sync]', e?.message));
      setTimeout(run, 30_000);           // primer sync a los 30s del arranque
      setInterval(run, 10 * 60 * 1000);  // luego cada 10 min
    }
  }
}
