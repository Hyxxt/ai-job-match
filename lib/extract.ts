import {
  inferEducation,
  inferLocation,
  inferYears,
  matchSkills,
} from "./skills";
import type { JobProfile, ResumeProfile, ResumeProject } from "./types";

type SectionKind = "must" | "nice" | "duty" | "other";
type ResumeSection = "project" | "skill" | "education" | "highlight" | "other";
type Header<K extends string> = { kind: K; rest: string };

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripBullet(value: string): string {
  return value
    .replace(/^[\s\-—•·*]+/, "")
    .replace(/^\d+\s*[.、．)）]\s*/, "")
    .trim();
}

/**
 * 解析“标题行”，同时把“任职要求：熟悉 React”这种行内内容拆出来，
 * 避免只认标题、把同一行的要求丢掉。
 */
function readHeader<K extends string>(
  line: string,
  classify: (label: string) => K | null,
): Header<K> | null {
  let value = line
    .replace(/^[\s#*【\[]+/, "")
    .replace(/[】\]]+$/, "")
    .trim();
  value = value.replace(/^\d+\s*[.、．)）]\s*/, "").trim();
  if (!value) return null;

  const separator = value.search(/[：:]/);
  const rawLabel = separator >= 0 ? value.slice(0, separator).trim() : value;
  const rest = separator >= 0 ? value.slice(separator + 1).trim() : "";
  const label = rawLabel.replace(/^[\s\-—•·*]+/, "").trim();
  if (!label || label.length > 14) return null;

  const kind = classify(label);
  if (!kind) return null;

  // 没有冒号时，整行必须很短，才可能是标题。
  if (separator < 0 && value.length > 20) return null;

  return { kind, rest };
}

function classifyJobHeader(label: string): SectionKind | null {
  const value = label.replace(/\s+/g, "");
  if (/^(加分项|加分|优先条件|优先)/.test(value)) return "nice";
  if (/^(岗位职责|工作职责|职责描述|工作内容|你将负责|你将做什么|你会做什么)/.test(value)) {
    return "duty";
  }
  if (/^(任职要求|岗位要求|任职资格|任职条件|技能要求|职位要求|我们希望你|要求)/.test(value)) {
    return "must";
  }
  if (/^(公司介绍|关于我们|福利|薪资|工作时间|工作地点|职位|招聘岗位|岗位)/.test(value)) {
    return "other";
  }
  return null;
}

function classifyResumeHeader(label: string): ResumeSection | null {
  const value = label.replace(/\s+/g, "");
  if (/^(项目经历|项目经验|作品项目|项目介绍)/.test(value)) return "project";
  if (/^(技能|技术栈|专业技能)/.test(value)) return "skill";
  if (/^(教育经历|教育背景|学历)/.test(value)) return "education";
  if (/^(个人优势|自我评价|亮点|荣誉)/.test(value)) return "highlight";
  return null;
}

