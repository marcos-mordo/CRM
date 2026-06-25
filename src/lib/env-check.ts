/**
 * Validación de variables de entorno críticas al arrancar.
 * Lanza error claro en lugar de fallar tarde con un stack opaco.
 */

const REQUIRED = ['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET'] as const;

const PLACEHOLDER_SECRETS = [
  'change-me-please',
  'cambia-esto-por-algo-random',
  'desktop-default-secret-please-change',
  'your-secret-here',
];

export function checkEnv(): { ok: boolean; warnings: string[]; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) errors.push(`${key} no está definida`);
  }

  if (process.env.NEXTAUTH_SECRET && PLACEHOLDER_SECRETS.includes(process.env.NEXTAUTH_SECRET)) {
    warnings.push('NEXTAUTH_SECRET sigue siendo el valor por defecto. Cámbialo a un valor random en producción.');
  }

  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.includes('localhost')) {
    warnings.push('NEXTAUTH_URL apunta a localhost en producción. Los links públicos no funcionarán fuera del servidor.');
  }

  return { ok: errors.length === 0, warnings, errors };
}

/**
 * Llamar al arrancar el server. En producción, loguea y sigue.
 * En dev, sólo loguea (no rompe el flujo).
 */
export function reportEnvCheckOnBoot(): void {
  const { ok, errors, warnings } = checkEnv();
  if (errors.length > 0) {
    console.error('🚨 ENV CHECK FALLÓ:');
    for (const e of errors) console.error('  -', e);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Variables de entorno requeridas faltantes: ' + errors.join(', '));
    }
  }
  if (warnings.length > 0) {
    console.warn('⚠️ ENV CHECK avisos:');
    for (const w of warnings) console.warn('  -', w);
  }
  if (ok && warnings.length === 0) {
    console.log('✅ ENV check OK');
  }
}
