// Logic so sánh nhiều CV cho 1 JD — hoàn toàn dựa trên output THẬT của
// pipeline M1 (kỹ năng) → M2 (độ tương đồng) → M3 (features + điểm), không gọi
// AI/API ngoài: chỉ là quy tắc tính toán minh bạch, giải thích được.

export type JobFeatures = {
  skill_overlap_count?: number;
  skill_ratio?: number;
  jd_skill_count?: number;
  cv_exp_years?: number;
  jd_exp_min?: number;
  exp_ok?: number | boolean;
  m2_similarity?: number;
};

export type JobResult = {
  score?: number;
  similarity?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  cv_exp_years?: number;
  job_title?: string;
  features?: JobFeatures;
};

export type RankedCandidate = {
  id: string;
  label: string;
  result: JobResult;
};

const norm = (s: string) => s.trim().toLowerCase();

// Các chỉ số dùng để so sánh — ưu tiên features của M3, thiếu (kết quả cũ)
// thì suy ra từ các trường cấp ngoài.
function metrics(r: JobResult) {
  const f = r.features ?? {};
  const matched = r.matched_skills?.length ?? 0;
  const missing = r.missing_skills?.length ?? 0;
  const overlap = f.skill_overlap_count ?? matched;
  const jdCount = f.jd_skill_count ?? matched + missing;
  return {
    score: r.score ?? 0,
    overlap,
    ratio: f.skill_ratio ?? (jdCount > 0 ? overlap / jdCount : 0),
    sim: f.m2_similarity ?? r.similarity ?? null, // null = kết quả cũ không lưu
    exp: f.cv_exp_years ?? r.cv_exp_years ?? 0,
    expReq: f.jd_exp_min ?? 0,
    expOk: f.exp_ok == null ? null : Boolean(f.exp_ok),
  };
}

// Sắp xếp: điểm M3 giảm dần; hoà điểm thì ai khớp nhiều kỹ năng hơn xếp trên.
export function compareCandidates(a: JobResult, b: JobResult): number {
  const ma = metrics(a);
  const mb = metrics(b);
  if (mb.score !== ma.score) return mb.score - ma.score;
  return mb.overlap - ma.overlap;
}

const fmtYears = (y: number) => `${Number.isInteger(y) ? y : y.toFixed(1)} năm`;

/**
 * Giải thích vì sao `upper` xếp trên `lower` (hoặc ngược lại khi `upper` là
 * người đứng đầu, so với người thứ 2). Trả về 1 câu tiếng Việt.
 */
export function explainRank(upper: RankedCandidate, lower: RankedCandidate): string {
  const a = metrics(upper.result);
  const b = metrics(lower.result);
  const pros: string[] = [];
  const cons: string[] = [];

  const dSkill = a.overlap - b.overlap;
  if (dSkill > 0) pros.push(`khớp nhiều hơn ${dSkill} kỹ năng JD yêu cầu`);
  else if (dSkill < 0) cons.push(`khớp ít hơn ${-dSkill} kỹ năng`);

  const dSim = a.sim != null && b.sim != null ? Math.round((a.sim - b.sim) * 100) : 0;
  if (dSim >= 3) pros.push(`nội dung CV sát JD hơn (tương đồng M2 +${dSim} điểm)`);
  else if (dSim <= -3) cons.push(`nội dung CV kém sát JD hơn (${dSim} điểm tương đồng)`);

  if (a.expOk === true && b.expOk === false) {
    pros.push(`đạt yêu cầu kinh nghiệm tối thiểu${a.expReq ? ` (${fmtYears(a.expReq)})` : ""}, người kia chưa đạt`);
  } else if (a.expOk === false && b.expOk === true) {
    cons.push("chưa đạt yêu cầu kinh nghiệm tối thiểu");
  } else {
    const dExp = a.exp - b.exp;
    if (dExp >= 1) pros.push(`nhiều hơn ${fmtYears(dExp)} kinh nghiệm`);
    else if (dExp <= -1) cons.push(`ít hơn ${fmtYears(-dExp)} kinh nghiệm`);
  }

  const dScore = Math.round(a.score - b.score);
  const vs = lower.label;
  if (pros.length === 0 && cons.length === 0) {
    return dScore === 0
      ? `Ngang điểm với ${vs} — các chỉ số gần như tương đương.`
      : `Hơn ${vs} ${dScore} điểm — các chỉ số chính gần tương đương, chênh lệch đến từ tổng hợp của mô hình M3.`;
  }
  if (pros.length === 0) {
    return `Hơn ${vs} ${dScore} điểm dù ${cons.join(", ")} — M3 đánh giá tổng thể vẫn nhỉnh hơn.`;
  }
  const head = dScore > 0 ? `Hơn ${vs} ${dScore} điểm nhờ ` : `Ngang điểm ${vs}, nhưng `;
  return head + pros.join(", ") + (cons.length ? `; dù ${cons.join(", ")}` : "") + ".";
}

export type SkillRow = {
  skill: string;                 // tên hiển thị
  has: Record<string, boolean | null>; // id ứng viên → có / thiếu / không rõ
  haveCount: number;
};

/**
 * Ma trận kỹ năng: hàng = kỹ năng JD yêu cầu (hợp của matched + missing mà
 * M1 trích được qua tất cả CV), cột = ứng viên. Sắp xếp: kỹ năng ÍT người có
 * nhất lên đầu (điểm nghẽn tuyển dụng), cùng mức thì theo tên.
 */
export function buildSkillMatrix(candidates: RankedCandidate[]): SkillRow[] {
  const display = new Map<string, string>();
  const matchedSets = new Map<string, Set<string>>();
  const missingSets = new Map<string, Set<string>>();

  for (const c of candidates) {
    const m = new Set<string>();
    const x = new Set<string>();
    for (const s of c.result.matched_skills ?? []) {
      const k = norm(s);
      if (!k) continue;
      m.add(k);
      if (!display.has(k)) display.set(k, s.trim());
    }
    for (const s of c.result.missing_skills ?? []) {
      const k = norm(s);
      if (!k) continue;
      x.add(k);
      if (!display.has(k)) display.set(k, s.trim());
    }
    matchedSets.set(c.id, m);
    missingSets.set(c.id, x);
  }

  const rows: SkillRow[] = [];
  for (const [k, label] of display) {
    const has: Record<string, boolean | null> = {};
    let haveCount = 0;
    for (const c of candidates) {
      if (matchedSets.get(c.id)?.has(k)) {
        has[c.id] = true;
        haveCount++;
      } else if (missingSets.get(c.id)?.has(k)) {
        has[c.id] = false;
      } else {
        has[c.id] = null;
      }
    }
    rows.push({ skill: label, has, haveCount });
  }
  rows.sort((r1, r2) => r1.haveCount - r2.haveCount || r1.skill.localeCompare(r2.skill, "vi"));
  return rows;
}
