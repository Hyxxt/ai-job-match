type SkillDef = {
  name: string;
  aliases: string[];
  category: string;
};

/**
 * 技能词典只用于「确定性匹配」：同一件事的不同写法归一到同一个名字。
 * 模型可以补充词典外的技能，但命中/缺口仍由这里的规则算。
 */
export const SKILLS: SkillDef[] = [
  { name: "JavaScript", aliases: ["javascript", "js", "es6"], category: "语言" },
  { name: "TypeScript", aliases: ["typescript", "ts"], category: "语言" },
  { name: "Python", aliases: ["python", "py"], category: "语言" },
  { name: "Java", aliases: ["java"], category: "语言" },
  { name: "Go", aliases: ["golang", "go语言"], category: "语言" },
  { name: "C++", aliases: ["c++", "cpp"], category: "语言" },
  { name: "C#", aliases: ["c#", "csharp"], category: "语言" },
  { name: "PHP", aliases: ["php"], category: "语言" },
  { name: "SQL", aliases: ["sql"], category: "语言" },
  { name: "HTML/CSS", aliases: ["html", "css", "html5", "css3"], category: "前端" },
  { name: "React", aliases: ["react", "react.js", "reactjs"], category: "前端" },
  { name: "Next.js", aliases: ["next.js", "nextjs", "next 13", "next 14", "next 15", "next 16"], category: "前端" },
  { name: "Vue", aliases: ["vue", "vue.js", "vuejs"], category: "前端" },
  { name: "Nuxt", aliases: ["nuxt", "nuxt.js"], category: "前端" },
  { name: "Angular", aliases: ["angular"], category: "前端" },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"], category: "前端" },
  { name: "Redux", aliases: ["redux", "zustand"], category: "前端" },
  { name: "Vite", aliases: ["vite"], category: "前端" },
  { name: "Webpack", aliases: ["webpack"], category: "前端" },
  { name: "Node.js", aliases: ["node.js", "nodejs", "node"], category: "后端" },
  { name: "Express", aliases: ["express", "express.js"], category: "后端" },
  { name: "NestJS", aliases: ["nestjs"], category: "后端" },
  { name: "Spring Boot", aliases: ["spring boot", "springboot", "spring"], category: "后端" },
  { name: "Django", aliases: ["django"], category: "后端" },
  { name: "Flask", aliases: ["flask"], category: "后端" },
  { name: "FastAPI", aliases: ["fastapi"], category: "后端" },
  { name: "REST API", aliases: ["rest api", "restful", "rest 接口", "api 设计"], category: "后端" },
  { name: "GraphQL", aliases: ["graphql"], category: "后端" },
  { name: "WebSocket", aliases: ["websocket", "socket.io"], category: "后端" },
  { name: "Nginx", aliases: ["nginx"], category: "后端" },
  { name: "MySQL", aliases: ["mysql"], category: "数据库" },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres", "pg"], category: "数据库" },
  { name: "SQLite", aliases: ["sqlite"], category: "数据库" },
  { name: "Redis", aliases: ["redis"], category: "数据库" },
  { name: "MongoDB", aliases: ["mongodb", "mongo"], category: "数据库" },
  { name: "Turso", aliases: ["turso", "libsql"], category: "数据库" },
  { name: "Prisma", aliases: ["prisma"], category: "数据库" },
  { name: "LLM", aliases: ["llm", "大模型", "大语言模型", "语言模型"], category: "AI" },
  { name: "RAG", aliases: ["rag", "检索增强", "检索增强生成"], category: "AI" },
  { name: "Prompt Engineering", aliases: ["prompt", "提示词", "提示工程"], category: "AI" },
  { name: "OpenAI API", aliases: ["openai", "gpt-4", "gpt4", "chatgpt api"], category: "AI" },
  { name: "DeepSeek", aliases: ["deepseek"], category: "AI" },
  { name: "LangChain", aliases: ["langchain"], category: "AI" },
  { name: "LlamaIndex", aliases: ["llamaindex"], category: "AI" },
  { name: "PyTorch", aliases: ["pytorch"], category: "AI" },
  { name: "TensorFlow", aliases: ["tensorflow"], category: "AI" },
  { name: "Pandas", aliases: ["pandas"], category: "AI" },
  { name: "NumPy", aliases: ["numpy"], category: "AI" },
  { name: "向量数据库", aliases: ["向量数据库", "vector database", "pinecone", "milvus", "chroma", "faiss"], category: "AI" },
  { name: "模型微调", aliases: ["微调", "fine-tune", "finetune", "lora"], category: "AI" },
  { name: "Agent", aliases: ["agent", "智能体", "function calling", "工具调用"], category: "AI" },
  { name: "MCP", aliases: ["mcp", "model context protocol"], category: "AI" },
  { name: "Git", aliases: ["git", "github", "gitlab"], category: "工程化" },
  { name: "Docker", aliases: ["docker", "容器化"], category: "工程化" },
  { name: "Kubernetes", aliases: ["kubernetes", "k8s"], category: "工程化" },
  { name: "Linux", aliases: ["linux", "ubuntu", "centos"], category: "工程化" },
  { name: "CI/CD", aliases: ["ci/cd", "cicd", "持续集成", "持续部署"], category: "工程化" },
  { name: "GitHub Actions", aliases: ["github actions", "github action"], category: "工程化" },
  { name: "Vercel", aliases: ["vercel"], category: "工程化" },
  { name: "Render", aliases: ["render"], category: "工程化" },
  { name: "Cloudflare", aliases: ["cloudflare", "workers", "pages"], category: "工程化" },
  { name: "AWS", aliases: ["aws", "amazon web services"], category: "工程化" },
  { name: "阿里云", aliases: ["阿里云", "aliyun"], category: "工程化" },
  { name: "腾讯云", aliases: ["腾讯云", "tencent cloud"], category: "工程化" },
  { name: "Excel", aliases: ["excel", "电子表格"], category: "业务工具" },
  { name: "openpyxl", aliases: ["openpyxl"], category: "业务工具" },
  { name: "Selenium", aliases: ["selenium"], category: "业务工具" },
  { name: "Playwright", aliases: ["playwright"], category: "业务工具" },
  { name: "RPA", aliases: ["rpa", "影刀", "自动化流程"], category: "业务工具" },
  { name: "Coze", aliases: ["coze", "扣子"], category: "业务工具" },
  { name: "爬虫", aliases: ["爬虫", "crawler", "scrapy", "beautifulsoup"], category: "业务工具" },
  { name: "项目管理", aliases: ["项目管理", "project management"], category: "业务" },
  { name: "需求分析", aliases: ["需求分析", "需求调研"], category: "业务" },
  { name: "服装辅料", aliases: ["服装辅料", "拉链", "纽扣", "织带"], category: "业务" },
  { name: "质检", aliases: ["质检", "质量检验", "qc"], category: "业务" },
  { name: "订单管理", aliases: ["订单管理", "订单跟进", "跟单"], category: "业务" },
  { name: "报价", aliases: ["报价", "询价", "quotation"], category: "业务" },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAsciiAlias(alias: string): boolean {
  return /^[a-z0-9+#./ -]+$/i.test(alias);
}

export function findAliasIndex(text: string, alias: string): number {
  const lower = text.toLowerCase();
  const target = alias.toLowerCase();

  if (!isAsciiAlias(target)) {
    return lower.indexOf(target);
  }

  // “js” 不能命中 Next.js / React.js / Node.js 里的后缀：
  // 这些词已经由各自更具体的技能命中，否则 JavaScript 会被误算成要求。
  const prefix = target === "js" ? "[^a-z0-9.]" : "[^a-z0-9]";
  const pattern = new RegExp(
    `(^|${prefix})${escapeRegExp(target)}([^a-z0-9]|$)`,
    "i",
  );
  const match = pattern.exec(lower);
  if (!match) return -1;
  return match.index + match[1].length;
}

export function matchSkills(text: string): string[] {
  type Hit = { name: string; at: number };
  const hits: Hit[] = [];

  for (const skill of SKILLS) {
    let best = -1;
    for (const alias of skill.aliases) {
      const at = findAliasIndex(text, alias);
      if (at !== -1 && (best === -1 || at < best)) best = at;
    }
    if (best !== -1) hits.push({ name: skill.name, at: best });
  }

  return hits.sort((a, b) => a.at - b.at).map((hit) => hit.name);
}

export function skillCategory(name: string): string {
  return SKILLS.find((skill) => skill.name === name)?.category ?? "其他";
}

export function findEvidence(text: string, skill: string): string | null {
  const def = SKILLS.find((item) => item.name === skill);
  if (!def) return null;

  for (const alias of def.aliases) {
    const at = findAliasIndex(text, alias);
    if (at === -1) continue;

    const lineStart = Math.max(
      text.lastIndexOf("\n", at) + 1,
      text.lastIndexOf("。", at) + 1,
      text.lastIndexOf("；", at) + 1,
    );
    const lineEndCandidates = [
      text.indexOf("\n", at),
      text.indexOf("。", at),
      text.indexOf("；", at),
    ].filter((index) => index !== -1);
    const lineEnd = lineEndCandidates.length
      ? Math.min(...lineEndCandidates)
      : text.length;

    const raw = text.slice(lineStart, lineEnd + 1).trim();
    if (!raw) continue;

    if (raw.length <= 160) return raw;
    const relative = at - lineStart;
    const start = Math.max(0, relative - 70);
    return `${start > 0 ? "…" : ""}${raw.slice(start, start + 150)}…`;
  }

  return null;
}

export function inferYears(text: string): number | null {
  // “1-3 年”按下限 1 年算：宁可保守，也不把候选人的经验算多。
  const range = text.match(/(\d{1,2})\s*[-~至到]\s*(\d{1,2})\s*年/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    if (low <= 30 && high <= 30) return Math.min(low, high);
  }

  const values: number[] = [];
  for (const pattern of [
    /(\d{1,2})\s*年(?:以上)?[^\n。；]{0,10}?(?:经验|工作经历)/g,
    /(?:经验|工作经历)[^\n。；]{0,8}?(\d{1,2})\s*年/g,
  ]) {
    for (const match of text.matchAll(pattern)) {
      const value = Number(match[1]);
      if (Number.isFinite(value) && value >= 0 && value <= 30) {
        values.push(value);
      }
    }
  }
  return values.length ? Math.max(...values) : null;
}

export function inferEducation(text: string): string {
  if (/博士/.test(text)) return "博士";
  if (/硕士|研究生/.test(text)) return "硕士";
  if (/本科/.test(text)) return "本科";
  if (/大专|专科|高职/.test(text)) return "大专";
  return "";
}

export function inferLocation(text: string): string {
  const cities = [
    "广州",
    "深圳",
    "上海",
    "北京",
    "杭州",
    "成都",
    "武汉",
    "南京",
    "苏州",
    "东莞",
    "佛山",
    "远程",
  ];
  return cities.filter((city) => text.includes(city)).join(" / ");
}
