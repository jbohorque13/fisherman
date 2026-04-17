import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

type ReportRow = {
  categoria: string;
  integrados: number;
  en_proceso: number;
  reasignados: number;
  total: number;
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function AdminReportTab() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [rows, setRows]   = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const inicio = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const fin = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const { data, error } = await supabase.rpc('reporte_mensual', {
      p_inicio: inicio,
      p_fin:    fin,
    });

    setLoading(false);
    if (error) { console.error('reporte_mensual error:', error.message); return; }
    setRows((data ?? []).map((r: any) => ({
      categoria:   r.categoria,
      integrados:  Number(r.integrados),
      en_proceso:  Number(r.en_proceso),
      reasignados: Number(r.reasignados),
      total:       Number(r.total),
    })));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const totales: ReportRow = rows.reduce(
    (acc, r) => ({
      categoria:   'TOTAL',
      integrados:  acc.integrados  + r.integrados,
      en_proceso:  acc.en_proceso  + r.en_proceso,
      reasignados: acc.reasignados + r.reasignados,
      total:       acc.total       + r.total,
    }),
    { categoria: 'TOTAL', integrados: 0, en_proceso: 0, reasignados: 0, total: 0 },
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Navegador de mes */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.monthLabel}>
          <Text style={styles.monthText}>{MESES[month]}</Text>
          <Text style={styles.yearText}>{year}</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Tarjetas resumen */}
      {!loading && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: '#10B981' }]}>
            <Text style={[styles.summaryNum, { color: '#10B981' }]}>{totales.integrados}</Text>
            <Text style={styles.summaryLabel}>Integrados</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: '#3B82F6' }]}>
            <Text style={[styles.summaryNum, { color: '#3B82F6' }]}>{totales.en_proceso}</Text>
            <Text style={styles.summaryLabel}>En proceso</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: theme.primary }]}>
            <Text style={[styles.summaryNum, { color: theme.primary }]}>{totales.total}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* Tabla */}
      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.table}>

          {/* Encabezado */}
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.cellRango, styles.headerText]}>Rango</Text>
            <Text style={[styles.cellNum, styles.headerText]}>Integr.</Text>
            <Text style={[styles.cellNum, styles.headerText]}>Proc.</Text>
            <Text style={[styles.cellNum, styles.headerText]}>Reasig.</Text>
            <Text style={[styles.cellNum, styles.headerText, styles.cellTotal]}>Total</Text>
          </View>

          {rows.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="bar-chart-outline" size={36} color={theme.borderInput} />
              <Text style={styles.emptyText}>Sin datos para este período</Text>
            </View>
          ) : (
            rows.map((r, i) => (
              <View key={r.categoria} style={[styles.row, i % 2 === 0 && styles.rowAlt]}>
                <Text style={[styles.cell, styles.cellRango]}>{r.categoria}</Text>
                <Text style={[styles.cellNum, { color: '#10B981' }]}>{r.integrados}</Text>
                <Text style={[styles.cellNum, { color: '#3B82F6' }]}>{r.en_proceso}</Text>
                <Text style={[styles.cellNum, { color: theme.danger }]}>{r.reasignados}</Text>
                <Text style={[styles.cellNum, styles.cellTotal]}>{r.total}</Text>
              </View>
            ))
          )}

          {/* Fila de totales */}
          {rows.length > 0 && (
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.cell, styles.cellRango, styles.totalText]}>TOTAL</Text>
              <Text style={[styles.cellNum, styles.totalText, { color: '#10B981' }]}>{totales.integrados}</Text>
              <Text style={[styles.cellNum, styles.totalText, { color: '#3B82F6' }]}>{totales.en_proceso}</Text>
              <Text style={[styles.cellNum, styles.totalText, { color: theme.danger }]}>{totales.reasignados}</Text>
              <Text style={[styles.cellNum, styles.totalText, styles.cellTotal]}>{totales.total}</Text>
            </View>
          )}

        </View>
      )}

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Integrados — proceso completado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>En proceso — actualmente en integración</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.danger }]} />
          <Text style={styles.legendText}>Reasignados — derivados a otro guía</Text>
        </View>
      </View>

    </ScrollView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 16, paddingBottom: 40 },

    // Navegador de mes
    monthNav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 16,
    },
    navBtn: { padding: 6 },
    monthLabel: { alignItems: 'center' },
    monthText: { fontSize: 18, fontWeight: '700', color: theme.text },
    yearText: { fontSize: 13, color: theme.textMuted, marginTop: 1 },

    // Resumen
    summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    summaryCard: {
      flex: 1, backgroundColor: theme.surface, borderRadius: 10,
      padding: 12, alignItems: 'center', borderWidth: 1.5,
    },
    summaryNum: { fontSize: 28, fontWeight: '800' },
    summaryLabel: { fontSize: 11, color: theme.textMuted, marginTop: 2, fontWeight: '500' },

    // Tabla
    table: {
      backgroundColor: theme.surface, borderRadius: 12,
      overflow: 'hidden', borderWidth: 1, borderColor: theme.border,
      marginBottom: 20,
    },
    headerRow: { backgroundColor: theme.surfaceAlt },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
    rowAlt: { backgroundColor: theme.background },
    totalRow: { backgroundColor: theme.surfaceAlt, borderTopWidth: 1.5, borderTopColor: theme.border },
    cell: { flex: 1, fontSize: 13, color: theme.text },
    cellRango: { flex: 2 },
    cellNum: { width: 56, textAlign: 'center', fontSize: 13, fontWeight: '600', color: theme.text },
    cellTotal: { fontWeight: '700' },
    headerText: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase' },
    totalText: { fontWeight: '800', fontSize: 14 },
    emptyRow: { alignItems: 'center', paddingVertical: 36, gap: 8 },
    emptyText: { color: theme.textMuted, fontSize: 14 },

    // Leyenda
    legend: { gap: 8 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: theme.textMuted },
  });
}
