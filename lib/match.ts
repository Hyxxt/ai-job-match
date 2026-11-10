import { findEvidence } from "./skills";
import type {
  Dimension,
  Evidence,
  JobProfile,
  MatchResult,
  ResumeProfile,
} from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(matched: number, total: number): number {
  if (total <= 0) return 0;
  return clampScore((matched / total) * 100);
}

const EDUCATION_RANK: Record<string, number> = {
  大专: 1,
  本科: 2,
  硕士: 3,
  博士: 4,
};

function educationScore(job: JobProfile, resume: ResumeProfile): Dimension {
  if (!job.education) {
    return {
      key: "education",
      label: "学历",
      score: 100,
      detail: "JD 没有写明确学历门槛",
    };
  }
  if (!resume.education) {
    return {
      key: "education",
      label: "学历",
      score: 45,
      detail: `JD 要求${job.education}，简历里没有识别到学历`,
    };
  }

  const need = EDUCATION_RANK[job.education] ?? 0;
  const have = EDUCATION_RANK[resume.education] ?? 0;
  if (!need) {
    return {
      key: "education",
      label: "学历",
      score: 100,
      detail: `JD 要求${job.education}，按不限处理`,
    };
  }
  if (have >= need) {
    return {
      key: "education",
      label: "学历",
      score: 100,
      detail: `JD 要求${job.education}，简历为${resume.education}`,
    };
  }

  return {
    key: "education",
    label: "学历",
    score: have ? 45 : 20,
    detail: `JD 要求${job.education}，简历为${resume.education || "未写明"}`,
  };
}

function yearsScore(job: JobProfile, resume: ResumeProfile): Dimension {
  if (job.minYears === null) {
    return {
      key: "years",
      label: "经验年限",
      score: 100,
      detail: "JD 没有写明确年限门槛",
    };
  }
  if (resume.years === null) {
    return {
      key: "years",
      label: "经验年限",
      score: 25,
      detail: `JD 要求约 ${job.minYears} 年，简历没有写可核对的年限`,
    };
  }
  if (resume.years >= job.minYears) {
    return {
      key: "years",
      label: "经验年限",
      score: 100,
      detail: `JD 要求约 ${job.minYears} 年，简历为 ${resume.years} 年`,
    };
  }
  return {
    key: "years",
    label: "经验年限",
    score: Math.max(
      10,
      clampScore((resume.years / Math.max(job.minYears, 1)) * 80),
    ),
    detail: `JD 要求约 ${job.minYears} 年，简历为 ${resume.years} 年`,
  };
}

function findCustomEvidence(text: string, skill: string): string | null {
  const lower = text.toLowerCase();
  const at = lower.indexOf(skill.toLowerCase());
  if (at === -1) return null;

  const lineStart = Math.max(
    text.lastIndexOf("\n", at) + 1,
    text.lastIndexOf("。", at) + 1,
    text.lastIndexOf("；", at) + 1,
  );
  const ends = [
    text.indexOf("\n", at),
    text.indexOf("。", at),
    text.indexOf("；", at),
  ].filter((index) => index !== -1);
  const lineEnd = ends.length ? Math.min(...ends) : text.length;
  const raw = text.slice(lineStart, lineEnd + 1).trim();
  if (!raw) return null;
  return raw.length <= 160 ? raw : `${raw.slice(0, 150)}…`;
}

function evidenceFor(resumeText: string, skill: string): string | null {
  return findEvidence(resumeText, skill) ?? findCustomEvidence(resumeText, skill);
}

function buildEvidence(
  resumeText: string,
  skills: string[],
  limit = 8,
): Evidence[] {
  const out: Evidence[] = [];
  for (const skill of skills) {
    if (out.length >= limit) break;
    const snippet = evidenceFor(resumeText, skill);
    if (snippet) out.push({ skill, snippet });
  }
  return out;
}

