<<<<<<< Updated upstream
const prisma = require('../src/db');

const machines = [
  { name: 'CNC-01', type: 'Turning', location: 'Bay A', status: 'running' },
  { name: 'CNC-02', type: 'Milling', location: 'Bay A', status: 'down' },
  { name: 'CNC-03', type: 'Turning', location: 'Bay B', status: 'running' },
  { name: 'CNC-04', type: 'Grinding', location: 'Bay B', status: 'idle' },
  { name: 'CNC-05', type: 'Milling', location: 'Bay C', status: 'maintenance' },
  { name: 'CNC-06', type: 'EDM', location: 'Bay C', status: 'running' },
];

function daysAgo(n, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const created = {};
  for (const m of machines) {
    const machine = await prisma.machine.upsert({
      where: { name: m.name },
      update: { type: m.type, location: m.location, status: m.status },
      create: m,
    });
    created[m.name] = machine;
  }

  const breakdowns = [
    { machine: 'CNC-02', cause: 'Tool holder broken', category: 'Mechanical', severity: 'critical', status: 'open', date: daysAgo(0, 8, 15), startTime: '08:15', endTime: null, durationHrs: 0, technician: 'Andi' },
    { machine: 'CNC-01', cause: 'Spindle overheat', category: 'Electrical', severity: 'warning', status: 'resolved', date: daysAgo(0, 6, 30), startTime: '06:30', endTime: '07:42', durationHrs: 1.2, technician: 'Budi' },
    { machine: 'CNC-04', cause: 'Belt wear', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(1, 14, 0), startTime: '14:00', endTime: '16:00', durationHrs: 2.0, technician: 'Cahyo' },
    { machine: 'CNC-03', cause: 'Coolant leak', category: 'Hydraulic', severity: 'info', status: 'resolved', date: daysAgo(1, 9, 10), startTime: '09:10', endTime: '09:58', durationHrs: 0.8, technician: 'Andi' },
    { machine: 'CNC-05', cause: 'Scheduled PM', category: 'Preventive', severity: 'info', status: 'resolved', date: daysAgo(3, 8, 0), startTime: '08:00', endTime: '12:12', durationHrs: 4.2, technician: 'Budi' },
    { machine: 'CNC-02', cause: 'Tool Wear / Breakage', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(2, 10, 0), startTime: '10:00', endTime: '11:30', durationHrs: 1.5, technician: 'Cahyo' },
    { machine: 'CNC-01', cause: 'Tool Wear / Breakage', category: 'Mechanical', severity: 'warning', status: 'resolved', date: daysAgo(4, 13, 0), startTime: '13:00', endTime: '14:20', durationHrs: 1.3, technician: 'Andi' },
    { machine: 'CNC-06', cause: 'Electrical Fault', category: 'Electrical', severity: 'critical', status: 'resolved', date: daysAgo(5, 7, 0), startTime: '07:00', endTime: '09:30', durationHrs: 2.5, technician: 'Budi' },
  ];

  for (const b of breakdowns) {
    await prisma.breakdown.create({
      data: {
        machineId: created[b.machine].id,
        cause: b.cause,
        category: b.category,
        severity: b.severity,
        status: b.status,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        durationHrs: b.durationHrs,
        technician: b.technician,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
=======

>>>>>>> Stashed changes
