import { BarChart3, ClipboardCheck, Crown, ListChecks, Route, ScanSearch, ShieldCheck, type LucideIcon } from "lucide-react";
import { hasOutput, stepDone, stepUnlocked, type AgentKey, type Project, type StepKey } from "./data";

export interface Persona {
  name: string;
  role: string;
  color: string;
  from: string;
  to: string;
  icon: LucideIcon;
}

export interface AgentProfile extends Persona {
  key: AgentKey;
  step: StepKey;
  roleEn: string;
  bio: string;
  skills: string[];
  startLine: string;
  working: string[];
}

export const ADMIN: Persona = {
  name: "شما",
  role: "ادمین · تصمیم‌گیرنده نهایی",
  color: "#f59e0b",
  from: "#92400e",
  to: "#fbbf24",
  icon: Crown,
};

export const AGENTS: AgentProfile[] = [
  {
    key: "scout",
    step: "source",
    name: "کاوه",
    role: "تحلیلگر کد و محصول",
    roleEn: "Code & Product Analyst",
    color: "#22d3ee",
    from: "#0e7490",
    to: "#67e8f9",
    icon: ScanSearch,
    bio: "سورس‌کد و مستندات را می‌خواند و تصویر کاملی از محصول، فناوری‌ها و ماژول‌هایش می‌سازد.",
    skills: ["خواندن مخزن گیت", "تحلیل ساختار کد", "شناسایی فناوری‌ها", "خلاصه‌سازی محصول"],
    startLine: "شروع کردم به خواندن منبع محصول.",
    working: [
      "در حال اتصال به مخزن…",
      "در حال خواندن ساختار فایل‌ها…",
      "در حال بررسی README و مستندات…",
      "در حال تقسیم سند به ماژول‌ها…",
      "در حال خلاصه‌نویسی تک‌تک ماژول‌ها…",
      "در حال شناسایی فناوری‌ها و ماژول‌ها…",
      "در حال نوشتن خلاصه محصول…",
    ],
  },
  {
    key: "feature",
    step: "features",
    name: "نیلوفر",
    role: "تحلیلگر ویژگی‌ها",
    roleEn: "Feature Analyst",
    color: "#a78bfa",
    from: "#5b21b6",
    to: "#c4b5fd",
    icon: ListChecks,
    bio: "ویژگی‌هایی را که محصول واقعاً دارد پیدا می‌کند و مشخص می‌کند کدام برای تحویل ضروری و کدام اختیاری است.",
    skills: ["کشف ویژگی‌ها", "اولویت‌بندی", "تفکیک ضروری و اختیاری"],
    startLine: "گزارش کاوه را گرفتم؛ دنبال ویژگی‌های محصول می‌گردم.",
    working: [
      "در حال مرور تحلیل کاوه…",
      "در حال پیدا کردن قابلیت‌های کاربر…",
      "در حال تفکیک ویژگی‌های ضروری و اختیاری…",
      "در حال نوشتن توضیح هر ویژگی…",
    ],
  },
  {
    key: "journey",
    step: "journeys",
    name: "آرش",
    role: "طراح سفر کاربر",
    roleEn: "User Journey Designer",
    color: "#f472b6",
    from: "#9d174d",
    to: "#f9a8d4",
    icon: Route,
    bio: "برای هر ویژگی، مسیرهایی را که کاربر واقعی طی می‌کند قدم‌به‌قدم طراحی می‌کند.",
    skills: ["طراحی سفر کاربر", "سناریونویسی", "پوشش مسیرهای خطا"],
    startLine: "ویژگی‌های تأییدشده رسید؛ سفرهای کاربر را طراحی می‌کنم.",
    working: [
      "در حال بررسی ویژگی‌های تأییدشده…",
      "در حال طراحی مسیر اصلی کاربر…",
      "در حال افزودن مسیرهای خطا…",
      "در حال مرتب کردن قدم‌ها…",
    ],
  },
  {
    key: "criteria",
    step: "criteria",
    name: "سارا",
    role: "مهندس معیارهای پذیرش",
    roleEn: "Acceptance Criteria Engineer",
    color: "#fbbf24",
    from: "#92400e",
    to: "#fde68a",
    icon: ClipboardCheck,
    bio: "از ویژگی‌ها و سفرهای کاربر، معیارهای پذیرش دقیق و قابل‌آزمون می‌نویسد.",
    skills: ["نوشتن معیارهای پذیرش", "قالب Given / When / Then", "تعیین اولویت"],
    startLine: "سفرهای کاربر را گرفتم؛ معیارهای پذیرش را می‌نویسم.",
    working: [
      "در حال خواندن سفرهای کاربر…",
      "در حال نوشتن معیارهای قابل‌آزمون…",
      "در حال تعیین معیارهای ضروری و اختیاری…",
    ],
  },
  {
    key: "qa",
    step: "approval",
    name: "بهراد",
    role: "بازبین تضمین کیفیت",
    roleEn: "QA Reviewer",
    color: "#34d399",
    from: "#065f46",
    to: "#6ee7b7",
    icon: ShieldCheck,
    bio: "هر معیار را با سورس‌کد مقایسه می‌کند و نظر اولیه می‌دهد تا تأیید نهایی شما سریع‌تر شود.",
    skills: ["بازبینی کد", "ارزیابی معیارها", "شناسایی ریسک"],
    startLine: "معیارها رسید؛ هر کدام را با کد مقایسه می‌کنم.",
    working: [
      "در حال مقایسه معیارها با سورس‌کد…",
      "در حال جست‌وجوی شواهد در فایل‌ها…",
      "در حال آماده کردن نظر اولیه…",
    ],
  },
  {
    key: "reporter",
    step: "report",
    name: "مهسا",
    role: "گزارشگر تحویل",
    roleEn: "Delivery Reporter",
    color: "#60a5fa",
    from: "#1e40af",
    to: "#93c5fd",
    icon: BarChart3,
    bio: "همه کارهای تیم را جمع‌بندی می‌کند و گزارش آمادگی تحویل را با آمار و توصیه نهایی می‌نویسد.",
    skills: ["تحلیل آماری", "گزارش‌نویسی", "توصیه تحویل"],
    startLine: "نتایج بررسی رسید؛ گزارش نهایی را آماده می‌کنم.",
    working: ["در حال شمردن نتایج…", "در حال محاسبه درصدها…", "در حال نوشتن جمع‌بندی و توصیه…"],
  },
];

export const AGENT_BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a])) as Record<AgentKey, AgentProfile>;
export const AGENT_BY_STEP = Object.fromEntries(AGENTS.map((a) => [a.step, a])) as Record<StepKey, AgentProfile>;

export type AgentStatus = "working" | "waiting" | "done" | "ready" | "locked";

export const STATUS_LABEL: Record<AgentStatus, string> = {
  working: "در حال کار",
  waiting: "منتظر تأیید شما",
  done: "تمام شد",
  ready: "آماده",
  locked: "در صف",
};

export function agentStatus(p: Project, agent: AgentProfile, running: AgentKey | null): AgentStatus {
  if (running === agent.key) return "working";
  if (stepDone(p, agent.step)) return "done";
  if (!stepUnlocked(p, agent.step)) return "locked";
  if (hasOutput(p, agent.step)) return "waiting";
  return "ready";
}
