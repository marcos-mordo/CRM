import type { CapacitorConfig } from '@capacitor/cli';

/**
 * BrandHub Capacitor config.
 *
 * Modo de funcionamiento:
 * - La APK arranca cargando webDir/index.html (bootstrap).
 * - El bootstrap pide al usuario la URL del servidor (Vercel, dominio
 *   propio, etc.), la guarda en localStorage y redirige.
 * - A partir de ahí toda navegación va al servidor configurado.
 *
 * Si en build-time defines BRANDHUB_SERVER_URL, el bootstrap usa ese
 * valor por defecto (precarga el input) pero el usuario puede cambiarlo.
 */

const config: CapacitorConfig = {
  appId: 'com.brandhub.app',
  appName: 'BrandHub',
  webDir: 'capacitor-www',
  // NO ponemos server.url: queremos que cargue el bootstrap local primero.
  // Una vez el usuario configura URL, navega ahí (allowNavigation=*)
  server: {
    cleartext: true,
    allowNavigation: ['*'],
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
