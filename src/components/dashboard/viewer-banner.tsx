import { Eye } from 'lucide-react';

export function ViewerBanner({ role }: { role: string }) {
  if (role !== 'VIEWER') return null;
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-3 text-sm">
      <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="text-amber-900 dark:text-amber-100">
        <strong>Modo solo lectura</strong> — tu rol VIEWER permite consultar todos los datos pero no modificar nada. Pide a un admin que cambie tu rol si necesitas editar.
      </p>
    </div>
  );
}
