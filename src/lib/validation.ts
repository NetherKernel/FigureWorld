import { z, ZodError } from "zod";
import { ValidationError } from "./errors";

export async function validateRequestBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid JSON in request body");
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const errorMessages = formatZodErrors(result.error);
    throw new ValidationError("Validation failed for request body", errorMessages);
  }

  return result.data;
}

export function validateQueryParams<T>(searchParams: URLSearchParams, schema: z.ZodType<T>): T {
  const paramsObj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    paramsObj[key] = value;
  });

  const result = schema.safeParse(paramsObj);
  if (!result.success) {
    const errorMessages = formatZodErrors(result.error);
    throw new ValidationError("Validation failed for query parameters", errorMessages);
  }

  return result.data;
}

function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".") || "root";
    formatted[path] = issue.message;
  });
  return formatted;
}
