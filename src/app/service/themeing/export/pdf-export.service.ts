import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { saveFile } from './save-file.util';
import { ToastService } from '../../../shared/toast/toast.service';

@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  private toast = inject(ToastService);

  async generatePdf(
    data: any[],
    plateNo: string,
    title = 'Report',
    headerForPlateNo = 'Plate No:'
  ) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;

    // ------------------- Logo (Left) -------------------
    const image = await this.loadImageAsBase64(
      'assets/mvtLogo.jpg'
    );
    const imageY = margin;
    const imageWidth = 150;
    const imageHeight = 50;
    doc.addImage(image, 'PNG', margin, margin, imageWidth, imageHeight);

    // ------------------- Title (Center) -------------------
    doc.setFontSize(18);
    doc.setTextColor(0, 160, 244);
    doc.text(title, pageWidth / 2, imageY + 40, { align: 'center' });

    // ------------------- Plate No + Date (Right) -------------------
    const now = new Date();
    const dateString = `Created On: ${now.getDate()}-${
      now.getMonth() + 1
    }-${now.getFullYear()}`;
    const plateString = `${headerForPlateNo} ${plateNo}`;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const rightX = pageWidth - margin;
    doc.text(plateString, rightX, imageY + 35, { align: 'right' });
    doc.text(dateString, rightX, imageY + 50, { align: 'right' });

    // ------------------- Table -------------------
    // ------------------- Table -------------------
    const headerKeys = Object.keys(data[0]); // store exact keys
    const headers = [headerKeys];

    // build body strictly using header keys
    const body = data.map((row) =>
      headerKeys.map((key) =>
        row[key] !== undefined ? row[key].toString().trim() : ''
      )
    );

    autoTable(doc, {
      head: headers,
      body,
      startY: imageY + imageHeight + 40,
      margin: { left: margin, right: margin },
      tableWidth: 'auto',
      styles: {
        cellWidth: 'wrap',
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle',
        fontSize: 6,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [0, 136, 255],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 6,
        lineWidth: 0.2,
        lineColor: [0, 0, 0],
      },
      columnStyles: (() => {
        const styles: any = {};
        if (headers.length > 0) {
          headers[0].forEach((colName: string, index: number) => {
            const lower = colName.toLowerCase();
            if (lower.includes('location') || lower.includes('address')) {
              styles[index] = { cellWidth: 120, overflow: 'linebreak' }; // ✅ narrower
            } else {
              styles[index] = { cellWidth: 'auto' }; // let autotable auto-balance
            }
          });
        }
        return styles;
      })(),
      tableLineWidth: 0.3,
      tableLineColor: [0, 0, 0],
    } as UserOptions);

    // ------------------- Save -------------------
    const fileName = `${plateNo}-${title}.pdf`;
    try {
      const uri = await saveFile(doc.output('arraybuffer'), fileName, 'application/pdf');
      if (uri) this.toast.success(`Saved to Documents/${fileName}`);
    } catch {
      this.toast.error('Failed to save PDF');
    }
  }

  private loadImageAsBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
}
