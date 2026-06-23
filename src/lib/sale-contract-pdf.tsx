import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  brand: { fontSize: 18, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'right' },
  number: { fontSize: 11, color: '#64748b', textAlign: 'right' },
  meta: { fontSize: 9, color: '#64748b', textAlign: 'right' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  partiesRow: { flexDirection: 'row', gap: 24 },
  party: { flex: 1 },
  partyName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  partyLine: { fontSize: 9, color: '#475569', lineHeight: 1.4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 6, fontSize: 9, fontWeight: 'bold', color: '#334155' },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
  cellDesc: { width: '52%' },
  cellQty: { width: '12%', textAlign: 'right' },
  cellPrice: { width: '18%', textAlign: 'right' },
  cellTotal: { width: '18%', textAlign: 'right' },
  totals: { alignSelf: 'flex-end', width: '40%', marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: '#0f172a' },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 14, fontWeight: 'bold', color: '#2563eb' },
  signatureBlock: { marginTop: 36, flexDirection: 'row', gap: 24 },
  signatureBox: { flex: 1, borderTopWidth: 0.5, borderTopColor: '#94a3b8', paddingTop: 6 },
  signatureLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  signatureImage: { height: 60, marginBottom: 4 },
  signatureName: { fontSize: 9, fontWeight: 'bold' },
  legalBlock: { marginTop: 32, fontSize: 7, color: '#94a3b8', lineHeight: 1.4, textAlign: 'justify' },
});

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);

interface ContractPdfProps {
  number: string;
  orgName: string;
  orgAddress?: string;
  brandName: string;
  brandLegalName?: string;
  brandTaxId?: string;
  customer: {
    isCompany: boolean;
    name: string;
    taxId: string;
    address?: string;
    city?: string;
    postalCode?: string;
    email?: string;
    phone?: string;
  };
  representative: string;
  saleDate: Date;
  lines: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; total: number }>;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  notes?: string | null;
  signatureDataUrl?: string | null;
  signedAt?: Date | null;
}

export function SaleContractPdf(props: ContractPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{props.orgName}</Text>
            {props.orgAddress && <Text style={styles.partyLine}>{props.orgAddress}</Text>}
            <Text style={styles.partyLine}>Agente comercial autorizado de {props.brandName}</Text>
          </View>
          <View>
            <Text style={styles.title}>CONTRATO</Text>
            <Text style={styles.number}>{props.number}</Text>
            <Text style={styles.meta}>{fmtDate(props.saleDate)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partes contratantes</Text>
          <View style={styles.partiesRow}>
            <View style={styles.party}>
              <Text style={styles.partyName}>Prestador del servicio</Text>
              <Text style={styles.partyLine}>{props.brandLegalName || props.brandName}</Text>
              {props.brandTaxId && <Text style={styles.partyLine}>CIF: {props.brandTaxId}</Text>}
              <Text style={styles.partyLine}>Representado por: {props.orgName}</Text>
              <Text style={styles.partyLine}>Agente: {props.representative}</Text>
            </View>
            <View style={styles.party}>
              <Text style={styles.partyName}>Cliente {props.customer.isCompany ? '(empresa)' : '(persona física)'}</Text>
              <Text style={styles.partyLine}>{props.customer.name}</Text>
              <Text style={styles.partyLine}>{props.customer.isCompany ? 'CIF' : 'DNI'}: {props.customer.taxId}</Text>
              {props.customer.address && (
                <Text style={styles.partyLine}>
                  {props.customer.address}
                  {props.customer.postalCode ? `, ${props.customer.postalCode}` : ''}
                  {props.customer.city ? ` ${props.customer.city}` : ''}
                </Text>
              )}
              {props.customer.email && <Text style={styles.partyLine}>{props.customer.email}</Text>}
              {props.customer.phone && <Text style={styles.partyLine}>{props.customer.phone}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios contratados</Text>
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

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text>Subtotal</Text>
              <Text>{fmt(props.subtotal, props.currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>IVA</Text>
              <Text>{fmt(props.taxAmount, props.currency)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{fmt(props.total, props.currency)}</Text>
            </View>
          </View>
        </View>

        {props.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.partyLine}>{props.notes}</Text>
          </View>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Firma del cliente</Text>
            {props.signatureDataUrl ? (
              <Image src={props.signatureDataUrl} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 60 }} />
            )}
            <Text style={styles.signatureName}>{props.customer.name}</Text>
            {props.signedAt && (
              <Text style={styles.meta}>Firmado el {fmtDate(props.signedAt)}</Text>
            )}
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Por la agencia</Text>
            <View style={{ height: 60 }} />
            <Text style={styles.signatureName}>{props.representative}</Text>
            <Text style={styles.meta}>Agente comercial</Text>
          </View>
        </View>

        <Text style={styles.legalBlock}>
          De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD, los datos personales facilitados serán tratados
          por {props.orgName} con la finalidad de gestionar la presente contratación y prestación del servicio. El cliente
          puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad mediante
          comunicación escrita. Este contrato se rige por la legislación española y cualquier controversia se someterá a los
          juzgados y tribunales competentes según la normativa aplicable.
        </Text>
      </Page>
    </Document>
  );
}
