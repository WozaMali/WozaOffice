
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GenericPDFOptions {
  title: string;
  filename: string;
  columns: string[];
  rows: any[];
  logoPath?: string;
  reportType?: string;
  summary?: Record<string, any>;
  topPerformers?: Record<string, any>;
}

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

function formatKey(key: string): string {
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

export async function performExportToGenericPDF(options: GenericPDFOptions) {
  try {
    const doc = new jsPDF();
    
    // Add Logo
    if (options.logoPath) {
      try {
        const imgData = await fetchImageAsBase64(options.logoPath);
        if (imgData) {
          // Assume 4:1 aspect ratio for logo
          doc.addImage(imgData, 'PNG', 14, 10, 40, 10);
        }
      } catch (e) {
        console.warn('Could not load logo for PDF', e);
      }
    }

    // Title
    doc.setFontSize(18);
    doc.text(options.title, 14, 28);
    
    let yPos = 35;

    // Summary Section
    if (options.summary) {
        yPos += 5;
        doc.setFontSize(14);
        doc.text("Summary", 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        
        // Convert summary object to array of arrays for autoTable
        // We'll arrange them in 2 columns
        const summaryEntries = Object.entries(options.summary);
        const summaryRows = [];
        for (let i = 0; i < summaryEntries.length; i += 2) {
            const row = [];
            // First column
            const [key1, val1] = summaryEntries[i];
            row.push(`${formatKey(key1)}: ${val1}`);
            
            // Second column (if exists)
            if (i + 1 < summaryEntries.length) {
                const [key2, val2] = summaryEntries[i + 1];
                row.push(`${formatKey(key2)}: ${val2}`);
            } else {
                row.push('');
            }
            summaryRows.push(row);
        }
        
        autoTable(doc, {
            startY: yPos,
            head: [],
            body: summaryRows,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Top Performers Section (if applicable)
    if (options.topPerformers) {
        Object.entries(options.topPerformers).forEach(([key, list]) => {
            if (Array.isArray(list) && list.length > 0) {
                doc.setFontSize(12);
                doc.text(formatKey(key), 14, yPos);
                yPos += 6;

                // Create simple table for list
                const listHeaders = Object.keys(list[0]).map(k => formatKey(k));
                const listData = list.map(item => Object.values(item) as any[]);

                autoTable(doc, {
                    startY: yPos,
                    head: [listHeaders],
                    body: listData,
                    theme: 'striped',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [66, 66, 66] }
                });
                
                yPos = (doc as any).lastAutoTable.finalY + 10;
            }
        });
    }

    // Detailed Data Table
    doc.setFontSize(12);
    doc.text("Detailed Data", 14, yPos);
    yPos += 6;

    // Convert object rows to array based on columns
    const tableBody = options.rows.map(row => options.columns.map(col => row[col]));

    autoTable(doc, {
      startY: yPos,
      head: [options.columns],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(options.filename);
  } catch (error) {
    console.error("Export to Generic PDF failed:", error);
    throw error;
  }
}
