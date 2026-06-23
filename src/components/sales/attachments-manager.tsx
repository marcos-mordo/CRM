'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, FileImage, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { deleteAttachment, uploadAttachment } from '@/app/(dashboard)/sales-orders/[id]/actions';
import type { Attachment, AttachmentType } from '@prisma/client';

const TYPE_LABELS: Record<AttachmentType, string> = {
  ID_DOCUMENT: 'DNI / Documento ID',
  PREVIOUS_BILL: 'Factura anterior',
  CONTRACT: 'Contrato',
  PHOTO: 'Foto',
  OTHER: 'Otro',
};

const TYPE_ICONS: Record<AttachmentType, any> = {
  ID_DOCUMENT: FileText,
  PREVIOUS_BILL: FileText,
  CONTRACT: FileText,
  PHOTO: FileImage,
  OTHER: FileImage,
};

const MAX_SIZE_MB = 5;

export function AttachmentsManager({
  saleId,
  attachments,
}: {
  saleId: string;
  attachments: Attachment[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AttachmentType>('ID_DOCUMENT');
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`El archivo supera ${MAX_SIZE_MB}MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      startTransition(async () => {
        try {
          await uploadAttachment({
            saleId,
            type,
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            dataUrl,
          });
          toast.success('Adjunto subido');
          router.refresh();
          if (fileInput.current) fileInput.current.value = '';
          if (cameraInput.current) cameraInput.current.value = '';
        } catch (e: any) {
          toast.error(e.message || 'Error al subir');
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const remove = (id: string) => {
    if (!confirm('¿Eliminar este adjunto?')) return;
    startTransition(async () => {
      await deleteAttachment(id);
      toast.success('Adjunto eliminado');
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={type} onValueChange={(v) => setType(v as AttachmentType)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Subir archivo
        </Button>

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button variant="outline" size="sm" onClick={() => cameraInput.current?.click()} disabled={isPending}>
          <Camera className="h-4 w-4" />
          Cámara
        </Button>

        <p className="text-xs text-muted-foreground ml-auto">Máx {MAX_SIZE_MB}MB</p>
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin adjuntos todavía.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((a) => {
            const Icon = TYPE_ICONS[a.type];
            const isImage = a.mimeType.startsWith('image/');
            return (
              <li key={a.id} className="border rounded-lg p-2 flex items-center gap-3">
                {isImage ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer">
                    <img src={a.url} alt={a.filename} className="h-12 w-12 rounded object-cover" />
                  </a>
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline truncate block">
                    {a.filename}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{TYPE_LABELS[a.type]}</Badge>
                    <span className="text-xs text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(a.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
