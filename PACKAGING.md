# Empaquetado y distribución — BrandHub

Esta guía explica cómo generar los instaladores descargables de BrandHub para Windows, macOS, Linux y Android.

## Arquitectura: wrap-the-web

BrandHub mantiene **un solo codebase** (Next.js) y lo distribuye en 3 formatos:

```
Codebase Next.js
    ├── Web        →  http://localhost:3000  (npm run dev)
    ├── Electron   →  BrandHub-Setup.exe / .dmg / .AppImage
    └── Capacitor  →  BrandHub.apk  (Android)
```

Tanto Electron como Capacitor **cargan la URL del backend** vía iframe controlado, no empaquetan la app dentro. Esto significa que **el backend Next.js tiene que estar accesible** desde donde corra la app instalada.

| Escenario | Dónde corre el backend | Quién puede usar la app |
|---|---|---|
| Desarrollo local | Tu PC (`localhost:3000`) | Solo tú |
| Red local | PC fijo de la oficina (IP local) | Quien esté en la misma LAN |
| Cloud | Vercel + Neon (gratis) | Cualquiera con internet |

Para que tus amigos puedan usar la app desde sus dispositivos, necesitas pasar a la opción cloud (tarea #31 del plan).

---

## Pre-requisitos

| Empaquetado | Requiere |
|---|---|
| Windows .exe | Solo Windows con `npm install` ya hecho |
| macOS .dmg | macOS físico (Apple no permite firmar desde otro SO) |
| Linux .AppImage | Linux o Windows con Wine |
| Android .apk | Android Studio + Java JDK 17 |

---

## Empaquetado Electron (PC: Windows / macOS / Linux)

### Modo desarrollo (probar Electron localmente)

```bash
# Levanta backend + Electron en paralelo
npm run electron:dev
```

Abre una ventana de Electron apuntando a `http://localhost:3000` con DevTools abierto.

### Generar instalador de producción

#### Windows (.exe NSIS)

```bash
npm run electron:build:win
```

Salida: `dist-electron/BrandHub-Setup-1.0.0.exe`

El instalador permite al usuario elegir directorio, crea acceso directo en escritorio y menú inicio.

#### macOS (.dmg)

```bash
npm run electron:build:mac
```

Salida: `dist-electron/BrandHub-1.0.0-arm64.dmg` y `BrandHub-1.0.0-x64.dmg`

⚠️ Si no firmas la app con un Apple Developer ID ($99/año), los usuarios verán un aviso "App no verificada" al instalar.

#### Linux (.AppImage)

```bash
npm run electron:build:linux
```

Salida: `dist-electron/BrandHub-1.0.0-x64.AppImage`

### Configurar URL del backend en producción

Por defecto Electron usa `http://localhost:3000`. Para apuntar a tu backend en la nube:

1. Edita `electron/main.js`, línea `const APP_URL = ...`
2. Cambia el fallback a tu dominio:
   ```js
   const APP_URL = process.env.APP_URL || 'https://brandhub.tudominio.com';
   ```
3. Reconstruye el instalador

---

## Empaquetado Android (APK)

### Setup inicial (una sola vez)

```bash
# 1. Crear proyecto Android (genera carpeta android/)
npm run cap:add:android

# 2. Sincronizar
npm run cap:sync

# 3. Abrir Android Studio para configurar SDK + firmar APK
npm run cap:open:android
```

### Generar APK debug (sin firmar, para probar)

```bash
# Asegúrate de tener BRANDHUB_SERVER_URL apuntando a tu backend
# Por defecto: http://10.0.2.2:3000  (que es localhost desde emulador Android)
export BRANDHUB_SERVER_URL=http://10.0.2.2:3000   # Linux/Mac
$env:BRANDHUB_SERVER_URL="http://10.0.2.2:3000"   # PowerShell

npm run android:build
```

Salida: `android/app/build/outputs/apk/debug/app-debug.apk`

Puedes instalarlo arrastrándolo a un emulador o vía adb:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Generar APK firmado (release para distribución)

Necesitas un **keystore** propio para firmar:

```bash
keytool -genkey -v -keystore brandhub-release.keystore -alias brandhub -keyalg RSA -keysize 2048 -validity 10000
```

Guarda `brandhub-release.keystore` **fuera del repo** y configura `android/key.properties`:

```properties
storePassword=tu_password
keyPassword=tu_password
keyAlias=brandhub
storeFile=../../brandhub-release.keystore
```

Luego edita `android/app/build.gradle` para usar esa firma (Android Studio te guía con un wizard).

```bash
cd android && ./gradlew assembleRelease
```

Salida: `android/app/build/outputs/apk/release/app-release.apk`

---

## Pre-requisitos Android (instalación)

Si nunca has tocado desarrollo Android:

1. **Android Studio**: https://developer.android.com/studio
2. **JDK 17**: viene con Android Studio (verifica con `java -version`)
3. **Variables de entorno**:
   - `JAVA_HOME` → ruta al JDK
   - `ANDROID_HOME` → ruta al SDK (típicamente `~/AppData/Local/Android/Sdk` en Windows)
   - Añadir al PATH: `%ANDROID_HOME%\platform-tools` y `%ANDROID_HOME%\tools`
4. **Aceptar licencias SDK**:
   ```bash
   sdkmanager --licenses
   ```

---

## Distribución a usuarios finales

### Instalador Windows (.exe)

- Sube el `BrandHub-Setup-1.0.0.exe` a un sitio web propio o Google Drive
- El usuario descarga y hace doble click
- Windows SmartScreen puede avisar "publisher unknown" — para evitarlo necesitas un certificado Code Signing (≈€100/año)

### APK Android

- Sube el `app-release.apk` a tu web o WeTransfer
- El usuario tiene que activar "Instalar de fuentes desconocidas" en Ajustes
- Alternativa profesional: subir a Google Play Store (cuota única $25)

### macOS / Linux

Mismo principio: subes el `.dmg` o `.AppImage` a un servidor y pasas el link.

---

## Roadmap de distribución profesional

Cuando quieras hacerlo "como un SaaS de verdad":

1. **Auto-update** con `electron-updater` (la app comprueba versiones y se actualiza sola)
2. **Code signing** para Windows y macOS (evita warnings de seguridad)
3. **Play Store** para Android (descubribilidad, reviews, instalación de 1 click)
4. **Telemetría** anónima para saber qué módulos se usan más
5. **Crash reporting** con Sentry
