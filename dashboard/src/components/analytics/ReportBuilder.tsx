'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '@/components/ui';
import jsPDF from 'jspdf';
import { utils, writeFile } from 'xlsx';

interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'metrics' | 'text';
  enabled: boolean;
}

const AVAILABLE_SECTIONS: ReportSection[] = [
  { id: 'overview', title: 'System Overview', type: 'metrics', enabled: true },
  { id: 'bot_stats', title: 'Bot Statistics', type: 'chart', enabled: true },
  { id: 'attack_history', title: 'Attack History', type: 'table', enabled: true },
  { id: 'performance', title: 'Performance Metrics', type: 'chart', enabled: false },
  { id: 'security', title: 'Security Events', type: 'table', enabled: false },
  { id: 'bandwidth', title: 'Bandwidth Usage', type: 'chart', enabled: false },
];

export function ReportBuilder() {
  const [sections, setSections] = useState<ReportSection[]>(AVAILABLE_SECTIONS);
  const [reportName, setReportName] = useState('Monthly Report');
  const [schedule, setSchedule] = useState('manual');

  const toggleSection = (id: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const generateReport = (format: 'pdf' | 'excel') => {
    const enabledSections = sections.filter(s => s.enabled);

    if (enabledSections.length === 0) {
      alert('Please select at least one section to include in the report');
      return;
    }

    const filename = `${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;

    if (format === 'pdf') {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text(reportName, 14, 20);

      // Generated date
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      // Sections list
      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text('Included Sections:', 14, 45);

      doc.setFontSize(11);
      enabledSections.forEach((section, index) => {
        doc.text(`• ${section.title} (${section.type})`, 18, 55 + index * 8);
      });

      doc.save(`${filename}.pdf`);
    } else {
      const wb = utils.book_new();

      // Summary sheet with report name and enabled sections
      const summaryData = [
        ['Report Name', reportName],
        ['Generated', new Date().toLocaleString()],
        [''],
        ['Included Sections', 'Type'],
        ...enabledSections.map(s => [s.title, s.type]),
      ];
      const ws = utils.aoa_to_sheet(summaryData);
      utils.book_append_sheet(wb, ws, 'Report Summary');

      writeFile(wb, `${filename}.xlsx`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Report Configuration */}
      <Card variant="bordered" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Build Custom Report</CardTitle>
          <CardDescription>Select sections to include in your report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Input
            label="Report Name"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Report Sections
            </label>
            <div className="space-y-2">
              {sections.map(section => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-3 glass-card rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 accent-accent-primary"
                    />
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {section.title}
                      </div>
                      <div className="text-xs text-text-muted capitalize">
                        {section.type}
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    section.enabled 
                      ? 'bg-accent-primary/20 text-accent-primary' 
                      : 'bg-white/10 text-text-muted'
                  }`}>
                    {section.enabled ? 'Included' : 'Excluded'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions & Schedule */}
      <div className="space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => generateReport('pdf')}
            >
              Generate PDF
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => generateReport('excel')}
            >
              Export to Excel
            </Button>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full px-3 py-2 bg-primary-bg-secondary border border-white/10 rounded-lg text-text-primary"
            >
              <option value="manual">Manual Only</option>
              <option value="daily">Daily at 9 AM</option>
              <option value="weekly">Weekly on Monday</option>
              <option value="monthly">Monthly on 1st</option>
            </select>
            {schedule !== 'manual' && (
              <Button variant="primary" size="sm" className="w-full">
                Save Schedule
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
