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

      // Recordatorios de tareas: en despliegues persistentes lo movemos aquí.
      // reminderSentAt evita duplicados aunque corra cada hora.
      const runReminders = () =>
        import('@/lib/task-reminders')
          .then(({ sendDueTaskReminders }) => sendDueTaskReminders())
          .then((sent) => { if (sent > 0) console.log(`[task-reminders] ${sent} recordatorios enviados`); })
          .catch((e) => console.error('[task-reminders]', e?.message));
      setTimeout(runReminders, 60_000);       // primer chequeo al minuto
      setInterval(runReminders, 60 * 60 * 1000); // luego cada hora
    }
  }
}
