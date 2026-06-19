export function exportCSV(machines) {
  const rows = [
    ['Machine', 'Cluster', 'Line', 'Status', 'Availability%', 'Breakdowns', 'Downtime hrs', 'Last Incident'],
    ...machines.map((m) => [m.name, m.cluster, m.line, m.status, m.availability?.toFixed(1), m.breakdowns, m.downtime_hrs?.toFixed(1), m.last_incident]),
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `cnc-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}
