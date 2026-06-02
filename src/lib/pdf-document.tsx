import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  brand: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  meta: { textAlign: 'right', fontSize: 9, color: '#64748b' },
  metaTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  metaNumber: { fontSize: 11, fontWeight: 'bold' },
  parties: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  partyBox: { width: '48%' },
  partyLabel: { fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  partyName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  partyText: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  cellDesc: { width: '50%' },
  cellQty: { width: '12%', textAlign: 'right' },
  cellPrice: { width: '18%', textAlign: 'right' },
  cellTotal: { width: '20%', textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: '40%', marginTop: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    marginTop: 4,
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
  footer: { marginTop: 30, paddingTop: 15, borderTopWidth: 0.5, borderTopColor: '#cbd5e1' },
  footerTitle: { fontSize: 9, fontWeight: 'bold', marginBottom: 4, color: '#475569' },
  footerText: { fontSize: 8, color: '#64748b', lineHeight: 1.5 },
});

interface PdfProps {
  type: 'quote' | 'invoice';
  number: string;
  orgName: string;
  orgAddress?: string;
  orgPhone?: string;
  orgEmail?: string;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  issueDate: Date;
  dueDate?: Date | null;
  validUntil?: Date | null;
  lines: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxRate: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string | null;
  terms?: string | null;
}

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);

export function InvoicePdf(props: PdfProps) {
  const isInvoice = props.type === 'invoice';
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{props.orgName}</Text>
            {props.orgAddress && <Text style={styles.partyText}>{props.orgAddress}</Text>}
            {props.orgPhone && <Text style={styles.partyText}>Tel: {props.orgPhone}</Text>}
            {props.orgEmail && <Text style={styles.partyText}>{props.orgEmail}</Text>}
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{isInvoice ? 'FACTURA' : 'COTIZACIÓN'}</Text>
            <Text style={styles.metaNumber}>{props.number}</Text>
            <Text>Fecha: {fmtDate(props.issueDate)}</Text>
            {isInvoice && props.dueDate && <Text>Vence: {fmtDate(props.dueDate)}</Text>}
            {!isInvoice && props.validUntil && <Text>Válida hasta: {fmtDate(props.validUntil)}</Text>}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Cliente</Text>
            <Text style={styles.partyName}>{props.customerName}</Text>
            {props.customerEmail && <Text style={styles.partyText}>{props.customerEmail}</Text>}
            {props.customerAddress && <Text style={styles.partyText}>{props.customerAddress}</Text>}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDesc}>Descripción</Text>
            <Text style={styles.cellQty}>Cant.</Text>
            <Text style={styles.cellPrice}>P. Unit.</Text>
            <Text style={styles.cellTotal}>Total</Text>
          </View>
          {props.lines.map((line, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.cellDesc}>{line.description}</Text>
              <Text style={styles.cellQty}>{line.quantity}</Text>
              <Text style={styles.cellPrice}>{fmt(line.unitPrice, props.currency)}</Text>
              <Text style={styles.cellTotal}>{fmt(line.total, props.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(props.subtotal, props.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Impuestos</Text>
            <Text>{fmt(props.taxAmount, props.currency)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{fmt(props.total, props.currency)}</Text>
          </View>
        </View>

        {(props.notes || props.terms) && (
          <View style={styles.footer}>
            {props.notes && (
              <>
                <Text style={styles.footerTitle}>Notas</Text>
                <Text style={styles.footerText}>{props.notes}</Text>
              </>
            )}
            {props.terms && (
              <>
                <Text style={[styles.footerTitle, { marginTop: 8 }]}>Términos y condiciones</Text>
                <Text style={styles.footerText}>{props.terms}</Text>
              </>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
