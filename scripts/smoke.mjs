/**
 * 接口冒烟测试：需要先启动服务（npm run dev 或 npm start）。
 * 用法：npm run smoke
 * 可选：BASE_URL=http://localhost:3100 npm run smoke
 *
 * 请求里带 mock: true，强制规则提取，保证断言可重复。
 */

const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const JD = `职位：AI 应用开发工程师
公司：测试科技有限公司（虚构示例）
工作地点：广州

岗位职责：
1. 使用大模型 API 开发信息提取功能；
2. 参与前后端开发。

任职要求：
1. 熟悉 TypeScript、React、Next.js、Node.js；
2. 熟悉 SQL、SQLite，会 Git；
3. 有 RAG 项目经验。

加分项：
1. 了解 Docker。`;

const RESUME = `姓名：测试候选人（虚构示例）
技能：TypeScript、React、Next.js、Node.js、SQL、SQLite、Git、RAG、LLM

项目经历
知识库问答（个人项目）
- 用 TypeScript 和 Next.js 做界面，Node.js 写接口，SQLite 存数据。
- 自写 RAG 检索，用 Git 管理代码，写了 10 道评测题。`;

const JD_HARD = `职位：全栈开发工程师
公司：测试数据服务有限公司（虚构示例）
工作地点：深圳

岗位职责：
1. 负责 Web 前端和 Node.js 接口开发。

任职要求：
1. 本科及以上学历，2 年以上 Web 开发经验；
2. 熟悉 React、TypeScript、Node.js；
3. 熟悉 MySQL、Redis；
4. 了解 Docker 和 Linux。

加分项：
1. 有 LLM 或 RAG 项目经验。`;

const RESUME_JAVA = `姓名：测试后端（虚构示例）
教育经历：某职业技术学院 大专
技能：Java、Spring Boot、MySQL、Redis、Linux、Docker、Git

项目经历
订单系统（个人项目）
- 用 Java 和 Spring Boot 写接口，MySQL 存订单，Redis 做缓存，Docker 部署到 Linux。`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function postAnalyze(jd, resume) {
  const response = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd, resume, mock: true }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `POST /api/analyze 失败：HTTP ${response.status} ${data.error ?? ""}`,
    );
  }
  return data;
}

let failures = 0;

try {
  const data = await postAnalyze(JD, RESUME);
  assert(data.mode === "rule", `mock 模式应为 rule，实际 ${data.mode}`);
  assert(data.id > 0, "应返回数据库记录 id");
  assert(
    Number.isInteger(data.result.score) &&
      data.result.score >= 70 &&
      data.result.score <= 100,
    `高匹配样例应在 70-100 分，实际 ${data.result.score}`,
  );
  assert(data.result.dimensions.length === 6, "应有 6 个诊断维度");
  for (const skill of ["TypeScript", "React", "Next.js", "Node.js", "SQL", "Git", "RAG"]) {
    assert(
      data.result.matchedMust.includes(skill),
      `命中技能应包含 ${skill}`,
    );
  }
  assert(
    data.result.missingMust.includes("Docker") === false,
    "Docker 是加分项，不应算进硬性缺口",
  );
  assert(data.result.missingNice.includes("Docker"), "Docker 应在加分项缺口里");
  assert(data.generated.bullets.length >= 4, "至少生成 4 条简历建议");
  assert(data.generated.questions.length >= 4, "至少生成 4 个面试追问");
  assert(data.generated.plan.length === 7, "计划应为 7 天");
  assert(data.job.title.includes("AI 应用开发"), `岗位名提取错误：${data.job.title}`);
  assert(data.resume.projects.length >= 1, "应提取到项目经历");
  console.log(
    `✓ 高匹配：${data.job.title}，${data.result.score} 分，命中 ${data.result.matchedMust.length} 项`,
  );
  console.log(`  硬性技能：${data.job.mustSkills.join("、")}`);
  console.log(`  命中：${data.result.matchedMust.join("、")}`);
  console.log(`  缺口：${data.result.missingMust.join("、")}`);
} catch (error) {
  failures += 1;
  console.error(`✗ 高匹配：${error.message}`);
}

try {
  const data = await postAnalyze(JD_HARD, RESUME_JAVA);
  assert(data.result.score < 60, `不匹配简历应低于 60 分，实际 ${data.result.score}`);
  for (const skill of ["React", "TypeScript", "Node.js"]) {
    assert(
      data.result.missingMust.includes(skill),
      `硬性缺口应包含 ${skill}`,
    );
  }
  for (const skill of ["MySQL", "Redis", "Docker", "Linux"]) {
    assert(
      data.result.matchedMust.includes(skill),
      `Java 简历应命中 ${skill}`,
    );
  }
  assert(data.job.minYears === 2, `JD 年限应为 2，实际 ${data.job.minYears}`);
  assert(data.job.education === "本科", `JD 学历应为本科，实际 ${data.job.education}`);
  assert(data.resume.education === "大专", `简历学历应为大专，实际 ${data.resume.education}`);
  const yearsDimension = data.result.dimensions.find((item) => item.key === "years");
  assert(yearsDimension && yearsDimension.score < 100, "年限维度应扣分");
  console.log(
    `✓ 低匹配：${data.result.score} 分，缺口 ${data.result.missingMust.length} 项，年限维度 ${yearsDimension?.score}`,
  );
  console.log(`  硬性技能：${data.job.mustSkills.join("、")}`);
  console.log(`  命中：${data.result.matchedMust.join("、")}`);
  console.log(`  缺口：${data.result.missingMust.join("、")}`);
} catch (error) {
  failures += 1;
  console.error(`✗ 低匹配：${error.message}`);
}

try {
  const response = await fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jd: "太短", resume: "也太短", mock: true }),
  });
  assert(response.status === 400, `过短输入应返回 400，实际 ${response.status}`);
  console.log("✓ 参数校验：过短输入返回 400");
} catch (error) {
  failures += 1;
  console.error(`✗ 参数校验：${error.message}`);
}

try {
  const first = await postAnalyze(JD, RESUME);
  const second = await postAnalyze(JD, RESUME);
  assert(
    first.result.score === second.result.score,
    `同一输入两次分数应一致：${first.result.score} vs ${second.result.score}`,
  );
  console.log(`✓ 确定性：同一输入两次都是 ${first.result.score} 分`);
} catch (error) {
  failures += 1;
  console.error(`✗ 确定性：${error.message}`);
}

try {
  const response = await fetch(`${base}/api/analyses`);
  const data = await response.json();
  assert(response.ok, `GET /api/analyses 失败：HTTP ${response.status}`);
  assert(Array.isArray(data.analyses), "analyses 应为数组");
  assert(data.analyses.length >= 4, `历史记录应至少 4 条，实际 ${data.analyses.length}`);
  console.log(`✓ 历史记录：${data.analyses.length} 条`);
} catch (error) {
  failures += 1;
  console.error(`✗ 历史记录：${error.message}`);
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log("全部通过。");
}
