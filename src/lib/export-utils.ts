import ExcelJS from 'exceljs';
// Temporarily disabled jsPDF due to build issues
// import jsPDF from 'jspdf';
// import autoTable from 'jspdf-autotable';

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

async function fetchImageAsBase64(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportToCSV(filename: string, columns: string[], rows: ExportRow[]) {
  const header = columns.join(',');
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const data = rows.map(r => columns.map(c => escape(r[c])).join(',')).join('\n');
  const csv = header + '\n' + data;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToXLSX(filename: string, sheetName: string, columns: string[], rows: ExportRow[], logoPath?: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName || 'Sheet1');

  // Logo (if available)
  if (logoPath) {
    const base64 = await fetchImageAsBase64(logoPath);
    if (base64) {
      const imageId = workbook.addImage({ base64, extension: (logoPath.endsWith('.png') ? 'png' : 'jpeg') as any });
      sheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 180, height: 60 }
      });
      sheet.getRow(1).height = 50;
      sheet.addRow([]);
    }
  }

  // Header
  sheet.addRow(columns);
  const headerRow = sheet.getRow(sheet.lastRow!.number);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } } as any;
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as any;
  });

  // Data
  rows.forEach(r => {
    sheet.addRow(columns.map(c => r[c] ?? ''));
  });
  sheet.columns.forEach((col) => { (col as any).width = Math.min(40, Math.max(12, ...(col?.values as any[] || []).map(v => String(v || '').length + 2))); });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// Temporarily disabled PDF export due to build issues
export async function exportToPDF(title: string, filename: string, columns: string[], rows: ExportRow[], logoPath?: string) {
  console.warn('PDF export is temporarily disabled due to build issues');
  // TODO: Re-enable when jsPDF build issues are resolved
}


