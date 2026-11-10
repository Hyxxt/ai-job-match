import type {
  Generated,
  GeneratedQuestion,
  JobProfile,
  MatchResult,
  PlanItem,
  ResumeProfile,
} from "./types";

function shorten(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function hasSkill(job: JobProfile, names: string[]): boolean {
  return [...job.mustSkills, ...job.niceSkills].some((skill) =>
    names.includes(skill),
  );
}

export function buildAdvice(
  job: JobProfile,
  resume: ResumeProfile,
  result: MatchResult,
): Generated {
  const topMatched = (result.matchedMust.length
    ? result.matchedMust
    : result.matchedNice
  ).slice(0, 3);
  const missing = result.missingMust;
  const strongest = result.evidence[0];

  const bullets: string[] = [];
  if (topMatched.length) {
    bullets.push(
      `简历第一屏先放最相关的项目：${topMatched.join(" / ")}。每条写“做了什么 + 结果 + 可复现链接”，不要只列技能词。`,
    );
  }
  if (strongest) {
    bullets.push(
      `把「${shorten(strongest.snippet, 60)}」改写成结果句：输入是什么、你做了什么、输出/耗时/准确率是多少。`,
    );
  }
  if (missing.length) {
    bullets.push(
      `「${missing.slice(0, 2).join("」「")}」目前没有证据：7 天内各做一个最小 demo，做完再决定是否写进简历。`,
    );
  }
  if (
    (job.minYears !== null &&
      (resume.years === null || resume.years < job.minYears)) ||
    (job.education &&
      resume.education &&
      resume.education !== job.education)
  ) {
    bullets.push(
      "没有正式工作经验时，不写“X 年经验”；写“项目经验 + 每周可到岗天数 + 作品链接”。",
    );
  }
  if (result.score >= 70) {
    bullets.push(
      "投递时附上最匹配项目的在线 demo 和 GitHub 地址，让筛选者在 30 秒内能验证。",
    );
  } else {
    bullets.push(
      "先投匹配度更高的岗位练手；这份 JD 可以收藏，补完缺口再投，不要用同一份简历海投。",
    );
  }
  bullets.push(
    "自我介绍只讲两个项目：一个最匹配 JD，一个最能体现排错或工程化。",
  );

  const questions: GeneratedQuestion[] = [];
  for (const skill of result.matchedMust.slice(0, 3)) {
    const ev = result.evidence.find((item) => item.skill === skill);
    questions.push({
      question: `你在项目里怎么用 ${skill}？为什么选它、遇到什么问题、怎么验证？`,
      why: `JD 明确要求「${skill}」，简历里有证据，面试官大概率会追问。`,
      hint: ev
        ? `从这句展开：${shorten(ev.snippet, 90)}`
        : "按“需求 → 方案 → 取舍 → 验证”回答，别只背概念。",
    });
  }
  for (const skill of missing.slice(0, 3)) {
    questions.push({
      question: `JD 要求 ${skill}，你目前没有项目证据。如果面试官问“你了解吗”，你准备怎么诚实回答？`,
      why: "这是硬性缺口，回避或硬编经历都会在追问里露馅。",
      hint: "先说边界：没做过就说没做过；再给正在做的 demo、学习路径和可验证产出。",
    });
  }
  if (job.minYears !== null && (resume.years === null || resume.years < job.minYears)) {
    questions.push({
      question: "你还是学生或年限不够，怎么证明能胜任这个岗位？",
      why: "HR 和面试官都会确认时间投入与交付能力。",
      hint: "如实说明在读/年限；用可到岗时间、完整项目和在线 demo 证明，不编工作经历。",
    });
  }
  if (
    job.education &&
    resume.education &&
    resume.education !== job.education
  ) {
    questions.push({
      question: `JD 写${job.education}，你是${resume.education}，问起时怎么回答？`,
      why: "学历可能影响筛选，提前准备能避免现场慌乱。",
      hint: "如实说明在读/学历，补上可到岗时间、项目链接和已完成的交付。",
    });
  }
  if (hasSkill(job, ["LLM", "RAG", "Prompt Engineering", "Agent"])) {
    questions.push({
      question: "你的 LLM / RAG 项目怎么防幻觉、怎么做评测？",
      why: "AI 应用岗位的高频追问，能区分“调过 API”和“做过工程”。",
      hint: "引用编号、资料不足拒答、固定评测集、规则兜底、失败案例。",
    });
  }
  questions.push({
    question: "挑一个项目讲清楚：需求、方案、取舍、踩坑、验证。",
    why: "项目深挖几乎每场必问，面试官想看真实做过还是背稿。",
    hint: "控制在 3 分钟，最后一定给出可复现链接或截图。",
  });

  const focus = missing[0] ?? topMatched[0] ?? "项目证据";
  const plan: PlanItem[] = [
    missing.length
      ? {
          day: "第 1 天",
          task: `补「${focus}」的最小可用知识：只学能做出 demo 的部分，别从目录学到目录。`,
          output: "一个 30 行以内、能跑的最小 demo",
        }
      : {
          day: "第 1 天",
          task: `给最强项目补一个可量化指标，突出「${focus}」。`,
          output: "一条带数字的结果说明",
        },
    hasSkill(job, ["LLM", "RAG", "Prompt Engineering", "Agent"])
      ? {
          day: "第 2 天",
          task: "给 AI 项目补评测：10 条固定输入 + 拒答/失败案例，记录命中率。",
          output: "评测结果截图或表格",
        }
      : {
          day: "第 2 天",
          task: "把最匹配的项目部署到公网，README 写清启动命令和演示地址。",
          output: "一个可访问链接",
        },
    {
      day: "第 3 天",
      task: "把项目写进简历：每条 bullet = 动作 + 技术 + 结果，删掉形容词。",
      output: "2 条可被追问的项目 bullet",
    },
    {
      day: "第 4 天",
      task: "按上面的追问清单口述 5 个问题并录音，回听有没有空话。",
      output: "1 份 3 分钟口述稿",
    },
    {
      day: "第 5 天",
      task: "模拟面试 10 分钟：项目深挖 + 技能缺口 + 反问环节。",
      output: "录屏 + 3 条改进",
    },
    result.score >= 55
      ? {
          day: "第 6 天",
          task: "投 5 家匹配度 ≥60 的岗位，记录岗位、渠道、时间和反馈。",
          output: "投递记录表",
        }
      : {
          day: "第 6 天",
          task: "先别海投：选 2 家要求接近的岗位练手，记录被问住的问题。",
          output: "2 次练手复盘",
        },
    {
      day: "第 7 天",
      task: "复盘已读不回或拒信，调整简历关键词和项目排序。",
      output: "下一周 3 个具体动作",
    },
  ];

  return { bullets, questions: questions.slice(0, 8), plan };
}
