import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';
const SERVER_URL = process.env.BRANDHUB_SERVER_URL || 'http://10.0.2.2:3000';

const config: CapacitorConfig = {
  appId: 'com.brandhub.app',
  appName: 'BrandHub',
  webDir: 'public',
  // En vez de empaquetar la app web entera (Next.js no funciona estática
  // con server actions), Capacitor carga la URL del backend Next.js.
  // Para producción cambia BRANDHUB_SERVER_URL a tu dominio real.
  server: {
    url: SERVER_URL,
    cleartext: isDev,
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: isDev,
    captureInput: true,
    webContentsDebuggingEnabled: isDev,
  },
};

export default config;
