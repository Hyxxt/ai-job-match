"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SAMPLE_JDS, SAMPLE_RESUME } from "@/lib/samples";
import type {
  AnalysisRecord,
  AnalyzeResponse,
  Generated,
  MatchMode,
  MatchResult,
} from "@/lib/types";

type DisplayResult = {
  id: number;
  mode: MatchMode;
  note?: string;
  jobTitle: string;
  score: number;
  result: MatchResult;
  generated: Generated;
};

const TABS = [
  { key: "bullets", label: "简历改写" },
  { key: "questions", label: "面试追问" },
  { key: "plan", label: "7 天计划" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function toDisplay(data: AnalyzeResponse): DisplayResult {
  return {
    id: data.id,
    mode: data.mode,
    note: data.note,
    jobTitle: data.job.title,
    score: data.result.score,
    result: data.result,
    generated: data.generated,
  };
}

function fromRecord(record: AnalysisRecord): DisplayResult {
  return {
    id: record.id,
    mode: record.mode,
    note: record.note,
    jobTitle: record.jobTitle,
    score: record.score,
    result: record.result,
    generated: record.generated,
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function scoreTone(score: number) {
  if (score >= 75) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      stroke: "#047857",
      bar: "bg-emerald-600",
      label: "匹配较高，可以优先投",
    };
  }
  if (score >= 60) {
    return {
      text: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      stroke: "#b45309",
      bar: "bg-amber-500",
      label: "可以投，先补明显缺口",
    };
  }
  if (score >= 45) {
    return {
      text: "text-orange-700",
      bg: "bg-orange-50",
      border: "border-orange-200",
      stroke: "#c2410c",
      bar: "bg-orange-500",
      label: "谨慎投，先补硬性技能",
    };
  }
  return {
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    stroke: "#be123c",
    bar: "bg-rose-500",
    label: "暂不建议投，先换更贴近的岗位",
  };
}

function ModeBadge({ mode }: { mode: MatchMode }) {
  const llm = mode === "llm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        llm ? "bg-violet-50 text-violet-700" : "bg-zinc-100 text-zinc-600"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${llm ? "bg-violet-500" : "bg-zinc-400"}`}
      />
      {llm ? "大模型提取 + 规则匹配" : "规则提取 + 规则匹配"}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const tone = scoreTone(score);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 110 110" className="size-full -rotate-90">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="9"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-semibold tabular-nums ${tone.text}`}>
          {score}
        </span>
        <span className="text-[10px] text-zinc-400">/ 100</span>
      </div>
    </div>
  );
}

function DimensionBar({
  label,
  score,
  detail,
}: {
  label: string;
  score: number;
  detail: string;
}) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        <span className={`text-sm font-semibold tabular-nums ${tone.text}`}>
          {score}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.max(2, score)}%` }}
        />
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
    </div>
  );
}

function SkillChip({
  skill,
  matched,
  kind,
}: {
  skill: string;
  matched: boolean;
  kind: "must" | "nice";
}) {
  if (matched) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
        <span aria-hidden>✓</span>
        {skill}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        kind === "must"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-500"
      }`}
    >
      <span aria-hidden>—</span>
      {skill}
    </span>
  );
}

function SkillGroup({
  title,
  skills,
  matched,
  kind,
}: {
  title: string;
  skills: string[];
  matched: boolean;
  kind: "must" | "nice";
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-zinc-500">{title}</p>
      {skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <SkillChip key={skill} skill={skill} matched={matched} kind={kind} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">无</p>
      )}
    </div>
  );
}

function buildChecklist(active: DisplayResult): string {
  const { jobTitle, score, result, generated } = active;
  return [
    `求职作战台 · ${jobTitle}`,
    `匹配分：${score}/100（只衡量文本证据，不代表录用概率）`,
    "",
    "【命中硬性要求】",
    result.matchedMust.length ? result.matchedMust.join("、") : "无",
    "【缺少硬性要求】",
    result.missingMust.length ? result.missingMust.join("、") : "无",
    "",
    "【简历改写建议】",
    ...generated.bullets.map((bullet, index) => `${index + 1}. ${bullet}`),
    "",
    "【面试追问】",
    ...generated.questions.map(
      (item, index) => `${index + 1}. ${item.question}\n   提示：${item.hint}`,
    ),
    "",
    "【7 天计划】",
    ...generated.plan.map((item) => `${item.day}：${item.task}（产出：${item.output}）`),
    "",
    "提醒：不要虚构工作经历；没做过的技能就说没做过，用项目和学习计划回答。",
  ].join("\n");
}

