import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface EnhancedPDFOptions {
  title: string;
  filename: string;
  columns: string[];
  rows: any[];
  logoPath?: string;
  summary?: {
    total_watches?: number;
    qualified_watches?: number;
    total_credits_awarded?: number;
    qualification_rate?: string;
    unique_viewers?: number;
    avg_watch_duration_seconds?: number;
    completion_rate?: string;
  };
  dateRange?: {
    start_date?: string;
    end_date?: string;
  };
  filters?: {
    video_id?: string;
    user_id?: string;
  };
  topPerformers?: {
    topVideos: Array<{
        title: string;
        watches: number;
        credits: number;
    }>;
    topUsers: Array<{
        name: string;
        watches: number;
        credits: number;
    }>;
  };
}

export async function exportToEnhancedPDF(options: EnhancedPDFOptions) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
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
    
    // Date Range & Filters info
    doc.setFontSize(10);
    let yPos = 35;
    if (options.dateRange?.start_date || options.dateRange?.end_date) {
        doc.text(`Date Range: ${options.dateRange.start_date || 'Start'} to ${options.dateRange.end_date || 'Present'}`, 14, yPos);
        yPos += 5;
    }
    if (options.filters?.video_id || options.filters?.user_id) {
        doc.text(`Filters: ${options.filters.video_id ? 'Video ID: ' + options.filters.video_id : ''} ${options.filters.user_id ? 'User ID: ' + options.filters.user_id : ''}`, 14, yPos);
        yPos += 5;
    }

    // Summary Section
    if (options.summary) {
        yPos += 5;
        doc.setFontSize(12);
        doc.text("Summary", 14, yPos);
        yPos += 6;
        
        doc.setFontSize(10);
        const summaryData = [
            [`Total Watches: ${options.summary.total_watches ?? '-'}`, `Qualified: ${options.summary.qualified_watches ?? '-'}`],
            [`Total Credits: ${options.summary.total_credits_awarded ?? '-'}`, `Qualification Rate: ${options.summary.qualification_rate ?? '-'}`],
            [`Unique Viewers: ${options.summary.unique_viewers ?? '-'}`, `Avg Duration: ${options.summary.avg_watch_duration_seconds ?? '-'}s`]
        ];
        
        autoTable(doc, {
            startY: yPos,
            head: [],
            body: summaryData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Top Performers
    if (options.topPerformers) {
        const { topVideos, topUsers } = options.topPerformers;
        
        if (topVideos && topVideos.length > 0) {
            doc.setFontSize(12);
            doc.text("Top Videos", 14, yPos);
            yPos += 6;
            
            const videoRows = topVideos.map(v => [v.title, v.watches, v.credits]);
            autoTable(doc, {
                startY: yPos,
                head: [['Video Title', 'Watches', 'Credits']],
                body: videoRows,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
        
        if (topUsers && topUsers.length > 0) {
            doc.setFontSize(12);
            doc.text("Top Users", 14, yPos);
            yPos += 6;
            
            const userRows = topUsers.map(u => [u.name, u.watches, u.credits]);
            autoTable(doc, {
                startY: yPos,
                head: [['User', 'Watches', 'Credits']],
                body: userRows,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
            });
            yPos = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // Detailed List
    doc.setFontSize(12);
    doc.text("Detailed Data", 14, yPos);
    yPos += 6;

    // Map rows object to array based on columns
    // The input 'rows' is an array of objects where keys match columns?
    // In DiscoverEarnPage.tsx:
    // const rows = stats.watches.map((watch: any) => ({
    //   'User Name': ...,
    //   ...
    // }));
    // So rows is Array<Record<string, any>>.
    // autoTable expects body as Array<Array<any>> or Array<Object>.
    
    // We need to ensure the order of columns matches 'columns' array.
    const tableBody = options.rows.map(row => options.columns.map(col => row[col]));

    autoTable(doc, {
        startY: yPos,
        head: [options.columns],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 8 },
    });

    doc.save(options.filename);

  } catch (error) {
    console.error("Export to Enhanced PDF failed:", error);
    // Re-throw or handle?
    // If we re-throw, the toast.error in the component might catch it if it was awaited properly?
    // DiscoverEarnPage.tsx uses await.
    throw error;
  }
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
