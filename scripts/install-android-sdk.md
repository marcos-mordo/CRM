# Instalar Android SDK para compilar el APK

Necesitas el SDK de Android (~3 GB) para generar `app-debug.apk`. Hay
dos caminos:

## Opción A — Android Studio (recomendado para devs)

1. Descarga: https://developer.android.com/studio
2. Instala. Al primer arranque selecciona "Standard" y deja que instale:
   - Android SDK (API 33 o superior)
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
3. Apunta `local.properties` al SDK:
   ```
   # Por defecto en Windows:
   sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk
   ```
4. Compila:
   ```
   npm run android:build
   ```
   El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

## Opción B — Solo command-line tools (más ligero)

1. Descarga "Command line tools only" desde
   https://developer.android.com/studio#command-line-tools-only
2. Extrae en `C:\Android\cmdline-tools\latest\`.
3. Añade al PATH:
   ```
   C:\Android\cmdline-tools\latest\bin
   C:\Android\platform-tools
   ```
4. Configura variables:
   ```
   setx ANDROID_HOME C:\Android
   setx ANDROID_SDK_ROOT C:\Android
   ```
5. Acepta licencias e instala paquetes:
   ```
   sdkmanager --licenses
   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
   ```
6. Crea `android/local.properties`:
   ```
   sdk.dir=C\:\\Android
   ```
7. Compila:
   ```
   npm run android:build
   ```

## Configurar la URL del servidor

El APK es un **cliente** que apunta al servidor Next.js corriendo en tu
PC. Edita `capacitor.config.ts` y cambia:

```ts
const SERVER_URL = process.env.BRANDHUB_SERVER_URL || 'http://192.168.1.X:3000';
```

`192.168.1.X` debe ser la IP de tu PC en la red LAN (ipconfig en
Windows). Asegúrate de que el firewall permite el puerto 3000.

Luego:
```
npx cap sync android
cd android && gradlew assembleDebug
```
