import type { OvertimeRecordEntity } from '../../repositories/records-repository.js';
import { formatMinutesToDisplay } from '../time-calculator.js';

export function generateCsvReport(records: OvertimeRecordEntity[], startDate: string, endDate: string): string {
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headers = [
    'Data',
    'Entrada',
    'Saida',
    'Intervalo (min)',
    'Horas Extras (min)',
    'Horas Extras (formatado)',
    'Categoria',
    'Descricao',
    'Status Sincronizacao'
  ];

  const rows = records.map(r => [
    escapeCsv(r.record_date),
    escapeCsv(r.start_time),
    escapeCsv(r.end_time),
    escapeCsv(r.break_duration_minutes),
    escapeCsv(r.net_overtime_minutes),
    escapeCsv(formatMinutesToDisplay(r.net_overtime_minutes)),
    escapeCsv(r.category),
    escapeCsv(r.description),
    escapeCsv(r.sync_status)
  ].join(','));

  const totalMinutes = records.reduce((acc, curr) => acc + curr.net_overtime_minutes, 0);

  const summary = [
    '',
    `"Período: ${startDate} até ${endDate}"`,
    `"Total de Registros: ${records.length}"`,
    `"Total de Horas Extras: ${formatMinutesToDisplay(totalMinutes)} (${totalMinutes} minutos)"`
  ];

  return [headers.join(','), ...rows, ...summary].join('\r\n');
}
