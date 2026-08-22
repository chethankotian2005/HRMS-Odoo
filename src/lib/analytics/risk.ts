import prisma from "@/lib/prisma";

export interface AttritionRiskResult {
  employeeId: string;
  name: string;
  score: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
}

export async function computeAttritionRisk(orgId: string): Promise<AttritionRiskResult[]> {
  // Use pure SQL for the heavy lifting to avoid memory bloat
  const records: any[] = await prisma.$queryRaw`
    SELECT 
      a."employeeId",
      e."firstName",
      e."lastName",
      CAST(COUNT(*) FILTER (WHERE a.date >= CURRENT_DATE - INTERVAL '12 weeks') AS INTEGER) AS total_12w,
      CAST(COUNT(*) FILTER (WHERE a.status = 'PRESENT' AND a.date >= CURRENT_DATE - INTERVAL '12 weeks') AS INTEGER) AS present_12w,
      CAST(COUNT(*) FILTER (WHERE a.date >= CURRENT_DATE - INTERVAL '4 weeks') AS INTEGER) AS total_4w,
      CAST(COUNT(*) FILTER (WHERE a.status = 'PRESENT' AND a.date >= CURRENT_DATE - INTERVAL '4 weeks') AS INTEGER) AS present_4w,
      CAST(COUNT(*) FILTER (WHERE a.status = 'ABSENT' AND a.date >= CURRENT_DATE - INTERVAL '12 weeks') AS INTEGER) AS total_absent_12w,
      CAST(COUNT(*) FILTER (WHERE a.status = 'ABSENT' AND a.date >= CURRENT_DATE - INTERVAL '12 weeks' AND EXTRACT(ISODOW FROM a.date) IN (1, 5)) AS INTEGER) AS mon_fri_absent
    FROM "AttendanceRecord" a
    JOIN "Employee" e ON a."employeeId" = e.id
    WHERE a."orgId" = ${orgId}
      AND e."deletedAt" IS NULL
    GROUP BY a."employeeId", e."firstName", e."lastName"
  `;

  const results: AttritionRiskResult[] = [];

  for (const row of records) {
    const reasons: string[] = [];
    let riskPoints = 0;

    // 1. Calculate Baselines
    const rate12w = row.total_12w > 0 ? row.present_12w / row.total_12w : 0;
    const rate4w = row.total_4w > 0 ? row.present_4w / row.total_4w : 0;

    // Detect drop in attendance (> 10% drop from baseline)
    if (row.total_12w > 10 && row.total_4w > 0) { // ensure statistical significance
      if (rate4w < rate12w - 0.10) {
        reasons.push(`Recent 4-week attendance dropped to ${(rate4w * 100).toFixed(1)}% (vs 12-week baseline of ${(rate12w * 100).toFixed(1)}%)`);
        riskPoints += 2;
      } else if (rate4w < rate12w - 0.05) {
        reasons.push(`Recent 4-week attendance dropped slightly to ${(rate4w * 100).toFixed(1)}%`);
        riskPoints += 1;
      }
    }

    // 2. Detect Mon/Fri Clustering
    if (row.total_absent_12w >= 3) { // Only evaluate if they have a meaningful number of absences
      const clusteringRatio = row.mon_fri_absent / row.total_absent_12w;
      if (clusteringRatio >= 0.5) {
        reasons.push(`${(clusteringRatio * 100).toFixed(1)}% of absences fall on a Monday or Friday (${row.mon_fri_absent}/${row.total_absent_12w} days)`);
        riskPoints += 2;
      }
    }

    let score: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (riskPoints >= 3) score = 'HIGH';
    else if (riskPoints >= 1) score = 'MEDIUM';

    results.push({
      employeeId: row.employeeId,
      name: `${row.firstName} ${row.lastName}`,
      score,
      reasons
    });
  }

  // Filter out LOW risk for the dashboard to reduce noise, unless you want to see all
  // The plan specified keeping mostly Medium/High for the panel
  return results.filter(r => r.score !== 'LOW').sort((a, b) => a.score === 'HIGH' ? -1 : 1);
}
