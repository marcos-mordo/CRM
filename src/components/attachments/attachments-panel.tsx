'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, Image as ImageIcon, FileText, Download, Trash2, Loader2, Paperclip } from 'lucide-react';

type Attachment = {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  type: string;
  createdAt: Date | string;
  url?: string; // presente al listar detalle
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IconFor({ type, mime }: { type: string; mime: string }) {
  if (type === 'IMAGE' || mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (type === 'PDF' || mime.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (type === 'DOCUMENT') return <FileText className="h-4 w-4 text-emerald-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

export function AttachmentsPanel({
  entity,
  entityId,
  initial,
}: {
  entity: 'contact' | 'deal' | 'sale';
  entityId: string;
  initial: Attachment[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Attachment[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('entity', entity);
        form.append('entityId', entityId);
        const res = await fetch('/api/attachments', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) { toast.error(data.message ?? 'Error subiendo'); continue; }
        setItems((prev) => [{ ...data.attachment, createdAt: new Date() }, ...prev]);
      }
      toast.success('Adjunto subido');
      router.refresh();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este adjunto?')) return;
    const res = await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success('Eliminado');
    } else {
      toast.error('No se pudo eliminar');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Archivos ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
            dragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            Arrastra archivos aquí o
            <Button
              variant="link" size="sm" className="h-auto p-0 ml-1"
              onClick={() => inputRef.current?.click()}
            >
              selecciónalos
            </Button>
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Máx 10 MB por archivo</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
          {uploading && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Subiendo…
            </div>
          )}
        </div>

        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((a) => (
              <li key={a.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent">
                <IconFor type={a.type} mime={a.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.filename}</p>
                  <p className="text-[10px] text-muted-foreground">{humanSize(a.size)}</p>
                </div>
                {a.url && (
                  <a href={a.url} download={a.filename} title="Descargar" className="text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => remove(a.id)} className="text-destructive hover:opacity-70" title="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
