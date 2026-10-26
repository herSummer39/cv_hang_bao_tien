/**
 * dynamicSpeechNormalizer.ts
 * ---------------------------------------------------------------------------
 * Chuẩn hóa ĐỘNG văn bản từ Web Speech API (vi-VN) cho cả 17 nhóm ngành.
 *
 * Web Speech API (vi-VN) thường phiên âm thuật ngữ tiếng Anh thành âm tiếng
 * Việt ("rì ác" → React, "a pi ai" → API, "kây pi ai" → KPI ...). Thay vì
 * hardcode từ điển cho riêng ngành IT, module này dựng "từ vựng đích" từ chính
 * metadata của câu hỏi đang trả lời (skill_tag, expected[], sample_answer,
 * red_flags[], kỹ năng JD/CV) rồi so khớp theo "khung ngữ âm" (phonetic
 * skeleton) bằng cửa sổ trượt n-gram. Chạy 100% local, không gọi API ngoài.
 */

export interface QuestionContext {
  question?: string;
  skill_tag?: string;
  expected?: string[];
  sample_answer?: string;
  red_flags?: string[];
  jd_skills?: string[];
}

// ─── Tiện ích chuỗi ──────────────────────────────────────────────────────────

/** Bỏ dấu tiếng Việt (xử lý riêng đ/Đ vì NFD không tách được). */
export function stripDiacritics(s: string): string {
  return s
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ─── Bản đồ ngữ âm Việt → thuật ngữ (đã bỏ dấu, chữ thường) ────────────────

// Cụm nhiều âm tiết → 1 thuật ngữ. Áp dụng theo thứ tự dài → ngắn.
const PHRASE_MAP: Array<[string, string]> = [
  // API / FastAPI
  ["ay pi ai", "api"], ["ei pi ai", "api"], ["a pi ai", "api"], ["a pi ay", "api"],
  // KPI / OKR / ROI ...
  ["kay pi ai", "kpi"], ["ke pi ai", "kpi"], ["kei pi ai", "kpi"],
  ["o ki ar", "okr"], ["o kay a", "okr"], ["ar o ai", "roi"], ["a o ai", "roi"],
  ["xi ar em", "crm"], ["si a em", "crm"], ["e ar pi", "erp"],
  ["et i o", "seo"], ["et e o", "seo"],
  // B2B / B2C
  ["bi tu bi", "b2b"], ["be hai be", "b2b"], ["bi hai bi", "b2b"],
  ["bi tu si", "b2c"], ["be hai xi", "b2c"], ["bi tu xi", "b2c"],
  // SQL / PostgreSQL / Supabase
  ["et quy eo", "sql"], ["et cu eo", "sql"], ["et kiu eo", "sql"], ["es kiu eo", "sql"],
  ["pot go re", "postgres"], ["pot gre", "postgres"], ["pot gres", "postgres"],
  ["su pa bay", "supabase"], ["su pa bau", "supabase"], ["su pa bei", "supabase"], ["sup a bay", "supabase"],
  // JS / Python / Docker
  ["giay et", "js"], ["gi ay et", "js"], ["di et", "js"],
  ["java sit", "javascript"], ["gia va sit", "javascript"],
  ["pai than", "python"], ["pai thon", "python"],
  ["doc co", "docker"], ["doc ke", "docker"],
  // Tài chính / logistics
  ["i bit da", "ebitda"], ["e bit da", "ebitda"],
  ["cat pho lau", "cashflow"], ["cat lau", "cashflow"],
  ["lo gi tich", "logistics"],
];
const SORTED_PHRASES = [...PHRASE_MAP].sort((a, b) => b[0].length - a[0].length);

// Âm tiết đơn xấp xỉ âm nước ngoài (chỉ áp dụng khi là TOKEN độc lập).
const TOKEN_MAP = new Map<string, string>([
  ["ri", "re"],     // rì / ri
  ["ac", "act"],    // ác / ắc
  ["phat", "fast"], // phát
  ["nech", "next"], // nếch
  ["net", "next"],  // nét
]);

// Các từ viết tắt phổ biến xuyên ngành — luôn nằm trong từ vựng đích.
const ESSENTIAL_ACRONYMS = [
  "KPI", "OKR", "ROI", "CRM", "ERP", "SLA", "B2B", "B2C", "SQL", "API",
  "IFRS", "EBITDA", "FIFO", "OOP", "SOLID", "REST", "CI/CD", "SEO", "SEM",
  "SWOT", "MVP", "BANT", "SKU", "WMS", "KYC", "GMP",
];

// Từ đệm/hư từ tiếng Việt — không bao giờ làm biên của cửa sổ thay thế.
const EDGE_FILLERS = new Set([
  "có", "cho", "là", "thì", "mà", "của", "những", "các", "và", "với", "để",
  "trong", "khi", "như", "sẽ", "được", "rất", "cũng", "này", "ờ", "à", "ừm",
]);

// Âm tiết tiếng Việt viết không dấu thường gặp — không coi là từ tiếng Anh.
const VI_ASCII = new Set([
  "kinh", "tinh", "minh", "sinh", "trong", "thanh", "chinh", "nhanh", "chung",
  "khung", "trung", "cuong", "giang", "ngang", "quan", "quang", "luan", "luat",
  "tuan", "hanh", "nghi", "thuc", "lanh", "hoach", "khach", "khoan", "truong",
  "tuong", "thang", "chuan", "giai", "dong", "ngay", "nhieu", "phong", "cong",
  "song", "thong", "hang", "bang", "nang", "viec", "viet", "khong", "nguoi",
  "duoc", "cung", "vien", "truoc", "theo", "khac", "chuyen", "tieng",
]);

const EN_STOP = new Set([
  "about", "after", "again", "being", "could", "every", "first", "other",
  "should", "their", "there", "these", "those", "where", "which", "while",
  "would", "using", "with", "from", "that", "this", "have", "your", "what", "when", "will",
]);

// ─── Khung ngữ âm (phonetic skeleton) ────────────────────────────────────────

function applyPhraseMap(s: string): string {
  let out = ` ${s} `;
  for (let pass = 0; pass < 2; pass++) {
    for (const [k, v] of SORTED_PHRASES) {
      out = out.split(` ${k} `).join(` ${v} `);
    }
  }
  return out.trim();
}

/**
 * Quy mọi cụm tiếng Việt phiên âm / thuật ngữ tiếng Anh về cùng một "khung"
 * chữ thường để so khớp: bỏ dấu, ánh xạ âm tiết xấp xỉ, rút gọn âm
 * (ph→f, qu→kw, gi/d→j, c/k→k), bỏ khoảng trắng & dấu câu, gộp chữ lặp.
 */
export function toPhoneticSkeleton(input: string): string {
  let s = stripDiacritics(input).toLowerCase();
  s = s
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/\.net\b/g, " dotnet ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!s) return "";

  s = applyPhraseMap(s);
  s = s
    .split(" ")
    .map((t) => TOKEN_MAP.get(t) ?? t)
    .join("");

  return s
    .replace(/ph/g, "f")
    .replace(/qu/g, "kw")
    .replace(/gi/g, "j")
    .replace(/ck/g, "k")
    .replace(/c/g, "k")
    .replace(/d/g, "j")
    .replace(/([a-z])\1+/g, "$1");
}

// ─── Độ tương đồng chuỗi ─────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

function bigramCounts(s: string): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Sørensen–Dice trên bigram ký tự. */
function diceSimilarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const ma = bigramCounts(a);
  const mb = bigramCounts(b);
  let inter = 0;
  for (const [g, c] of ma) inter += Math.min(c, mb.get(g) ?? 0);
  return (2 * inter) / (a.length - 1 + b.length - 1);
}

function skeletonSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  return 0.5 * lev + 0.5 * diceSimilarity(a, b);
}

// ─── Trích từ vựng đích từ metadata câu hỏi ──────────────────────────────────

const TOKEN_SPLIT = /[\s,;:()[\]{}!?"“”‘’]+/;

function cleanToken(t: string): string {
  return t.replace(/^[^A-Za-z0-9]+/, "").replace(/[.\-:]+$/, "");
}

function isAsciiToken(t: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9.+#/&-]*$/.test(t);
}

function isAcronymToken(t: string): boolean {
  return /^[A-Z][A-Z0-9&/+]{1,7}$/.test(t) && (t.match(/[A-Z]/g)?.length ?? 0) >= 2;
}

function isTechnicalToken(t: string): boolean {
  if (isAcronymToken(t)) return true;
  if (/[A-Za-z]/.test(t) && /[0-9]/.test(t)) return true; // b2b, mp3, es6
  if (/[A-Za-z]/.test(t) && /[.+#/]/.test(t)) return true; // next.js, c++, ci/cd
  return /[a-z][A-Z]/.test(t); // camelCase: TypeScript, DevTools
}

function isEnglishWord(t: string): boolean {
  if (!/^[A-Za-z]{5,}$/.test(t)) return false;
  const l = t.toLowerCase();
  return !VI_ASCII.has(l) && !EN_STOP.has(l);
}

function splitSkillList(s: string): string[] {
  return s
    .split(/[,;|]|\s\/\s/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2 && x.length <= 40);
}

/**
 * Trích mọi thuật ngữ miền (domain) ứng viên có thể nhắc tới cho câu hỏi này:
 * skill_tag, jd_skills, từ viết tắt, token kỹ thuật/tiếng Anh và cụm danh từ
 * 1–3 từ trong expected[] / sample_answer / red_flags[] / question.
 */
export function extractDomainVocabulary(context?: QuestionContext): string[] {
  if (!context) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  if (context.skill_tag) splitSkillList(context.skill_tag).forEach(add);
  (context.jd_skills ?? []).forEach((s) => {
    if (typeof s === "string") splitSkillList(s).forEach(add);
  });

  const texts = [
    ...(context.expected ?? []),
    ...(context.red_flags ?? []),
    context.sample_answer ?? "",
    context.question ?? "",
  ];

  for (const text of texts) {
    if (!text) continue;
    const tokens = text.split(TOKEN_SPLIT).map(cleanToken).filter(Boolean);
    let run: string[] = [];
    const flush = () => {
      for (let len = 2; len <= 3; len++) {
        for (let i = 0; i + len <= run.length; i++) {
          const slice = run.slice(i, i + len);
          if (slice.some((t) => isTechnicalToken(t) || isEnglishWord(t))) add(slice.join(" "));
        }
      }
      run = [];
    };
    for (const tok of tokens) {
      if (isAsciiToken(tok)) {
        run.push(tok);
        if (isTechnicalToken(tok) || isEnglishWord(tok)) add(tok);
      } else {
        flush();
      }
    }
    flush();
  }

  return out.slice(0, 250);
}

// ─── Cửa sổ trượt n-gram ─────────────────────────────────────────────────────

interface VocabEntry {
  canonical: string;
  skeleton: string;
  isAcronym: boolean;
}

const SIM_THRESHOLD = 0.78;

function buildVocabEntries(context?: QuestionContext): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const seenSkeleton = new Set<string>();
  const push = (canonical: string) => {
    const skeleton = toPhoneticSkeleton(canonical);
    if (skeleton.length < 2 || seenSkeleton.has(skeleton)) return;
    seenSkeleton.add(skeleton);
    entries.push({ canonical, skeleton, isAcronym: isAcronymToken(canonical) });
  };
  // Từ vựng của câu hỏi hiện tại được ưu tiên trước từ viết tắt chung.
  extractDomainVocabulary(context).forEach(push);
  ESSENTIAL_ACRONYMS.forEach(push);
  return entries;
}

function scoreMatch(windowSkeleton: string, e: VocabEntry, n: number): number {
  if (windowSkeleton === e.skeleton) {
    // Khung ngắn (<3 ký tự) chỉ tin khi người nói đọc nhiều âm tiết.
    return e.skeleton.length >= 3 || n >= 2 ? 1 : 0;
  }
  if (e.isAcronym) return 0; // viết tắt: chỉ chấp nhận khớp tuyệt đối
  if (windowSkeleton.length < 4 || e.skeleton.length < 4) return 0;
  const ratio =
    Math.min(windowSkeleton.length, e.skeleton.length) /
    Math.max(windowSkeleton.length, e.skeleton.length);
  if (ratio < 0.6) return 0;
  return skeletonSimilarity(windowSkeleton, e.skeleton);
}

/**
 * Thay các cụm bị phiên âm bằng thuật ngữ chuẩn của câu hỏi hiện tại.
 * Cửa sổ n = 4,3,2,1 từ; chọn khớp có điểm cao nhất (hòa → cụm dài hơn).
 */
export function normalizeTranscriptWithContext(
  rawText: string,
  context?: QuestionContext
): string {
  if (!rawText || !rawText.trim()) return rawText;
  const words = rawText.trim().split(/\s+/);
  const entries = buildVocabEntries(context);
  if (entries.length === 0) return rawText;

  const out: string[] = [];
  let i = 0;
  while (i < words.length) {
    let best: { entry: VocabEntry; sim: number; n: number } | null = null;

    for (let n = Math.min(4, words.length - i); n >= 1; n--) {
      const win = words.slice(i, i + n);
      if (EDGE_FILLERS.has(win[0].toLowerCase()) || EDGE_FILLERS.has(win[n - 1].toLowerCase())) continue;
      const skeleton = toPhoneticSkeleton(win.join(" "));
      if (skeleton.length < 2) continue;
      for (const entry of entries) {
        const sim = scoreMatch(skeleton, entry, n);
        if (sim >= SIM_THRESHOLD && (!best || sim > best.sim + 1e-9)) {
          best = { entry, sim, n };
        }
      }
    }

    if (best) {
      out.push(best.entry.canonical);
      i += best.n;
    } else {
      out.push(words[i]);
      i += 1;
    }
  }
  return out.join(" ");
}
