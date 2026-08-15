import { Injectable } from '@angular/core';

/**
 * One column of an exported report. `value` pulls the cell out of the row so a
 * grid's display formatting and the exported file cannot drift apart — both are
 * fed from the same definition.
 */
export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
  /** Right-aligns in the PDF and formats as a number in Excel. */
  numeric?: boolean;
  width?: number;
}

export interface ExportOptions<T> {
  /** Used for the file name, the sheet name and the PDF heading. */
  title: string;
  /** Shown under the PDF heading — typically the active filters. */
  subtitle?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Rendered as a bold closing row in both formats. */
  totals?: Array<{ label: string; value: string }>;
}

/**
 * Excel and PDF export for the reports screen.
 *
 * Both libraries are loaded with a dynamic `import()` so they stay out of the
 * initial bundle: together they are well over a megabyte, and a user who never
 * opens Reports should never pay for them.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private fileStem(title: string): string {
    // Report titles carry the filters ("Attendance — 10-A — Aug 2026"), which is
    // useful in a file name but only once stripped of characters Windows and
    // macOS reject outright.
    const stamp = new Date().toISOString().slice(0, 10);
    const safe = title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return `${safe}-${stamp}`;
  }

  /**
   * Hands the finished file to the browser. Revoking on a later tick rather
   * than immediately matters: Firefox cancels a download whose object URL is
   * released in the same task.
   */
  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async toExcel<T>(options: ExportOptions<T>): Promise<void> {
    // ExcelJS is CommonJS, so the dynamic import resolves to a namespace whose
    // only key is `default` — reaching for `.Workbook` on it yields undefined
    // and throws on construction. Unwrapping `default` when it is there keeps
    // this working whichever shape the bundler produces.
    const module = await import('exceljs');
    const ExcelJS = ((module as unknown as { default?: typeof module }).default ??
      module) as typeof module;
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    // Excel rejects sheet names over 31 chars or containing []:*?/\ — a report
    // title routinely breaches both, so it is reduced rather than passed through.
    const sheetName = options.title.replace(/[\[\]:*?/\\]+/g, ' ').slice(0, 31) || 'Report';
    const sheet = workbook.addWorksheet(sheetName);

    const titleRow = sheet.addRow([options.title]);
    titleRow.font = { bold: true, size: 14 };
    sheet.mergeCells(1, 1, 1, Math.max(options.columns.length, 1));

    if (options.subtitle) {
      const subtitleRow = sheet.addRow([options.subtitle]);
      subtitleRow.font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, Math.max(options.columns.length, 1));
    }
    sheet.addRow([]);

    const headerRow = sheet.addRow(options.columns.map((column) => column.header));
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    for (const row of options.rows) {
      const values = options.columns.map((column) => column.value(row));
      const added = sheet.addRow(values);
      options.columns.forEach((column, index) => {
        if (column.numeric) added.getCell(index + 1).alignment = { horizontal: 'right' };
      });
    }

    if (options.totals?.length) {
      sheet.addRow([]);
      for (const total of options.totals) {
        const added = sheet.addRow([total.label, total.value]);
        added.font = { bold: true };
      }
    }

    options.columns.forEach((column, index) => {
      const body = options.rows.map((row) => String(column.value(row)).length);
      const widest = Math.max(column.header.length, ...(body.length ? body : [0]));
      sheet.getColumn(index + 1).width = column.width ?? Math.min(Math.max(widest + 2, 10), 40);
    });

    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

    const buffer = await workbook.xlsx.writeBuffer();
    this.download(
      new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${this.fileStem(options.title)}.xlsx`,
    );
  }

  async toPdf<T>(options: ExportOptions<T>): Promise<void> {
    // Interop, but the opposite way round from ExcelJS: jsPDF is exported both
    // as a named binding and as the module default, and that default *is* the
    // constructor rather than a namespace holding it. Unwrapping `default`
    // first — as the Excel path must — would leave `.jsPDF` undefined, so the
    // named export is preferred and `default` is only the fallback.
    const jspdfModule = (await import('jspdf')) as unknown as Record<string, unknown>;
    const jsPDF = (jspdfModule['jsPDF'] ??
      (jspdfModule['default'] as Record<string, unknown> | undefined)?.['jsPDF'] ??
      jspdfModule['default']) as typeof import('jspdf').jsPDF;

    const autoTableModule = (await import('jspdf-autotable')) as unknown as Record<string, unknown>;
    const autoTable = (autoTableModule['default'] ??
      autoTableModule) as typeof import('jspdf-autotable').default;

    // Reports are wide (date, roll, name, section, status, amount), so portrait
    // would force the last columns off the page.
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, 40, 40);

    if (options.subtitle) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110);
      doc.text(options.subtitle, 40, 57);
      doc.setTextColor(0);
    }

    autoTable(doc, {
      startY: options.subtitle ? 70 : 55,
      head: [options.columns.map((column) => column.header)],
      body: options.rows.map((row) => options.columns.map((column) => String(column.value(row)))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      columnStyles: Object.fromEntries(
        options.columns.map((column, index) => [index, { halign: column.numeric ? 'right' : 'left' }]),
      ),
      margin: { left: 40, right: 40 },
      // Page numbers have to be stamped per page; there is no "after all pages"
      // hook, and the total is unknown until the table has finished laying out.
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.setTextColor(130);
        const page = doc.getNumberOfPages();
        doc.text(
          `Page ${page}`,
          pageWidth - 40,
          doc.internal.pageSize.getHeight() - 20,
          { align: 'right' },
        );
        doc.text(
          `Generated ${new Date().toLocaleString()}`,
          data.settings.margin.left,
          doc.internal.pageSize.getHeight() - 20,
        );
        doc.setTextColor(0);
      },
    });

    if (options.totals?.length) {
      // `lastAutoTable` is attached to the doc by the plugin and is not in its
      // type surface, hence the narrow cast rather than an `any` on the doc.
      const endY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      options.totals.forEach((total, index) => {
        doc.text(`${total.label}: ${total.value}`, 40, endY + 24 + index * 15);
      });
    }

    this.download(doc.output('blob'), `${this.fileStem(options.title)}.pdf`);
  }
}
