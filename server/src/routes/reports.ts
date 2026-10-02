import { FastifyInstance } from 'fastify';
import { recordsRepository } from '../repositories/records-repository.js';
import { generateCsvReport } from '../services/reports/csv-generator.js';
import { generateExcelReport } from '../services/reports/excel-generator.js';
import { generatePdfReport } from '../services/reports/pdf-generator.js';
import { optionalAuthenticate } from './auth-routes.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', optionalAuthenticate);

  // GET /reports/export
  app.get('/reports/export', async (req, reply) => {
    const userId = req.userId || (req.headers['x-user-id'] as string) || 'default_user';
    const { format, start_date, end_date } = req.query as {
      format?: string;
      start_date?: string;
      end_date?: string;
    };

    if (!format || !['csv', 'xlsx', 'pdf'].includes(format)) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Invalid or missing format. Expected "csv", "xlsx", or "pdf".'
      });
    }

    if (!start_date || !end_date) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'Missing start_date or end_date parameter.'
      });
    }

    const records = recordsRepository.findAll(userId, start_date, end_date);
    const filenamePrefix = `relatorio_horas_${start_date}_a_${end_date}`;

    if (format === 'csv') {
      const csvData = generateCsvReport(records, start_date, end_date);
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', `attachment; filename="${filenamePrefix}.csv"`);
      return reply.send(csvData);
    }

    if (format === 'xlsx') {
      const excelBuffer = await generateExcelReport(records, start_date, end_date);
      reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      reply.header('Content-Disposition', `attachment; filename="${filenamePrefix}.xlsx"`);
      return reply.send(excelBuffer);
    }

    if (format === 'pdf') {
      const pdfBuffer = await generatePdfReport(records, start_date, end_date);
      reply.header('Content-Type', 'application/pdf');
      reply.header('Content-Disposition', `attachment; filename="${filenamePrefix}.pdf"`);
      return reply.send(pdfBuffer);
    }
  });
}
