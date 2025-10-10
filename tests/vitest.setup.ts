import { config } from "dotenv";
import { readBody, createError, defineEventHandler, eventHandler } from "h3";

config({ path: ".env.test" });

const workerId = process.env.VITEST_WORKER_ID ?? "0";

function withWorkerSuffix(databaseUrl: string, id: string) {
  if (!databaseUrl.startsWith("file:")) return databaseUrl;
  const withoutPrefix = databaseUrl.slice("file:".length);
  const [pathPart, queryPart] = withoutPrefix.split("?");
  if (!pathPart) return databaseUrl;
  const suffix = `-worker${id}`;
  const extensionIndex = pathPart.lastIndexOf(".");
  const pathWithSuffix =
    extensionIndex === -1
      ? `${pathPart}${suffix}`
      : `${pathPart.slice(0, extensionIndex)}${suffix}${pathPart.slice(extensionIndex)}`;
  return `file:${pathWithSuffix}${queryPart ? `?${queryPart}` : ""}`;
}

const baseDatabaseUrl = process.env.DATABASE_URL ?? "file:./test.db";
const workerDatabaseUrl = withWorkerSuffix(baseDatabaseUrl, workerId);

process.env.DATABASE_URL = workerDatabaseUrl;
// make them available like Nitro does
// @ts-ignore
globalThis.defineEventHandler = defineEventHandler;
// @ts-ignore
globalThis.eventHandler = eventHandler;
// @ts-ignore
globalThis.readBody = readBody;
// @ts-ignore
globalThis.createError = createError;
