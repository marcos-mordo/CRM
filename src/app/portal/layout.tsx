import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 p-4">
        {children}
      </div>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
