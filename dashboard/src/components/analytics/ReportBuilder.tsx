'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '@/components/ui';

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

  const generateReport = async (format: 'pdf' | 'excel') => {
    const enabledSections = sections.filter(s => s.enabled);
    
    if (enabledSections.length === 0) {
      alert('Please select at least one section to include in the report');
      return;
    }

    // Import export functions dynamically
    const { exportToPDF, exportToExcel, exportDashboardToPDF } = await import('@/lib/export');
    
    // Mock data for demonstration (in production, fetch real data)
    const mockData = {
      overview: [
        { metric: 'Total Bots', value: 1234, status: 'Active' },
        { metric: 'Active Attacks', value: 45, status: 'Running' },
        { metric: 'Success Rate', value: '87%', status: 'Good' },
      ],
      bot_stats: [
        { region: 'US-East', count: 450, status: 'Healthy' },
        { region: 'EU-West', count: 320, status: 'Healthy' },
        { region: 'Asia-Pacific', count: 464, status: 'Degraded' },
      ],
      attack_history: [
        { timestamp: '2026-02-25 10:30', target: '192.168.1.1', type: 'UDP Flood', status: 'Success' },
        { timestamp: '2026-02-25 09:15', target: '10.0.0.50', type: 'TCP SYN', status: 'Success' },
        { timestamp: '2026-02-25 08:00', target: '172.16.0.100', type: 'HTTP Flood', status: 'Failed' },
      ],
      performance: [
        { time: '00:00', cpu: 45, memory: 62, network: 78 },
        { time: '06:00', cpu: 52, memory: 68, network: 85 },
        { time: '12:00', cpu: 71, memory: 75, network: 92 },
      ],
      security: [
        { event: 'Unauthorized Access', severity: 'High', count: 3 },
        { event: 'Rate Limit Exceeded', severity: 'Medium', count: 15 },
        { event: 'Invalid Credentials', severity: 'Low', count: 42 },
      ],
      bandwidth: [
        { interface: 'eth0', in: '1.2 GB', out: '3.4 GB', utilization: '45%' },
        { interface: 'eth1', in: '0.8 GB', out: '2.1 GB', utilization: '32%' },
      ],
    };

    try {
      if (format === 'pdf') {
        // Prepare sections for PDF export
        const pdfSections = enabledSections.map(section => ({
          title: section.title,
          data: mockData[section.id as keyof typeof mockData] || []
        }));

        exportDashboardToPDF(
          reportName,
          pdfSections,
          `${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
        );
      } else if (format === 'excel') {
        // Prepare sheets for Excel export
        const { exportMultiSheetExcel } = await import('@/lib/export');
        const excelSheets = enabledSections.map(section => ({
          name: section.title,
          data: mockData[section.id as keyof typeof mockData] || []
        }));

        exportMultiSheetExcel(
          excelSheets,
          `${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`
        );
      }

      alert(`${format.toUpperCase()} report generated successfully!`);
    } catch (error) {
      console.error(`Error generating ${format} report:`, error);
      alert(`Failed to generate ${format} report. Please try again.`);
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