function pickLine(text: string, pattern: RegExp): string {
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim().slice(0, 60);
  }
  return "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function extractJobWithRules(text: string): JobProfile {
  const lines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  let current: SectionKind = "other";
  const must: string[] = [];
  const nice: string[] = [];
  const duty: string[] = [];

  for (const line of lines) {
    const header = readHeader(line, classifyJobHeader);
    if (header) {
      current = header.kind;
      if (header.rest) {
        const target =
          header.kind === "must"
            ? must
            : header.kind === "nice"
              ? nice
              : header.kind === "duty"
                ? duty
                : null;
        target?.push(header.rest);
      }
      continue;
    }

    if (current === "must") must.push(line);
    else if (current === "nice") nice.push(line);
    else if (current === "duty") duty.push(line);
  }

  const mustText = must.length
    ? must.join("\n")
    : lines.filter((line) => !nice.includes(line)).join("\n");
  const niceText = nice.join("\n");

  const niceSkills = matchSkills(niceText);
  let mustSkills = matchSkills(mustText).filter(
    (skill) => !niceSkills.includes(skill),
  );
  if (!mustSkills.length) {
    mustSkills = matchSkills(text).filter((skill) => !niceSkills.includes(skill));
  }

  const responsibilities = unique(
    duty
      .map((line) => stripBullet(line).replace(/[；;。]\s*$/, ""))
      .filter((line) => line.length >= 6)
      .slice(0, 6),
  );

  const title =
    pickLine(text, /^(?:职位|岗位|招聘职位)[:：]\s*(.+)$/) ||
    lines
      .find((line) =>
        /工程师|开发|实习生|架构师|程序员|设计师|产品经理/.test(line),
      )
      ?.slice(0, 50) ||
    lines[0]?.slice(0, 40) ||
    "未识别岗位";

  const company =
    pickLine(text, /^(?:公司|企业|公司名称)[:：]\s*(.+)$/) ||
    text.match(
      /([一-龥A-Za-z0-9（）()·]{2,40}(?:有限公司|股份有限公司|科技|集团|工作室))/,
    )?.[1] ||
    "";

  const location =
    pickLine(text, /^(?:工作地点|地点|base|Base)[:：]\s*(.+)$/) ||
    inferLocation(text);

  return {
    title,
    company,
    mustSkills: unique(mustSkills).slice(0, 14),
    niceSkills: unique(niceSkills)
      .filter((skill) => !mustSkills.includes(skill))
      .slice(0, 10),
    keywords: unique(matchSkills(text)).slice(0, 14),
    responsibilities,
    minYears: inferYears(mustText || text),
    education: inferEducation(mustText || text),
    location,
  };
}

function isBullet(line: string): boolean {
  return /^[\s\-—•·*]/.test(line) || /^\d+\s*[.、．)）]/.test(line);
}

function parseProjectTitle(line: string): { name: string; evidence: string } {
  const withoutBullet = stripBullet(line);
  const [head, ...rest] = withoutBullet.split(/[：:]/);
  const name = head.split("｜")[0].split("|")[0].trim().slice(0, 60);
  const extra = rest.join("：").trim();
  return { name, evidence: extra };
}

export function extractResumeWithRules(text: string): ResumeProfile {
  const lines = text.split(/\r?\n/).map(cleanLine);

  let current: ResumeSection = "other";
  const projects: ResumeProject[] = [];
  let projectBullets: string[] = [];
  const highlights: string[] = [];

  function flushProjectBullets() {
    if (projects.length && projectBullets.length) {
      const last = projects[projects.length - 1];
      last.evidence = unique([last.evidence, ...projectBullets])
        .join("；")
        .slice(0, 300);
      projectBullets = [];
    }
  }

  for (const line of lines) {
    if (!line) continue;
    const header = readHeader(line, classifyResumeHeader);
    if (header) {
      flushProjectBullets();
      current = header.kind;
      if (header.kind === "project" && header.rest) {
        const parsed = parseProjectTitle(header.rest);
        if (parsed.name.length >= 2) projects.push(parsed);
      } else if (header.kind === "highlight" && header.rest) {
        highlights.push(header.rest.slice(0, 160));
      }
      continue;
    }

    if (current === "project") {
      if (isBullet(line)) {
        projectBullets.push(stripBullet(line));
      } else {
        flushProjectBullets();
        if (projects.length < 5) {
          const parsed = parseProjectTitle(line);
          if (parsed.name.length >= 2) projects.push(parsed);
        }
      }
    } else if (current === "highlight" && isBullet(line)) {
      const item = stripBullet(line);
      if (item.length >= 6) highlights.push(item.slice(0, 160));
    }
  }
  flushProjectBullets();

  const name =
    pickLine(text, /^姓名[:：]\s*([^\n|｜]{2,20})$/) ||
    (lines[0] && lines[0].length <= 16 && !/[@：:]/.test(lines[0])
      ? lines[0]
      : "");

  return {
    name,
    skills: matchSkills(text).slice(0, 30),
    projects: projects.slice(0, 4),
    education: inferEducation(text),
    years: inferYears(text),
    highlights: unique(highlights).slice(0, 6),
  };
}

