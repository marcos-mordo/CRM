'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Loader2, AlertCircle } from 'lucide-react';
import { importEndCustomers } from '@/app/(dashboard)/end-customers/actions';

type Row = {
  isCompany: boolean;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  gdprConsent: boolean;
  marketingConsent: boolean;
};

const TEMPLATE = `isCompany,firstName,lastName,companyName,taxId,email,phone,mobile,address,city,postalCode,province,country,gdprConsent,marketingConsent
false,Juan,Pérez,,12345678A,juan@example.com,,600111222,Calle Mayor 1,Madrid,28001,Madrid,España,true,false
true,,,Empresa SL,B12345678,info@empresa.es,+34911223344,,Av. Diagonal 1,Barcelona,08001,Barcelona,España,true,true`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-clientes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseBool(v: any) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes';
}

export function ImportCsvButton() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = (result.data as any[]).map((r) => ({
          isCompany: parseBool(r.isCompany),
          firstName: r.firstName?.trim(),
          lastName: r.lastName?.trim(),
          companyName: r.companyName?.trim(),
          taxId: r.taxId?.trim(),
          email: r.email?.trim(),
          phone: r.phone?.trim(),
          mobile: r.mobile?.trim(),
          address: r.address?.trim(),
          city: r.city?.trim(),
          postalCode: r.postalCode?.trim(),
          province: r.province?.trim(),
          country: r.country?.trim() || 'España',
          gdprConsent: parseBool(r.gdprConsent),
          marketingConsent: parseBool(r.marketingConsent),
        }));
        setRows(parsed);
        setOpen(true);
      },
      error: (err) => toast.error(`Error parseando CSV: ${err.message}`),
    });
  };

  const doImport = () => {
    startTransition(async () => {
      try {
        const res = await importEndCustomers(rows);
        if (res.imported > 0) toast.success(`${res.imported} clientes importados`);
        if (res.skipped > 0) toast.warning(`${res.skipped} omitidos`);
        if (res.errors.length > 0) {
          console.warn('Errores import:', res.errors);
        }
        setOpen(false);
        setRows([]);
        if (fileInput.current) fileInput.current.value = '';
        router.refresh();
      } catch (e: any) {
        toast.error(e.message);
      }
    });
  };

  const validCount = rows.filter((r) => r.gdprConsent && (r.taxId || r.email)).length;
  const invalidCount = rows.length - validCount;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="outline" onClick={() => fileInput.current?.click()}>
        <Upload className="h-4 w-4" />
        Importar CSV
      </Button>
      <Button variant="ghost" size="sm" onClick={downloadTemplate}>
        <Download className="h-3.5 w-3.5" />
        Plantilla
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa importación · {rows.length} filas</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="success">{validCount} válidas</Badge>
            {invalidCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {invalidCount} se omitirán (sin RGPD o sin DNI/email)
              </Badge>
            )}
          </div>

          <div className="max-h-96 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI/CIF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>RGPD</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, idx) => {
                  const valid = r.gdprConsent && (r.taxId || r.email);
                  return (
                    <TableRow key={idx} className={!valid ? 'opacity-50' : ''}>
                      <TableCell>{r.isCompany ? 'Empresa' : 'Persona'}</TableCell>
                      <TableCell>{r.isCompany ? r.companyName : `${r.firstName} ${r.lastName}`}</TableCell>
                      <TableCell>{r.taxId || '—'}</TableCell>
                      <TableCell>{r.email || '—'}</TableCell>
                      <TableCell>{r.city || '—'}</TableCell>
                      <TableCell>{r.gdprConsent ? '✓' : '✗'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {rows.length > 50 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Mostrando primeras 50 de {rows.length}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={doImport} disabled={isPending || validCount === 0}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {validCount} clientes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
