import fs from 'node:fs';

export function generateRouteCoverageReport(results) {
  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const byModule = results.reduce((acc, r) => {
    const module = r.path.split('/')[3] || 'health';
    acc[module] = acc[module] || { total: 0, passed: 0, failed: 0, statuses: {} };
    acc[module].total += 1;
    if (r.ok) acc[module].passed += 1;
    else acc[module].failed += 1;
    acc[module].statuses[r.status] = (acc[module].statuses[r.status] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    total,
    passed,
    failed,
    coverage: total > 0 ? Math.round((passed / total) * 100) : 0,
    byModule,
    slowRoutes: results.filter((r) => r.duration > 2000).sort((a, b) => b.duration - a.duration).slice(0, 10),
    errors: results.filter((r) => !r.ok).map((r) => ({
      method: r.method,
      path: r.path,
      status: r.status,
      message: r.message,
    })),
  };

  fs.writeFileSync('coverage/route-report.json', JSON.stringify(report, null, 2));
  fs.writeFileSync(
    'coverage/route-report.md',
    `# Route Coverage Report\n\nGenerated: ${report.generatedAt}\n\n- Total routes: ${report.total}\n- Passed: ${report.passed}\n- Failed: ${report.failed}\n- Coverage: ${report.coverage}%\n\n## By module\n\n| Module | Total | Passed | Failed |\n|---|---|---|---|\n${Object.entries(byModule).map(([m, v]) => `| ${m} | ${v.total} | ${v.passed} | ${v.failed} |`).join('\n')}\n\n## Errors\n\n${report.errors.length === 0 ? 'None' : report.errors.map((e) => `- ${e.method} ${e.path} -> ${e.status}: ${e.message}`).join('\n')}\n`,
  );
  return report;
}

export default { generateRouteCoverageReport };