function AnalysisView({ active }: { active: DisplayResult }) {
  const [tab, setTab] = useState<TabKey>("bullets");
  const [copied, setCopied] = useState(false);
  const { result, generated } = active;
  const tone = scoreTone(active.score);

  async function copyChecklist() {
    try {
      await navigator.clipboard.writeText(buildChecklist(active));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 剪贴板被浏览器拒绝时忽略，不打断阅读
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ScoreRing score={active.score} />
            <div className="min-w-0">
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.bg} ${tone.border} ${tone.text}`}
              >
                {tone.label}
              </span>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900">
                {active.jobTitle}
              </h2>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                匹配分只衡量 JD 和简历的文本证据，不代表录用概率。
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <ModeBadge mode={active.mode} />
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800">
                命中 {result.matchedMust.length}
              </span>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
                缺口 {result.missingMust.length}
              </span>
              <span className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800">
                证据 {result.evidence.length}
              </span>
            </div>
          </div>
        </div>

        {active.note && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {active.note}
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
              02 · 诊断
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">匹配拆解</h2>
            <div className="mt-4 flex flex-col gap-4">
              {result.dimensions.map((dimension) => (
                <DimensionBar
                  key={dimension.key}
                  label={dimension.label}
                  score={dimension.score}
                  detail={dimension.detail}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-900">技能对照</h2>
            <div className="mt-4 flex flex-col gap-4">
              <SkillGroup
                title="硬性要求 · 已命中"
                skills={result.matchedMust}
                matched
                kind="must"
              />
              <SkillGroup
                title="硬性要求 · 缺口"
                skills={result.missingMust}
                matched={false}
                kind="must"
              />
              <SkillGroup
                title="加分项 · 已命中"
                skills={result.matchedNice}
                matched
                kind="nice"
              />
              <SkillGroup
                title="加分项 · 未体现"
                skills={result.missingNice}
                matched={false}
                kind="nice"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-semibold text-zinc-900">缺口与风险</h2>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">缺口</p>
                <ul className="flex flex-col gap-2">
                  {result.gaps.map((gap, index) => (
                    <li
                      key={index}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
                    >
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500">风险提醒</p>
                {result.risks.length ? (
                  <ul className="flex flex-col gap-2">
                    {result.risks.map((risk, index) => (
                      <li
                        key={index}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-700"
                      >
                        {risk}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                    没有额外的风险提醒
                  </p>
                )}
              </div>
            </div>
          </section>

          {result.evidence.length > 0 && (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-semibold text-zinc-900">简历原句证据</h2>
              <p className="mt-1 text-xs text-zinc-500">
                下面是代码从简历原文里截取的句子，面试前确认自己能讲清楚。
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {result.evidence.map((item) => (
                  <li
                    key={`${item.skill}-${item.snippet.slice(0, 12)}`}
                    className="rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
                        {item.skill}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(item.snippet)}
                        className="text-[11px] text-zinc-400 transition hover:text-indigo-700"
                      >
                        复制
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-600">
                      {item.snippet}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
                03 · 行动
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-900">
                下一步怎么做
              </h2>
            </div>
            <button
              type="button"
              onClick={copyChecklist}
              className="inline-flex h-9 items-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-800"
            >
              {copied ? "已复制" : "复制作战清单"}
            </button>
          </div>

          <div className="mt-4 flex gap-1 rounded-xl bg-zinc-100 p-1">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition ${
                  tab === item.key
                    ? "bg-white text-indigo-800 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex-1">
            {tab === "bullets" && (
              <ul className="flex flex-col gap-3">
                {generated.bullets.map((bullet, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-3 text-sm leading-6 text-zinc-700"
                  >
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-indigo-700 text-[10px] font-semibold text-white">
                      {index + 1}
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}

            {tab === "questions" && (
              <ul className="flex flex-col gap-3">
                {generated.questions.map((item, index) => (
                  <li
                    key={index}
                    className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3"
                  >
                    <p className="text-sm font-medium leading-6 text-zinc-900">
                      <span className="mr-1 text-indigo-700">Q{index + 1}.</span>
                      {item.question}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                      为什么问：{item.why}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                      回答提示：{item.hint}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {tab === "plan" && (
              <ol className="relative flex flex-col gap-3">
                {generated.plan.map((item) => (
                  <li
                    key={item.day}
                    className="flex gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3"
                  >
                    <span className="w-12 shrink-0 text-xs font-semibold text-indigo-700">
                      {item.day}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-6 text-zinc-800">{item.task}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        产出：{item.output}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function HistoryPanel({
  records,
  activeId,
  onSelect,
}: {
  records: AnalysisRecord[];
  activeId?: number;
  onSelect: (record: AnalysisRecord) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
            04 · 记录
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">最近分析</h2>
        </div>
        <span className="text-xs text-zinc-400">{records.length} 条</span>
      </div>

      {records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
          还没有记录，提交第一份 JD 和简历后会出现在这里。
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {records.map((record) => {
            const tone = scoreTone(record.score);
            return (
              <li key={record.id}>
                <button
                  type="button"
                  onClick={() => onSelect(record)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-zinc-50 ${
                    activeId === record.id ? "bg-indigo-50/60" : ""
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums ${tone.bg} ${tone.text}`}
                  >
                    {record.score}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-800">
                      {record.jobTitle}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{formatDateTime(record.createdAt)}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          record.mode === "llm"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {record.mode === "llm" ? "大模型" : "规则"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-400">
                    缺口 {record.result.missingMust.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const [jd, setJd] = useState(SAMPLE_JDS[0].text);
  const [resume, setResume] = useState(SAMPLE_RESUME);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<DisplayResult | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/analyses", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { analyses?: AnalysisRecord[] };
      setHistory(Array.isArray(data.analyses) ? data.analyses : []);
    } catch {
      // 历史记录加载失败不影响主流程
    }
  }, []);

  useEffect(() => {
    // 首屏从接口拉取历史记录；setState 发生在 fetch 回调里，不是同步级联更新
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory();
  }, [loadHistory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (jd.trim().length < 20 || resume.trim().length < 20) {
      setError("JD 和简历都至少需要 20 个字");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: jd.trim(), resume: resume.trim() }),
      });
      const data = (await response.json()) as AnalyzeResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || `请求失败（${response.status}）`);
      }
      setActive(toDisplay(data));
      void loadHistory();
      window.setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function pickSampleJd(text: string) {
    setJd(text);
    setError(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-700 text-lg font-semibold text-white shadow-sm">
            战
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                AI 求职作战台
              </h1>
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                AI 应用自测项目
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
              把 JD 和简历变成可核对的匹配诊断：大模型只负责提取字段，匹配分、技能缺口和 7 天补强计划全部由确定性代码生成。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
          {["Next.js + TypeScript", "LLM 结构化提取", "确定性匹配"].map(
            (label) => (
              <span
                key={label}
                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1"
              >
                {label}
              </span>
            ),
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700">
              01 · 输入
            </p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">
              粘贴一份 JD 和一份简历
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            示例数据均为虚构，可放心点
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex min-w-0 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="jd"
                  className="text-sm font-medium text-zinc-800"
                >
                  岗位 JD
                </label>
                <span className="text-xs tabular-nums text-zinc-400">
                  {jd.length}/6000
                </span>
              </div>
              <textarea
                id="jd"
                value={jd}
                onChange={(event) => setJd(event.target.value)}
                rows={12}
                maxLength={6000}
                placeholder="粘贴岗位职责和任职要求，越完整越好……"
                className="min-h-64 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SAMPLE_JDS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => pickSampleJd(sample.text)}
                    className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="resume"
                  className="text-sm font-medium text-zinc-800"
                >
                  简历文本
                </label>
                <span className="text-xs tabular-nums text-zinc-400">
                  {resume.length}/8000
                </span>
              </div>
              <textarea
                id="resume"
                value={resume}
                onChange={(event) => setResume(event.target.value)}
                rows={12}
                maxLength={8000}
                placeholder="粘贴简历里的教育、技能、项目经历；不要放身份证号等敏感信息……"
                className="min-h-64 w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 text-sm leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setResume(SAMPLE_RESUME);
                    setError(null);
                  }}
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                >
                  填入示例简历
                </button>
                <span className="self-center text-[11px] text-zinc-400">
                  建议删掉手机号、身份证号
                </span>
              </div>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-zinc-400">
              未配置 LLM_API_KEY 时自动使用规则提取，功能不受影响；配置后自动切换为大模型。
            </p>
            <button
              type="submit"
              disabled={loading || jd.trim().length < 20 || resume.trim().length < 20}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {loading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  正在拆 JD 和简历…
                </>
              ) : (
                "开始匹配"
              )}
            </button>
          </div>
        </form>
      </section>

      <div id="result" className="scroll-mt-6">
        {active ? (
          <AnalysisView key={active.id} active={active} />
        ) : (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 px-6 py-12 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-indigo-50 text-xl text-indigo-700">
              ◎
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-700">
              提交后这里会出现作战面板
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-zinc-500">
              匹配分、六维诊断、技能缺口、简历原句证据、改写建议、面试追问和 7 天计划，一次生成。
            </p>
          </section>
        )}
      </div>

      <HistoryPanel
        records={history}
        activeId={active?.id}
        onSelect={(record) => {
          setActive(fromRecord(record));
          window.setTimeout(() => {
            document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
          }, 50);
        }}
      />

      <footer className="pb-4 text-center text-xs leading-6 text-zinc-400">
        自测项目 · JD、公司与简历示例均为虚构 · 不连接招聘平台 · 匹配分只衡量文本证据
      </footer>
    </main>
  );
}
