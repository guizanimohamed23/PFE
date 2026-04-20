const prisma = require('../src/config/db');

const DEFAULTS = {
  critical: 9.0,
  high: 7.5,
  medium: 5.0,
  low: 2.5,
  info: 0.0,
};

async function main() {
  const vulns = await prisma.vulnerability.findMany({
    where: { cvssScore: null },
  });

  console.log(`Found ${vulns.length} vulnerabilities with NULL cvssScore.`);

  let updated = 0;
  for (const v of vulns) {
    const severity = (v.severity || '').toLowerCase();
    const score = DEFAULTS[severity] ?? 0.0;
    await prisma.vulnerability.update({
      where: { id: v.id },
      data: { cvssScore: score },
    });
    updated++;
  }

  console.log(`Updated ${updated} records.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
