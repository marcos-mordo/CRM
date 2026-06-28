import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { Download, Monitor, Smartphone, ShieldCheck } from 'lucide-react';

const GH_OWNER = 'marcos-mordo';
const GH_REPO = 'CRM';
const LATEST_RELEASE = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest`;
const EXE_DL = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest/download/BrandHub-Setup-1.0.0.exe`;
const APK_DL = `https://github.com/${GH_OWNER}/${GH_REPO}/releases/latest/download/BrandHub-Android.apk`;

export const metadata = { title: 'Descargar BrandHub' };

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <BrandLogo size={96} className="mx-auto mb-4 rounded-2xl shadow-xl" />
          <h1 className="text-4xl font-bold tracking-tight">BrandHub</h1>
          <p className="text-muted-foreground mt-2">CRM multi-marca · descarga e instala en segundos</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-xl transition">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Monitor className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Windows PC</h2>
                <p className="text-xs text-muted-foreground mt-1">Instalador autocontenido · ~250 MB</p>
              </div>
              <Button asChild size="lg" className="w-full">
                <a href={EXE_DL}>
                  <Download className="h-4 w-4" /> Descargar para Windows
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Doble clic en el .exe descargado. Si aparece SmartScreen,
                pincha en <em>Más información → Ejecutar de todos modos</em>.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition">
            <CardContent className="p-6 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Smartphone className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Android</h2>
                <p className="text-xs text-muted-foreground mt-1">APK directo · ~15 MB</p>
              </div>
              <Button asChild size="lg" className="w-full" variant="outline">
                <a href={APK_DL}>
                  <Download className="h-4 w-4" /> Descargar para Android
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Activa <em>Instalar apps de fuentes desconocidas</em> y
                abre el APK descargado.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/60 backdrop-blur">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Credenciales primera vez
            </h3>
            <div className="font-mono text-sm bg-muted rounded p-3 space-y-1">
              <p>Email: <strong>admin@brandhub.local</strong></p>
              <p>Password: <strong>admin1234</strong></p>
            </div>
            <p className="text-xs text-muted-foreground">
              Una vez dentro, crea más usuarios desde <code>Configuración → Equipo</code>.
            </p>
          </CardContent>
        </Card>

        <div className="text-center">
          <a href={LATEST_RELEASE} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Ver todas las versiones en GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