export function canonicalizeSkill(raw: string): string | null {
  const trimmed = raw.trim().replace(/^[\s\-—•·*]+/, "");
  if (!trimmed || trimmed.length > 30) return null;

  const hits = matchSkills(trimmed);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return null;

  // 词典外的技能保留原写法，但后面必须能在原文里找到，否则丢弃。
  return trimmed;
}

export function sanitizeSkills(list: string[], sourceText: string): string[] {
  const out: string[] = [];
  for (const raw of list) {
    const skill = canonicalizeSkill(raw);
    if (!skill || out.includes(skill)) continue;

    if (matchSkills(skill).includes(skill)) {
      if (!matchSkills(sourceText).includes(skill)) continue;
    } else if (!sourceText.toLowerCase().includes(skill.toLowerCase())) {
      continue;
    }
    out.push(skill);
  }
  return out.slice(0, 20);
}

function looksLikeText(value: string, sourceText: string): boolean {
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length < 2) return false;
  return sourceText.replace(/\s+/g, "").includes(normalized);
}

export function mergeWithRules(
  ruleJob: JobProfile,
  ruleResume: ResumeProfile,
  llmJob: JobProfile | null,
  llmResume: ResumeProfile | null,
  jdText: string,
  resumeText: string,
): { job: JobProfile; resume: ResumeProfile } {
  if (!llmJob || !llmResume) {
    return { job: ruleJob, resume: ruleResume };
  }

  const llmMust = sanitizeSkills(llmJob.mustSkills, jdText);
  const mustSkills = unique([
    ...ruleJob.mustSkills,
    ...llmMust.filter((skill) => !ruleJob.niceSkills.includes(skill)),
  ]).slice(0, 14);

  const niceSkills = unique([
    ...ruleJob.niceSkills,
    ...sanitizeSkills(llmJob.niceSkills, jdText),
  ])
    .filter((skill) => !mustSkills.includes(skill))
    .slice(0, 10);

  const job: JobProfile = {
    title:
      (llmJob.title && looksLikeText(llmJob.title, jdText)
        ? llmJob.title
        : ruleJob.title) || "未识别岗位",
    company:
      llmJob.company && looksLikeText(llmJob.company, jdText)
        ? llmJob.company
        : ruleJob.company,
    mustSkills,
    niceSkills,
    keywords: unique([
      ...ruleJob.keywords,
      ...sanitizeSkills(llmJob.keywords, jdText),
    ]).slice(0, 14),
    responsibilities: ruleJob.responsibilities.length
      ? ruleJob.responsibilities
      : unique(
          llmJob.responsibilities.filter((item) => looksLikeText(item, jdText)),
        ).slice(0, 6),
    // 年限、学历、地点只信规则：数字不能被模型“推断”出来。
    minYears: ruleJob.minYears,
    education: ruleJob.education,
    location: ruleJob.location,
  };

  const projects: ResumeProject[] = [...ruleResume.projects];
  for (const project of llmResume.projects) {
    if (projects.length >= 4) break;
    const name = project.name.trim().slice(0, 60);
    if (!name || !resumeText.includes(name)) continue;
    if (
      projects.some(
        (existing) =>
          existing.name.includes(name) || name.includes(existing.name),
      )
    ) {
      continue;
    }
    const evidence = project.evidence.trim().slice(0, 300);
    projects.push({
      name,
      evidence:
        evidence && looksLikeText(evidence.slice(0, 40), resumeText)
          ? evidence
          : "",
    });
  }

  const resume: ResumeProfile = {
    name:
      ruleResume.name ||
      (llmResume.name && looksLikeText(llmResume.name, resumeText)
        ? llmResume.name.slice(0, 30)
        : ""),
    skills: unique([
      ...ruleResume.skills,
      ...sanitizeSkills(llmResume.skills, resumeText),
    ]).slice(0, 30),
    projects,
    education: ruleResume.education,
    years: ruleResume.years,
    highlights: unique([
      ...ruleResume.highlights,
      ...llmResume.highlights.filter((item) =>
        looksLikeText(item.slice(0, 40), resumeText),
      ),
    ]).slice(0, 6),
  };

  return { job, resume };
}
