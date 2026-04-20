const fs = require('fs');
const path = require('path');
const scanNormalizationService = require('../src/services/scanNormalizationService');

async function processBenchmark() {
  const filePath = path.join(__dirname, '../debug_scan_output.json');
  if (!fs.existsSync(filePath)) {
    console.error('Benchmark file not found:', filePath);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Processing benchmark for: ${rawData.target || 'unknown'}`);

  const normalization = scanNormalizationService.normalizeHexstrikeResultsDetailed(rawData);
  
  const results = {
    target: rawData.target,
    stats: normalization.stats,
    findings: normalization.findings.map(f => ({
      title: f.title,
      severity: f.severity,
      cveId: f.cveId,
      evidence_preview: f.evidence.substring(0, 100).replace(/\n/g, ' ')
    }))
  };

  fs.writeFileSync(path.join(__dirname, '../benchmark_results.json'), JSON.stringify(results, null, 2));
  console.log('Benchmark processing complete. Results saved to benchmark_results.json');
  
  console.log('\n--- Normalization Summary ---');
  console.log(`Total Raw Findings: ${normalization.stats.rawTotalFindings}`);
  console.log(`Matched Findings:   ${normalization.stats.filteredFindings}`);
  console.log(`Dropped (Noise):    ${normalization.stats.droppedFindings}`);
  console.log('-----------------------------\n');
}

processBenchmark();