export function runMatch(
  job: JobProfile,
  resume: ResumeProfile,
  resumeText: string,
): MatchResult {
  const matchedMust = job.mustSkills.filter((skill) =>
    resume.skills.includes(skill),
  );
  const missingMust = job.mustSkills.filter(
    (skill) => !resume.skills.includes(skill),
  );
  const matchedNice = job.niceSkills.filter((skill) =>
    resume.skills.includes(skill),
  );
  const missingNice = job.niceSkills.filter(
    (skill) => !resume.skills.includes(skill),
  );

  const required = job.mustSkills.length
    ? job.mustSkills
    : job.keywords.slice(0, 8);
  const matchedRequired = required.filter((skill) =>
    resume.skills.includes(skill),
  );
  const mustScore: Dimension = {
    key: "must",
    label: "硬性技能",
    score: required.length ? ratioScore(matchedRequired.length, required.length) : 60,
    detail: job.mustSkills.length
      ? `${matchedMust.length}/${job.mustSkills.length} 个要求技能能在简历中找到`
      : "JD 没有明确技能要求，按关键词覆盖估算",
  };

  const niceScore: Dimension = {
    key: "nice",
    label: "加分技能",
    score: job.niceSkills.length
      ? ratioScore(matchedNice.length, job.niceSkills.length)
      : 70,
    detail: job.niceSkills.length
      ? `${matchedNice.length}/${job.niceSkills.length} 个加分项有证据`
      : "JD 没有写明确加分项",
  };

  const mustEvidence = buildEvidence(resumeText, matchedMust, 99);
  const evidence = buildEvidence(resumeText, [...matchedMust, ...matchedNice]);
  const evidenceScore: Dimension = {
    key: "evidence",
    label: "证据强度",
    score: matchedMust.length
      ? clampScore((mustEvidence.length / matchedMust.length) * 100)
      : 0,
    detail: matchedMust.length
      ? `${mustEvidence.length}/${matchedMust.length} 个命中技能能在简历原文里找到句子`
      : "没有命中硬性技能，无法提取证据",
  };

  const projectCount = resume.projects.length;
  const projectScore: Dimension = {
    key: "projects",
    label: "项目数量",
    score: clampScore(
      Math.min(
        100,
        projectCount * 30 +
          (resume.projects.some((project) => project.evidence.length >= 30)
            ? 10
            : 0),
      ),
    ),
    detail: projectCount
      ? `简历提取到 ${projectCount} 个项目`
      : "没有从简历里提取到项目经历",
  };

  const years = yearsScore(job, resume);
  const education = educationScore(job, resume);
  const dimensions = [
    mustScore,
    niceScore,
    years,
    education,
    evidenceScore,
    projectScore,
  ];

  const score = clampScore(
    mustScore.score * 0.4 +
      niceScore.score * 0.15 +
      years.score * 0.15 +
      education.score * 0.1 +
      evidenceScore.score * 0.1 +
      projectScore.score * 0.1,
  );

  const gaps: string[] = [];
  for (const skill of missingMust) {
    gaps.push(`硬性要求「${skill}」：简历里没有出现，也没有对应项目证据。`);
  }
  if (job.minYears !== null && (resume.years === null || resume.years < job.minYears)) {
    gaps.push(
      `经验年限：JD 要求约 ${job.minYears} 年，简历可核对的年限为 ${
        resume.years === null ? "未写明" : `${resume.years} 年`
      }。`,
    );
  }
  if (
    job.education &&
    resume.education &&
    (EDUCATION_RANK[resume.education] ?? 0) < (EDUCATION_RANK[job.education] ?? 0)
  ) {
    gaps.push(`学历：JD 写「${job.education}」，简历是「${resume.education}」。`);
  }
  for (const skill of missingNice.slice(0, 3)) {
    gaps.push(`加分项「${skill}」没有体现，可以用一个小项目补，不要直接写进简历。`);
  }
  if (!gaps.length) {
    gaps.push("没有发现硬性缺口；下一步是把最匹配的项目和证据放到简历第一屏。");
  }

  const risks: string[] = [];
  if (missingMust.length >= 2) {
    risks.push("硬性技能缺口 ≥2：不建议把匹配分或“精通”写进简历。");
  }
  if (job.minYears !== null && (resume.years === null || resume.years < job.minYears)) {
    risks.push(
      "经验年限不满足：投递时用项目、在线 demo 和可到岗时间补位，不能编造工作经历。",
    );
  }
  if (
    job.education &&
    resume.education &&
    (EDUCATION_RANK[resume.education] ?? 0) < (EDUCATION_RANK[job.education] ?? 0)
  ) {
    risks.push("学历可能被筛：先确认 JD 是否接受在读或大专，再决定是否投递。");
  }
  if (resumeText.trim().length < 200) {
    risks.push("简历文本太短，提取到的信息有限，匹配分参考价值不高。");
  }
  if (!mustEvidence.length) {
    risks.push("简历里找不到技能对应的原句，面试官无法验证，建议把项目细节写具体。");
  }
  if (score >= 75) {
    risks.push("文本匹配度较高：面试重点准备项目取舍和失败复盘，不要背技能词。");
  }

  return {
    score,
    dimensions,
    matchedMust,
    missingMust,
    matchedNice,
    missingNice,
    evidence,
    gaps,
    risks,
  };
}
