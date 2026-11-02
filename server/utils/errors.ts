import { createError, getQuery, getRouterParam, readBody, type H3Event } from "h3";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * Every API error has the same shape:
 * { statusCode, statusMessage, data: { code, issues? } }
 * `code` is machine-readable so the UI can show its own (German) message.
 */
export function apiError(
  statusCode: number,
  code: string,
  message: string,
  issues?: unknown,
) {
  return createError({
    statusCode,
    statusMessage: message,
    data: issues === undefined ? { code } : { code, issues },
  });
}

export const notFound = (what: string) =>
  apiError(404, "NOT_FOUND", `${what} not found`);

function validationError(error: z.ZodError) {
  return apiError(400, "VALIDATION_FAILED", "Validation failed", z.flattenError(error));
}

export async function parseBody<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.output<T>> {
  const body = await readBody(event).catch(() => undefined);
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw validationError(result.error);
  return result.data;
}

export function parseQuery<T extends z.ZodType>(event: H3Event, schema: T): z.output<T> {
  const result = schema.safeParse(getQuery(event));
  if (!result.success) throw validationError(result.error);
  return result.data;
}

const IdParam = z.coerce.number().int().positive();

/** Numeric route parameter; anything else is treated as "not found". */
export function idParam(event: H3Event, name: string, what: string): number {
  const result = IdParam.safeParse(getRouterParam(event, name));
  if (!result.success) throw notFound(what);
  return result.data;
}

/** Turns a Prisma unique-constraint violation into a 409 with the given code. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
