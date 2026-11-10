export type MatchMode = "llm" | "rule";

export type JobProfile = {
  title: string;
  company: string;
  mustSkills: string[];
  niceSkills: string[];
  keywords: string[];
  responsibilities: string[];
  minYears: number | null;
  education: string;
  location: string;
};

export type ResumeProject = {
  name: string;
  evidence: string;
};

export type ResumeProfile = {
  name: string;
  skills: string[];
  projects: ResumeProject[];
  education: string;
  years: number | null;
  highlights: string[];
};

export type Dimension = {
  key: string;
  label: string;
  score: number;
  detail: string;
};

export type Evidence = {
  skill: string;
  snippet: string;
};

export type MatchResult = {
  score: number;
  dimensions: Dimension[];
  matchedMust: string[];
  missingMust: string[];
  matchedNice: string[];
  missingNice: string[];
  evidence: Evidence[];
  gaps: string[];
  risks: string[];
};

export type GeneratedQuestion = {
  question: string;
  why: string;
  hint: string;
};

export type PlanItem = {
  day: string;
  task: string;
  output: string;
};

export type Generated = {
  bullets: string[];
  questions: GeneratedQuestion[];
  plan: PlanItem[];
};

export type AnalysisRecord = {
  id: number;
  createdAt: string;
  mode: MatchMode;
  note?: string;
  jobTitle: string;
  score: number;
  result: MatchResult;
  generated: Generated;
  jdText: string;
  resumeText: string;
};

export type AnalyzeResponse = {
  id: number;
  mode: MatchMode;
  note?: string;
  job: JobProfile;
  resume: ResumeProfile;
  result: MatchResult;
  generated: Generated;
};
