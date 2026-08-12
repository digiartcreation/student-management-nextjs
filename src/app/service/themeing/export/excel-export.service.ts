import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Workbook } from 'exceljs';
import { saveFile } from './save-file.util';
import { ToastService } from '../../../shared/toast/toast.service';

@Injectable({
  providedIn: 'root',
})
export class ExcelExportService {
  private toast = inject(ToastService);

  constructor(private http: HttpClient) {}

  async exportExcel(
    data: any[],
    plateNo: string,
    title = 'report',
    headerForPlateNo = 'Plate No:'
  ) {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Sheet 1');

    // Merge cells
    sheet.mergeCells('A1:C4');
    sheet.mergeCells('D1:G4');
    sheet.mergeCells('H1:J2');
    sheet.mergeCells('H3:J4');

    const arrayBuffer = await this.http
      .get('assets/mvtLogo.jpg', {
        responseType: 'arraybuffer',
      })
      .toPromise();

    // Add image to workbook
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'jpeg',
    });

    // Place the image (top-left corner in A1:B4)
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 202, height: 60 },
    });

    // Title
    const titleCell = sheet.getCell('D1');
    titleCell.value = title;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = {
      size: 16,
      color: { argb: 'FF00A0F4' },
      bold: true,
      underline: true,
    };

    // Plate No
    const plateCell = sheet.getCell('H1');
    plateCell.value = `${headerForPlateNo} ${plateNo}`;
    plateCell.font = { color: { argb: 'FF00A0F4' }, bold: true };
    plateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Date
    const dateCell = sheet.getCell('H3');
    const now = new Date();
    const dateString = `Created On: ${now.getDate()}-${
      now.getMonth() + 1
    }-${now.getFullYear()}`;
    dateCell.value = dateString;
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    dateCell.font = { bold: true };

    // Add headers
    const headers = Object.keys(data[0]);
    sheet.addRow(headers);
    const headerRow = sheet.getRow(5);
    headerRow.eachCell((cell: any) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.font = { size: 12, bold: true };
    });

    // Add data rows
    data.forEach((rowData) => {
      const row = sheet.addRow(Object.values(rowData));
      row.eachCell((cell: any) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    // Auto-fit columns
    headers.forEach((header, index) => {
      let maxLength = header.length;
      data.forEach((row) => {
        const value = row[header]?.toString() || '';
        if (value.length > maxLength) maxLength = value.length;
      });
      sheet.getColumn(index + 1).width = maxLength + 2; // +2 padding
    });

    // Download
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${plateNo}-${title}.xlsx`;
    try {
      const uri = await saveFile(
        buffer as ArrayBuffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      if (uri) this.toast.success(`Saved to Documents/${fileName}`);
    } catch {
      this.toast.error('Failed to save Excel file');
    }
  }
}
