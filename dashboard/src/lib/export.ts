/**
 * Export utilities for dashboard data
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: any[], filename: string, title?: string) {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Create new PDF document
  const doc = new jsPDF();
  
  // Add title
  if (title) {
    doc.setFontSize(16);
    doc.text(title, 14, 15);
  }
  
  // Get headers and rows
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(header => row[header]));
  
  // Generate table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: title ? 25 : 15,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Add footer with date
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  // Save PDF
  doc.save(`${filename}.pdf`);
}

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    ) + 2
  }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToJSON(data: any, filename: string) {
  const jsonContent = JSON.stringify(data, null, 2);
  
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function exportMultiSheetExcel(
  sheets: Array<{ name: string; data: any[] }>,
  filename: string
) {
  if (!sheets || sheets.length === 0) {
    console.error('No sheets to export');
    return;
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Add each sheet
  sheets.forEach(({ name, data }) => {
    if (data && data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Auto-size columns
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        ) + 2
      }));
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
  });
  
  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export chart/dashboard snapshot to PDF with custom layout
 */
export function exportDashboardToPDF(
  title: string,
  sections: Array<{ title: string; data: any[] }>,
  filename: string
) {
  const doc = new jsPDF();
  let yPosition = 20;
  
  // Main title
  doc.setFontSize(18);
  doc.text(title, 14, yPosition);
  yPosition += 15;
  
  // Add each section
  sections.forEach((section, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Section title
    doc.setFontSize(14);
    doc.text(section.title, 14, yPosition);
    yPosition += 10;
    
    if (section.data && section.data.length > 0) {
      const headers = Object.keys(section.data[0]);
      const rows = section.data.map(row => headers.map(header => row[header]));
      
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
        margin: { left: 14, right: 14 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }
  });
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Generated: ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  doc.save(`${filename}.pdf`);
}
