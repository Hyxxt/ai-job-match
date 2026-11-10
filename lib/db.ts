/**
 * 分析快照持久化。
 *
 * 本地默认使用 Node 内置的 node:sqlite（零配置）；
 * 部署到无持久磁盘的平台时，配置 TURSO_DATABASE_URL / TURSO_AUTH_TOKEN，
 * 自动切换到 Turso 云数据库。两边都是 SQLite 语法，表结构一致。
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { Client } from "@libsql/client";
import type {
  AnalysisRecord,
  Generated,
  MatchMode,
  MatchResult,
} from "./types";

type AnalysisRow = {
  id: number | bigint;
  created_at: string;
  mode: string;
  note: string | null;
  job_title: string;
  score: number;
  result_json: string;
  generated_json: string;
  jd_text: string;
  resume_text: string;
};

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    mode TEXT NOT NULL,
    note TEXT,
    job_title TEXT NOT NULL,
    score INTEGER NOT NULL,
    result_json TEXT NOT NULL,
    generated_json TEXT NOT NULL,
    jd_text TEXT NOT NULL,
    resume_text TEXT NOT NULL
  )
`;

const CREATE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC)
`;

const INSERT_SQL = `
  INSERT INTO analyses
    (created_at, mode, note, job_title, score, result_json, generated_json, jd_text, resume_text)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

// 列表不返回两段原始文本，避免历史接口把整份简历反复传一遍。
const SELECT_SQL = `
  SELECT id, created_at, mode, note, job_title, score, result_json, generated_json, '' AS jd_text, '' AS resume_text
  FROM analyses
  ORDER BY id DESC
  LIMIT ?
`;

let localDbPromise: Promise<DatabaseSync> | null = null;
let remoteClientPromise: Promise<Client> | null = null;

function tursoUrl(): string {
  return process.env.TURSO_DATABASE_URL?.trim() ?? "";
}

function isTursoEnabled(): boolean {
  return tursoUrl().length > 0;
}

async function getLocalDb(): Promise<DatabaseSync> {
  if (!localDbPromise) {
    localDbPromise = (async () => {
      const { DatabaseSync } = await import("node:sqlite");
      const directory =
        process.env.JOB_DB_DIR?.trim() || path.join(process.cwd(), ".data");
      mkdirSync(directory, { recursive: true });

      const database = new DatabaseSync(path.join(directory, "job-match.db"));
      database.exec("PRAGMA journal_mode = WAL;");
      database.exec(CREATE_TABLE_SQL);
      database.exec(CREATE_INDEX_SQL);
      return database;
    })();
  }
  return localDbPromise;
}

async function getRemoteClient(): Promise<Client> {
  if (!remoteClientPromise) {
    remoteClientPromise = (async () => {
      // 只加载 web 客户端：走 HTTPS，不依赖原生扩展
      const { createClient } = await import("@libsql/client/web");
      const client = createClient({
        url: tursoUrl(),
        authToken: process.env.TURSO_AUTH_TOKEN?.trim() || undefined,
      });
      await client.execute(CREATE_TABLE_SQL);
      await client.execute(CREATE_INDEX_SQL);
      return client;
    })();
  }
  return remoteClientPromise;
}

function mapRow(row: AnalysisRow): AnalysisRecord {
  const mode: MatchMode = row.mode === "llm" ? "llm" : "rule";
  return {
    id: Number(row.id),
    createdAt: String(row.created_at),
    mode,
    note: row.note === null ? undefined : String(row.note),
    jobTitle: String(row.job_title),
    score: Number(row.score),
    result: JSON.parse(String(row.result_json)) as MatchResult,
    generated: JSON.parse(String(row.generated_json)) as Generated,
    jdText: String(row.jd_text ?? ""),
    resumeText: String(row.resume_text ?? ""),
  };
}

export type SaveAnalysisInput = {
  mode: MatchMode;
  note?: string;
  jobTitle: string;
  score: number;
  result: MatchResult;
  generated: Generated;
  jdText: string;
  resumeText: string;
};

export async function saveAnalysis(input: SaveAnalysisInput): Promise<number> {
  const values: (string | number | null)[] = [
    new Date().toISOString(),
    input.mode,
    input.note ?? null,
    input.jobTitle,
    input.score,
    JSON.stringify(input.result),
    JSON.stringify(input.generated),
    input.jdText,
    input.resumeText,
  ];

  if (isTursoEnabled()) {
    const client = await getRemoteClient();
    const result = await client.execute({ sql: INSERT_SQL, args: values });
    return Number(result.lastInsertRowid ?? 0);
  }

  const statement = (await getLocalDb()).prepare(INSERT_SQL);
  const result = statement.run(...values);
  return Number(result.lastInsertRowid);
}

export async function listAnalyses(limit = 10): Promise<AnalysisRecord[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);

  if (isTursoEnabled()) {
    const client = await getRemoteClient();
    const result = await client.execute({ sql: SELECT_SQL, args: [safeLimit] });
    return result.rows.map((row) => mapRow(row as unknown as AnalysisRow));
  }

  const rows = (await getLocalDb())
    .prepare(SELECT_SQL)
    .all(safeLimit) as unknown as AnalysisRow[];
  return rows.map(mapRow);
}
