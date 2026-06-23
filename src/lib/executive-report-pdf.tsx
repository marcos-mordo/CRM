import React from 'react';
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: '#0f172a', fontFamily: 'Helvetica' },
  header: { borderBottomWidth: 2, borderBottomColor: '#2563eb', paddingBottom: 12, marginBottom: 18 },
  orgName: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  reportTitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  period: { fontSize: 10, color: '#94a3b8' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: {
    width: '23.5%',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  kpiLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  kpiValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  kpiSub: { fontSize: 8, color: '#94a3b8', marginTop: 1 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
  },
  tableRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', fontSize: 9 },
  col50: { width: '50%' },
  col30: { width: '30%' },
  col20: { width: '20%', textAlign: 'right' },
  col15: { width: '15%', textAlign: 'right' },
  barBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, marginTop: 3 },
  barFill: { height: 6, backgroundColor: '#2563eb', borderRadius: 3 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#94a3b8', textAlign: 'center', borderTopWidth: 0.5, borderTopColor: '#cbd5e1', paddingTop: 8 },
});

interface KPI {
  label: string;
  value: string;
  sub?: string;
}

interface BrandRow {
  name: string;
  total: number;
  sales: number;
  percent: number;
}

interface RepRow {
  name: string;
  sales: number;
  commission: number;
}

interface Props {
  orgName: string;
  period: string;
  currency: string;
  kpis: KPI[];
  brandsByRevenue: BrandRow[];
  repsRanking: RepRow[];
  generatedAt: Date;
}

const fmtCur = (n: number, cur: string) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);

export function ExecutiveReportPdf(props: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>{props.orgName}</Text>
          <Text style={styles.reportTitle}>Reporte ejecutivo</Text>
          <Text style={styles.period}>Periodo: {props.period}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Indicadores clave</Text>
          <View style={styles.kpiGrid}>
            {props.kpis.map((k) => (
              <View key={k.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <Text style={styles.kpiValue}>{k.value}</Text>
                {k.sub && <Text style={styles.kpiSub}>{k.sub}</Text>}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ventas por marca</Text>
          {props.brandsByRevenue.length === 0 ? (
            <Text style={styles.kpiSub}>Sin ventas en este periodo.</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={styles.col50}>Marca</Text>
                <Text style={styles.col15}>Ventas</Text>
                <Text style={styles.col15}>%</Text>
                <Text style={styles.col20}>Total</Text>
              </View>
              {props.brandsByRevenue.map((b) => (
                <View key={b.name} style={styles.tableRow}>
                  <View style={styles.col50}>
                    <Text>{b.name}</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${Math.min(100, b.percent)}%` }]} />
                    </View>
                  </View>
                  <Text style={styles.col15}>{b.sales}</Text>
                  <Text style={styles.col15}>{b.percent.toFixed(1)}%</Text>
                  <Text style={styles.col20}>{fmtCur(b.total, props.currency)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ranking de representantes</Text>
          {props.repsRanking.length === 0 ? (
            <Text style={styles.kpiSub}>Sin comisiones generadas en este periodo.</Text>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={styles.col50}>Representante</Text>
                <Text style={styles.col15}>Ventas</Text>
                <Text style={styles.col20}>Comisión</Text>
              </View>
              {props.repsRanking.map((r, idx) => (
                <View key={r.name} style={styles.tableRow}>
                  <Text style={styles.col50}>{idx + 1}. {r.name}</Text>
                  <Text style={styles.col15}>{r.sales}</Text>
                  <Text style={styles.col20}>{fmtCur(r.commission, props.currency)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <Text style={styles.footer}>
          Generado por BrandHub · {fmtDate(props.generatedAt)} · Confidencial
        </Text>
      </Page>
    </Document>
  );
}
