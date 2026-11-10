import { connection } from "next/server";
import { buildAdvice } from "@/lib/advice";
import { saveAnalysis } from "@/lib/db";
import {
  extractJobWithRules,
  extractResumeWithRules,
  mergeWithRules,
} from "@/lib/extract";
import { LlmUnavailableError, extractProfilesWithLlm } from "@/lib/llm";
import { runMatch } from "@/lib/match";
import type { AnalyzeResponse, MatchMode } from "@/lib/types";

const JD_LIMIT = 6000;
const RESUME_LIMIT = 8000;

function readField(payload: unknown, key: string): string {
  if (payload !== null && typeof payload === "object" && key in payload) {
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === "string" ? value.trim() : "";
  }
  return "";
}

function wantsRuleMode(payload: unknown): boolean {
  if (process.env.USE_RULE_EXTRACTOR === "1") return true;
  return (
    payload !== null &&
    typeof payload === "object" &&
    (payload as { mock?: unknown }).mock === true
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "请求体不是合法 JSON" }, { status: 400 });
  }

  const jdText = readField(payload, "jd");
  const resumeText = readField(payload, "resume");

  if (jdText.length < 20) {
    return Response.json(
      { error: "JD 太短，至少粘贴 20 个字的岗位描述" },
      { status: 400 },
    );
  }
  if (resumeText.length < 20) {
    return Response.json(
      { error: "简历太短，至少粘贴 20 个字的简历内容" },
      { status: 400 },
    );
  }
  if (jdText.length > JD_LIMIT) {
    return Response.json(
      { error: `JD 最多 ${JD_LIMIT} 字，请删掉公司介绍后再提交` },
      { status: 400 },
    );
  }
  if (resumeText.length > RESUME_LIMIT) {
    return Response.json(
      { error: `简历最多 ${RESUME_LIMIT} 字，请删掉无关内容后再提交` },
      { status: 400 },
    );
  }

  const ruleJob = extractJobWithRules(jdText);
  const ruleResume = extractResumeWithRules(resumeText);

  let job = ruleJob;
  let resume = ruleResume;
  let mode: MatchMode = "rule";
  let note: string | undefined;

  if (wantsRuleMode(payload)) {
    note = "当前为规则提取模式（接口 mock=true），匹配与建议仍由确定性代码生成。";
  } else {
    try {
      const llm = await extractProfilesWithLlm(jdText, resumeText);
      const merged = mergeWithRules(
        ruleJob,
        ruleResume,
        llm.job,
        llm.resume,
        jdText,
        resumeText,
      );
      job = merged.job;
      resume = merged.resume;
      mode = "llm";
      note = "大模型只负责提取字段；技能会回查原文，匹配分和建议由代码计算。";
    } catch (error) {
      if (error instanceof LlmUnavailableError && error.code === "NO_KEY") {
        note =
          "未配置 LLM_API_KEY，本次使用规则提取；配置后会自动切换为大模型提取。";
      } else {
        note = `大模型调用失败，已回退到规则提取：${
          error instanceof Error ? error.message : "未知错误"
        }`;
      }
    }
  }

  const result = runMatch(job, resume, resumeText);
  const generated = buildAdvice(job, resume, result);

  const id = await saveAnalysis({
    mode,
    note,
    jobTitle: job.title,
    score: result.score,
    result,
    generated,
    jdText,
    resumeText,
  });

  const body: AnalyzeResponse = {
    id,
    mode,
    note,
    job,
    resume,
    result,
    generated,
  };
  return Response.json(body);
}

export async function GET() {
  // 允许用 GET 直接看到接口说明，避免误访问时 405 让人困惑
  await connection();
  return Response.json({
    endpoint: "POST /api/analyze",
    body: { jd: "岗位描述", resume: "简历文本", mock: "可选，true 强制规则提取" },
    limits: { jd: JD_LIMIT, resume: RESUME_LIMIT },
  });
}
