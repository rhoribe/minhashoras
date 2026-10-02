import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { localDb, type LocalOvertimeRecord } from './db.js';
import { getAuthHeader, getCurrentUserId } from './auth.js';

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateClientCsv(records: LocalOvertimeRecord[], filename: string): void {
  const headers = ['Data', 'Entrada', 'Saida', 'Intervalo (min)', 'Horas Extras (min)', 'Categoria', 'Descricao'];
  const rows = records.map(r => [
    r.record_date,
    r.start_time,
    r.end_time,
    r.break_duration_minutes,
    r.net_overtime_minutes,
    r.category,
    `"${(r.description || '').replace(/"/g, '""')}"`
  ].join(','));

  const content = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function generateClientPdf(records: LocalOvertimeRecord[], startDate: string, endDate: string, filename: string): void {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text('Minhas Horas - Extrato de Horas Extras', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periodo: ${startDate} ate ${endDate}`, 14, 28);

  const totalMin = records.reduce((acc, curr) => acc + curr.net_overtime_minutes, 0);
  const totalH = Math.floor(totalMin / 60);
  const totalM = totalMin % 60;
  doc.setTextColor(15, 23, 42);
  doc.text(`Total: +${totalH}h ${totalM.toString().padStart(2, '0')}m (${records.length} registros)`, 14, 35);

  const tableData = records.map(r => {
    const h = Math.floor(r.net_overtime_minutes / 60);
    const m = r.net_overtime_minutes % 60;
    return [
      r.record_date,
      r.start_time,
      r.end_time,
      `${r.break_duration_minutes}m`,
      `+${h}h ${m.toString().padStart(2, '0')}m`,
      r.description || '-'
    ];
  });

  (doc as any).autoTable({
    startY: 42,
    head: [['Data', 'Entrada', 'Saida', 'Pausa', 'Duracao', 'Descricao']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] },
  });

  doc.save(filename);
}

export async function exportReport(format: 'csv' | 'xlsx' | 'pdf', startDate: string, endDate: string): Promise<void> {
  const filename = `relatorio_horas_${startDate}_a_${endDate}.${format}`;

  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/v1/reports/export?format=${format}&start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      if (res.status === 401) {
        throw new Error('Sua sessão expirou ou o token é inválido. Por favor, autentique-se novamente.');
      }

      if (res.ok) {
        const blob = await res.blob();
        downloadBlob(blob, filename);
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Falha ao exportar relatório pelo servidor');
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('sessão expirou') || err.message.includes('autentique-se'))) {
        throw err;
      }
      // Fallback to client generation if network/server is unreachable
    }
  }

  // Offline client-side generation strictly scoped to the active user
  const currentUserId = getCurrentUserId();
  const allUserRecords = await localDb.overtimeRecords
    .where('user_id')
    .equals(currentUserId)
    .toArray();

  const records = allUserRecords
    .filter(r => (!startDate || r.record_date >= startDate) && (!endDate || r.record_date <= endDate))
    .sort((a, b) => b.record_date.localeCompare(a.record_date));

  if (format === 'csv') {
    generateClientCsv(records, filename);
  } else if (format === 'pdf') {
    generateClientPdf(records, startDate, endDate, filename);
  } else {
    // For xlsx while offline, export CSV with .csv fallback
    alert('Exportação XLSX online indisponível no modo offline. Gerando CSV com dados locais.');
    generateClientCsv(records, filename.replace('.xlsx', '.csv'));
  }
}
