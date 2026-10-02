import PDFDocument from 'pdfkit';
import type { OvertimeRecordEntity } from '../../repositories/records-repository.js';
import { formatMinutesToDisplay } from '../time-calculator.js';

export function generatePdfReport(records: OvertimeRecordEntity[], startDate: string, endDate: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header Title
    doc.rect(40, 40, 515, 45).fill('#16a34a');
    doc.font('Helvetica-Bold').fillColor('#ffffff').fontSize(16).text('MINHAS HORAS - EXTRATO DE HORAS EXTRAS', 50, 52);
    doc.font('Helvetica').fontSize(9).text(`Período de referência: ${startDate} até ${endDate}`, 50, 70);

    doc.moveDown(3);

    // Summary Box
    const totalMinutes = records.reduce((acc, curr) => acc + curr.net_overtime_minutes, 0);
    const ySummary = 100;
    doc.roundedRect(40, ySummary, 515, 45, 6).fill('#1e293b');
    doc.fillColor('#94a3b8').fontSize(9).text('TOTAL DE REGISTROS', 55, ySummary + 10);
    doc.fillColor('#ffffff').fontSize(14).text(`${records.length}`, 55, ySummary + 22);

    doc.fillColor('#94a3b8').fontSize(9).text('TOTAL DE HORAS EXTRAS', 240, ySummary + 10);
    doc.fillColor('#4ade80').fontSize(14).text(`+${formatMinutesToDisplay(totalMinutes)}`, 240, ySummary + 22);

    doc.fillColor('#94a3b8').fontSize(9).text('STATUS DE CONFORMIDADE', 420, ySummary + 10);
    doc.fillColor('#ffffff').fontSize(11).text('Verificado', 420, ySummary + 24);

    // Table Header
    let y = 165;
    doc.rect(40, y, 515, 20).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(8);
    doc.text('DATA', 45, y + 6);
    doc.text('ENTRADA', 120, y + 6);
    doc.text('SAÍDA', 180, y + 6);
    doc.text('PAUSA', 240, y + 6);
    doc.text('DURAÇÃO', 300, y + 6);
    doc.text('DESCRIÇÃO', 380, y + 6);

    y += 20;

    // Table Rows
    doc.fontSize(8);
    for (const r of records) {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      doc.rect(40, y, 515, 20).fill(y % 40 === 0 ? '#f8fafc' : '#ffffff');
      doc.fillColor('#334155');

      doc.text(r.record_date, 45, y + 6);
      doc.text(r.start_time, 120, y + 6);
      doc.text(r.end_time, 180, y + 6);
      doc.text(`${r.break_duration_minutes}m`, 240, y + 6);
      doc.fillColor('#15803d').text(`+${formatMinutesToDisplay(r.net_overtime_minutes)}`, 300, y + 6);
      doc.fillColor('#64748b').text(r.description || '-', 380, y + 6, { width: 170, ellipsis: true });

      y += 20;
    }

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Relatório gerado em ${new Date().toLocaleString('pt-BR')} pelo sistema Minhas Horas PWA`,
      40,
      800,
      { align: 'center', width: 515 }
    );

    doc.end();
  });
}
