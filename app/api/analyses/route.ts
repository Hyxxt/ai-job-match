import { connection } from "next/server";
import { listAnalyses } from "@/lib/db";

export async function GET() {
  // 数据库查询依赖请求时的环境变量，显式标记为请求时执行
  await connection();
  return Response.json({ analyses: await listAnalyses(10) });
}
