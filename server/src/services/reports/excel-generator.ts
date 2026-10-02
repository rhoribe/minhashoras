import ExcelJS from 'exceljs';
import type { OvertimeRecordEntity } from '../../repositories/records-repository.js';
import { formatMinutesToDisplay } from '../time-calculator.js';

export async function generateExcelReport(records: OvertimeRecordEntity[], startDate: string, endDate: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Minhas Horas PWA';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Banco de Horas Extras');

  // Title block
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Extrato de Horas Extras - Minhas Horas';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells('A2:G2');
  const periodCell = worksheet.getCell('A2');
  periodCell.value = `Período: ${startDate} a ${endDate} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`;
  periodCell.font = { name: 'Arial', size: 10, italic: true };
  periodCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Headers
  const headerRow = worksheet.getRow(4);
  headerRow.values = [
    'Data',
    'Entrada',
    'Saída',
    'Intervalo (min)',
    'Horas Extras (min)',
    'Duração Formatada',
    'Descrição'
  ];
  headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  headerRow.height = 24;

  // Add data rows
  let rowIndex = 5;
  for (const r of records) {
    const row = worksheet.getRow(rowIndex);
    row.values = [
      r.record_date,
      r.start_time,
      r.end_time,
      r.break_duration_minutes,
      r.net_overtime_minutes,
      formatMinutesToDisplay(r.net_overtime_minutes),
      r.description || ''
    ];
    row.alignment = { vertical: 'middle' };
    rowIndex++;
  }

  // Summary Row
  if (records.length > 0) {
    const sumRow = worksheet.getRow(rowIndex + 1);
    sumRow.getCell(1).value = 'TOTAL GERAL';
    sumRow.getCell(1).font = { bold: true };
    sumRow.getCell(5).value = { formula: `SUM(E5:E${rowIndex - 1})` };
    sumRow.getCell(5).font = { bold: true, color: { argb: 'FF16A34A' } };

    const totalMinutes = records.reduce((acc, curr) => acc + curr.net_overtime_minutes, 0);
    sumRow.getCell(6).value = formatMinutesToDisplay(totalMinutes);
    sumRow.getCell(6).font = { bold: true, color: { argb: 'FF16A34A' } };
  }

  // Adjust column widths
  worksheet.columns = [
    { width: 14 },
    { width: 10 },
    { width: 10 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 35 },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
