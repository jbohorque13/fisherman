import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  StyleSheet, Alert, ActionSheetIOS, Platform, TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File as FSFile } from 'expo-file-system';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_FIELDS = [
  { value: 'ignorar',          label: 'Ignorar' },
  { value: 'nombre',           label: 'Nombre' },
  { value: 'apellido',         label: 'Apellido' },
  { value: 'nombre+apellido',  label: 'Nombre y Apellido (combinado)' },
  { value: 'edad',             label: 'Edad' },
  { value: 'celular',          label: 'Celular / Teléfono' },
  { value: 'email',            label: 'Email' },
  { value: 'genero',           label: 'Género' },
  { value: 'dias_disponibles', label: 'Días disponibles' },
  { value: 'tipo_grupo',       label: 'Tipo de grupo' },
  { value: 'modalidad',        label: 'Modalidad' },
];

const COLUMN_GUIDE = [
  { field: 'nombre',           required: true,  desc: 'Nombre de pila',                              example: 'Juan' },
  { field: 'apellido',         required: true,  desc: 'Apellido',                                    example: 'Pérez' },
  { field: 'edad',             required: false, desc: 'Número entero',                               example: '28' },
  { field: 'celular',          required: false, desc: 'Teléfono o celular',                          example: '+54911234567' },
  { field: 'email',            required: false, desc: 'Correo electrónico',                          example: 'juan@mail.com' },
  { field: 'genero',           required: false, desc: '"masculino" o "femenino"',                    example: 'masculino' },
  { field: 'dias_disponibles', required: false, desc: 'Días separados por coma',                     example: 'lunes,miércoles,viernes' },
  { field: 'tipo_grupo',       required: false, desc: '"chicas", "chicos", "mixto_solteros", "casados"', example: 'chicos' },
  { field: 'modalidad',        required: false, desc: '"online" o "presencial"',                     example: 'presencial' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportStep = 'idle' | 'analyzing' | 'mapping' | 'preview' | 'importing' | 'done';
type SourceType = 'local' | 'sheets';
type Mapping = Record<string, string>;

type ParsedRow = {
  nombre: string;
  apellido: string;
  edad: number | null;
  celular: string | null;
  email: string | null;
  genero: 'masculino' | 'femenino' | null;
  dias_disponibles: string[];
  tipo_grupo: 'chicas' | 'chicos' | 'mixto_solteros' | 'casados' | null;
  modalidad: 'online' | 'presencial' | null;
  _valid: boolean;
  _errorMsg: string;
};

// ─── Normalizers ──────────────────────────────────────────────────────────────

function removeAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeGenero(val: string): 'masculino' | 'femenino' | null {
  const v = removeAccents(val.toLowerCase().trim());
  if (['masculino', 'm', 'masc', 'hombre', 'male', 'h', 'varon'].includes(v)) return 'masculino';
  if (['femenino', 'f', 'fem', 'mujer', 'female', 'w'].includes(v)) return 'femenino';
  return null;
}

function normalizeTipoGrupo(val: string): 'chicas' | 'chicos' | 'mixto_solteros' | 'casados' | null {
  const v = removeAccents(val.toLowerCase().trim()).replace(/\s+/g, '_');
  if (v === 'chicas') return 'chicas';
  if (v === 'chicos') return 'chicos';
  if (['mixto_solteros', 'mixto', 'solteros', 'mixtos'].includes(v)) return 'mixto_solteros';
  if (v === 'casados') return 'casados';
  return null;
}

function normalizeModalidad(val: string): 'online' | 'presencial' | null {
  const v = val.toLowerCase().trim();
  if (v === 'online') return 'online';
  if (v === 'presencial') return 'presencial';
  return null;
}

function normalizeDias(val: string): string[] {
  const VALID = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  return val
    .split(/[,;/]/)
    .map(d => removeAccents(d.trim().toLowerCase()))
    .filter(d => VALID.includes(d));
}

// ─── File parsing ─────────────────────────────────────────────────────────────

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function extractGid(url: string): string {
  const m = url.match(/[#&]gid=(\d+)/);
  return m ? m[1] : '0';
}

async function parseLocalFile(): Promise<string[][] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/comma-separated-values',
      '*/*',
    ],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const base64 = await new FSFile(uri).base64();

  const wb = XLSX.read(base64, { type: 'base64' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
}

async function parseGoogleSheet(url: string): Promise<string[][]> {
  const sheetId = extractSheetId(url);
  if (!sheetId) throw new Error('URL de Google Sheets inválida. Debe tener el formato: docs.google.com/spreadsheets/d/...');
  const gid = extractGid(url);
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error('No se pudo acceder a la planilla. Verificá que esté compartida como "Cualquiera con el enlace puede ver".');
  const csv = await res.text();

  const wb = XLSX.read(csv, { type: 'string' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

function applyMappingToRows(rawData: string[][], headers: string[], mapping: Mapping): ParsedRow[] {
  return rawData
    .slice(1)
    .filter(row => row.some(cell => cell?.toString().trim()))
    .map((row) => {
      let nombre = '';
      let apellido = '';
      let edad: number | null = null;
      let celular: string | null = null;
      let email: string | null = null;
      let genero: 'masculino' | 'femenino' | null = null;
      let dias_disponibles: string[] = [];
      let tipo_grupo: 'chicas' | 'chicos' | 'mixto_solteros' | 'casados' | null = null;
      let modalidad: 'online' | 'presencial' | null = null;

      headers.forEach((h, i) => {
        const dbField = mapping[h];
        const val = (row[i] ?? '').toString().trim();
        if (!val || dbField === 'ignorar') return;

        switch (dbField) {
          case 'nombre': nombre = val; break;
          case 'apellido': apellido = val; break;
          case 'nombre+apellido': {
            const spaceIdx = val.indexOf(' ');
            if (spaceIdx > 0) {
              nombre = val.slice(0, spaceIdx);
              apellido = val.slice(spaceIdx + 1);
            } else {
              nombre = val;
            }
            break;
          }
          case 'edad': {
            const n = parseInt(val, 10);
            edad = isNaN(n) ? null : n;
            break;
          }
          case 'celular':          celular = val; break;
          case 'email':            email = val; break;
          case 'genero':           genero = normalizeGenero(val); break;
          case 'dias_disponibles': dias_disponibles = normalizeDias(val); break;
          case 'tipo_grupo':       tipo_grupo = normalizeTipoGrupo(val); break;
          case 'modalidad':        modalidad = normalizeModalidad(val); break;
        }
      });

      const missing: string[] = [];
      if (!nombre)   missing.push('nombre');
      if (!apellido) missing.push('apellido');

      return {
        nombre, apellido, edad, celular, email, genero,
        dias_disponibles, tipo_grupo, modalidad,
        _valid: missing.length === 0,
        _errorMsg: missing.length > 0 ? `Falta: ${missing.join(', ')}` : '',
      };
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminImportTab() {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [step, setStep]             = useState<ImportStep>('idle');
  const [source, setSource]         = useState<SourceType>('local');
  const [sheetsUrl, setSheetsUrl]   = useState('');
  const [showGuide, setShowGuide]   = useState(false);
  const [rawData, setRawData]       = useState<string[][]>([]);
  const [headers, setHeaders]       = useState<string[]>([]);
  const [mapping, setMapping]       = useState<Mapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ ok: number; skip: number } | null>(null);

  const validRows   = parsedRows.filter(r => r._valid);
  const invalidRows = parsedRows.filter(r => !r._valid);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handlePickFile = async () => {
    try {
      const data = await parseLocalFile();
      if (!data) return;
      await processRawData(data);
    } catch (err: any) {
      Alert.alert('Error al leer archivo', err.message);
    }
  };

  const handleLoadSheets = async () => {
    if (!sheetsUrl.trim()) return Alert.alert('Error', 'Pegá la URL de la planilla');
    setStep('analyzing');
    try {
      const data = await parseGoogleSheet(sheetsUrl.trim());
      await processRawData(data);
    } catch (err: any) {
      setStep('idle');
      Alert.alert('Error', err.message);
    }
  };

  const processRawData = async (data: string[][]) => {
    if (data.length < 2) {
      return Alert.alert('Error', 'La planilla está vacía o solo tiene encabezados');
    }
    const hdrs = (data[0] as any[]).map(h => h?.toString().trim()).filter(Boolean);
    if (hdrs.length === 0) return Alert.alert('Error', 'No se detectaron columnas');

    setRawData(data);
    setHeaders(hdrs);
    setStep('analyzing');

    try {
      const { data: result, error } = await supabase.functions.invoke('map-excel-columns', {
        method: 'POST',
        body: { headers: hdrs },
      });
      if (error) throw new Error(error.message);
      if (!result?.success) throw new Error(result?.error ?? 'Error desconocido');
      setMapping(result.mapping ?? {});
    } catch (err: any) {
      // Fallback: marcar todo como ignorar para que el usuario mapee manualmente
      const fallback: Mapping = {};
      hdrs.forEach(h => { fallback[h] = 'ignorar'; });
      setMapping(fallback);
      Alert.alert('IA no disponible', `Revisá el mapeo manualmente.\n${err.message}`);
    }

    setStep('mapping');
  };

  const pickFieldForHeader = (header: string) => {
    const options = DB_FIELDS.map(f => f.label);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: `Columna: "${header}"`, options: [...options, 'Cancelar'], cancelButtonIndex: options.length },
        (i) => { if (i < DB_FIELDS.length) setMapping(m => ({ ...m, [header]: DB_FIELDS[i].value })); }
      );
    } else {
      Alert.alert(`"${header}"`, 'Seleccioná el campo destino:', [
        ...DB_FIELDS.map(f => ({
          text: f.label,
          onPress: () => setMapping(m => ({ ...m, [header]: f.value })),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]);
    }
  };

  const confirmMapping = () => {
    const rows = applyMappingToRows(rawData, headers, mapping);
    if (rows.length === 0) {
      return Alert.alert('Sin datos', 'No se encontraron filas con datos después del encabezado');
    }
    setParsedRows(rows);
    setStep('preview');
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setStep('importing');
    try {
      const toInsert = validRows.map(r => ({
        nombre:           r.nombre,
        apellido:         r.apellido,
        edad:             r.edad,
        celular:          r.celular,
        email:            r.email,
        genero:           r.genero,
        dias_disponibles: r.dias_disponibles,
        tipo_grupo:       r.tipo_grupo,
        modalidad:        r.modalidad,
        status:           'en_proceso',
      }));

      const BATCH = 50;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const { data: inserted, error } = await supabase
          .from('personas')
          .insert(batch)
          .select('id, nombre, apellido, celular');
        if (error) throw new Error(error.message);

        // Crear pending_contact por cada persona para que el AI las evalúe
        const pendingContacts = (inserted ?? []).map((p: any) => ({
          name: `${p.nombre} ${p.apellido}`.trim(),
          phone: p.celular ?? '',
          status: 'pending',
          persona_id: p.id,
        }));
        if (pendingContacts.length > 0) {
          const { error: pcError } = await supabase
            .from('pending_contacts')
            .insert(pendingContacts);
          if (pcError) throw new Error(pcError.message);
        }
      }

      setImportResult({ ok: validRows.length, skip: invalidRows.length });
      setStep('done');
    } catch (err: any) {
      setStep('preview');
      Alert.alert('Error al importar', err.message);
    }
  };

  const reset = () => {
    setStep('idle');
    setSheetsUrl('');
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setParsedRows([]);
    setImportResult(null);
  };

  // ── Render: loading states ───────────────────────────────────────────────────

  if (step === 'analyzing' || step === 'importing') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          {step === 'analyzing' ? 'Analizando columnas con IA...' : 'Importando personas...'}
        </Text>
      </View>
    );
  }

  // ── Render: done ─────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={64} color={theme.success} />
        <Text style={styles.doneTitle}>{importResult?.ok} personas importadas</Text>
        {importResult && importResult.skip > 0 && (
          <Text style={styles.doneSkip}>{importResult.skip} filas omitidas por datos incompletos</Text>
        )}
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={reset}>
          <Text style={styles.primaryBtnText}>Importar otro archivo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: mapping review ───────────────────────────────────────────────────

  if (step === 'mapping') {
    const fieldLabel = (val: string) => DB_FIELDS.find(f => f.value === val)?.label ?? val;

    return (
      <ScrollView contentContainerStyle={styles.section}>
        <Text style={styles.sectionTitle}>Revisar mapeo de columnas</Text>
        <Text style={styles.sectionSubtitle}>
          La IA sugirió este mapeo. Tocá cualquier fila para cambiarla.
        </Text>

        {headers.map(h => (
          <TouchableOpacity key={h} style={styles.mappingRow} onPress={() => pickFieldForHeader(h)}>
            <Text style={styles.mappingHeader} numberOfLines={1}>"{h}"</Text>
            <Ionicons name="arrow-forward" size={14} color={theme.textMuted} style={styles.mappingArrow} />
            <View style={[
              styles.mappingPill,
              mapping[h] === 'ignorar' ? styles.mappingPillIgnored : styles.mappingPillActive,
            ]}>
              <Text style={[
                styles.mappingPillText,
                mapping[h] === 'ignorar' ? styles.mappingPillTextIgnored : styles.mappingPillTextActive,
              ]}>
                {fieldLabel(mapping[h] ?? 'ignorar')}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={confirmMapping}>
          <Text style={styles.primaryBtnText}>Confirmar y previsualizar →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Render: preview ──────────────────────────────────────────────────────────

  if (step === 'preview') {
    const preview = parsedRows.slice(0, 20);

    return (
      <ScrollView contentContainerStyle={styles.section}>
        <View style={styles.previewSummary}>
          <View style={styles.summaryBadge}>
            <Text style={[styles.summaryNum, { color: theme.success }]}>{validRows.length}</Text>
            <Text style={styles.summaryLabel}>válidas</Text>
          </View>
          {invalidRows.length > 0 && (
            <View style={styles.summaryBadge}>
              <Text style={[styles.summaryNum, { color: theme.danger }]}>{invalidRows.length}</Text>
              <Text style={styles.summaryLabel}>con error</Text>
            </View>
          )}
        </View>

        {parsedRows.length > 20 && (
          <Text style={styles.sectionSubtitle}>
            Mostrando primeras 20 de {parsedRows.length} filas
          </Text>
        )}

        {preview.map((row, i) => (
          <View key={i} style={[styles.previewCard, !row._valid && styles.previewCardError]}>
            <View style={styles.previewCardRow}>
              <Text style={styles.previewName}>{row.nombre || '—'} {row.apellido || '—'}</Text>
              {row.edad != null && <Text style={styles.previewMeta}>{row.edad} años</Text>}
            </View>
            {(row.celular || row.email) && (
              <Text style={styles.previewMeta}>
                {[row.celular, row.email].filter(Boolean).join(' · ')}
              </Text>
            )}
            {row._errorMsg ? (
              <Text style={styles.previewError}>{row._errorMsg}</Text>
            ) : (
              <View style={styles.previewTags}>
                {row.genero     && <View style={styles.tag}><Text style={styles.tagText}>{row.genero}</Text></View>}
                {row.tipo_grupo && <View style={styles.tag}><Text style={styles.tagText}>{row.tipo_grupo}</Text></View>}
                {row.modalidad  && <View style={styles.tag}><Text style={styles.tagText}>{row.modalidad}</Text></View>}
              </View>
            )}
          </View>
        ))}

        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('mapping')}>
            <Text style={styles.secondaryBtnText}>← Ajustar mapeo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, styles.previewImportBtn, validRows.length === 0 && styles.btnDisabled]}
            onPress={handleImport}
            disabled={validRows.length === 0}
          >
            <Text style={styles.primaryBtnText}>
              Importar {validRows.length} {validRows.length === 1 ? 'persona' : 'personas'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Render: idle ─────────────────────────────────────────────────────────────

  return (
    <ScrollView contentContainerStyle={styles.section}>

      {/* Column guide */}
      <TouchableOpacity style={styles.guideToggle} onPress={() => setShowGuide(g => !g)}>
        <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
        <Text style={styles.guideToggleText}>Guía de columnas</Text>
        <Ionicons name={showGuide ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} />
      </TouchableOpacity>

      {showGuide && (
        <View style={styles.guideBox}>
          {COLUMN_GUIDE.map(g => (
            <View key={g.field} style={styles.guideRow}>
              <View style={styles.guideFieldRow}>
                <Text style={styles.guideField}>{g.field}</Text>
                {g.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>requerido</Text>
                  </View>
                )}
              </View>
              <Text style={styles.guideDesc}>{g.desc}</Text>
              <Text style={styles.guideExample}>Ej: {g.example}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Source selector */}
      <View style={styles.sourceTabs}>
        <TouchableOpacity
          style={[styles.sourceTab, source === 'local' && styles.sourceTabActive]}
          onPress={() => setSource('local')}
        >
          <Ionicons name="document-outline" size={16} color={source === 'local' ? theme.primary : theme.textMuted} />
          <Text style={[styles.sourceTabText, source === 'local' && styles.sourceTabTextActive]}>
            Archivo local
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sourceTab, source === 'sheets' && styles.sourceTabActive]}
          onPress={() => setSource('sheets')}
        >
          <Ionicons name="logo-google" size={16} color={source === 'sheets' ? theme.primary : theme.textMuted} />
          <Text style={[styles.sourceTabText, source === 'sheets' && styles.sourceTabTextActive]}>
            Google Sheets
          </Text>
        </TouchableOpacity>
      </View>

      {source === 'local' && (
        <TouchableOpacity style={styles.filePicker} onPress={handlePickFile}>
          <Ionicons name="cloud-upload-outline" size={44} color={theme.primary} />
          <Text style={styles.filePickerTitle}>Seleccionar archivo</Text>
          <Text style={styles.filePickerSub}>.xlsx, .xls o .csv</Text>
        </TouchableOpacity>
      )}

      {source === 'sheets' && (
        <View style={styles.sheetsSection}>
          <Text style={styles.inputLabel}>URL de la planilla</Text>
          <Text style={styles.inputHint}>
            La planilla debe estar compartida como "Cualquiera con el enlace puede ver"
          </Text>
          <TextInput
            style={styles.textInput}
            value={sheetsUrl}
            onChangeText={setSheetsUrl}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLoadSheets}>
            <Text style={styles.primaryBtnText}>Cargar planilla</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    centered: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      gap: 16, padding: 32,
    },
    loadingText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' },
    section: { padding: 16, gap: 12 },

    // Guide
    guideToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: theme.border,
    },
    guideToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.primary },
    guideBox: {
      backgroundColor: theme.surface, borderRadius: 10, padding: 14,
      borderWidth: 1, borderColor: theme.border, gap: 14,
    },
    guideRow: { gap: 2 },
    guideFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    guideField: { fontSize: 13, fontWeight: '700', color: theme.text },
    requiredBadge: {
      backgroundColor: theme.dangerSurface, borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 1,
    },
    requiredText: { fontSize: 10, color: theme.danger, fontWeight: '600' },
    guideDesc: { fontSize: 12, color: theme.textSecondary },
    guideExample: { fontSize: 11, color: theme.textMuted },

    // Source tabs
    sourceTabs: { flexDirection: 'row', gap: 8 },
    sourceTab: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, borderRadius: 10, paddingVertical: 10,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    },
    sourceTabActive: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    sourceTabText: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
    sourceTabTextActive: { color: theme.primary, fontWeight: '600' },

    // File picker
    filePicker: {
      alignItems: 'center', justifyContent: 'center', gap: 10,
      borderRadius: 14, borderWidth: 2, borderStyle: 'dashed',
      borderColor: theme.border, paddingVertical: 44,
      backgroundColor: theme.surface,
    },
    filePickerTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
    filePickerSub: { fontSize: 13, color: theme.textMuted },

    // Sheets
    sheetsSection: { gap: 10 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: theme.text },
    inputHint: { fontSize: 12, color: theme.textMuted, marginTop: -4 },
    textInput: {
      backgroundColor: theme.surface, borderRadius: 10,
      borderWidth: 1, borderColor: theme.borderInput,
      padding: 12, fontSize: 13, color: theme.text,
    },

    // Mapping
    sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.text },
    sectionSubtitle: { fontSize: 13, color: theme.textMuted },
    mappingRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: theme.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: theme.border,
    },
    mappingHeader: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.text },
    mappingArrow: { marginHorizontal: 8 },
    mappingPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 4 },
    mappingPillActive: { backgroundColor: theme.primarySurface },
    mappingPillIgnored: { backgroundColor: theme.surfaceAlt },
    mappingPillText: { fontSize: 12, fontWeight: '600' },
    mappingPillTextActive: { color: theme.primary },
    mappingPillTextIgnored: { color: theme.textMuted },

    // Preview
    previewSummary: { flexDirection: 'row', gap: 24, marginBottom: 4 },
    summaryBadge: { alignItems: 'center', gap: 2 },
    summaryNum: { fontSize: 32, fontWeight: '800' },
    summaryLabel: { fontSize: 12, color: theme.textMuted },
    previewCard: {
      backgroundColor: theme.surface, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: theme.border, gap: 4,
    },
    previewCardError: { borderColor: theme.dangerBorder, backgroundColor: theme.dangerSurface },
    previewCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewName: { fontSize: 14, fontWeight: '600', color: theme.text },
    previewMeta: { fontSize: 12, color: theme.textSecondary },
    previewError: { fontSize: 12, color: theme.danger, fontWeight: '500' },
    previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    tag: { backgroundColor: theme.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    tagText: { fontSize: 11, color: theme.textSecondary },
    previewActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
    previewImportBtn: { flex: 1 },

    // Buttons
    primaryBtn: {
      backgroundColor: theme.primary, borderRadius: 10,
      paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    secondaryBtn: {
      backgroundColor: theme.surface, borderRadius: 10, paddingVertical: 13,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
      borderWidth: 1, borderColor: theme.border,
    },
    secondaryBtnText: { color: theme.text, fontSize: 14, fontWeight: '500' },
    btnDisabled: { opacity: 0.4 },

    // Done
    doneTitle: { fontSize: 22, fontWeight: '700', color: theme.text },
    doneSkip: { fontSize: 14, color: theme.textMuted, textAlign: 'center' },
  });
}
