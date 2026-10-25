import { Response } from "express";

export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  errors?: Array<{ field: string; message: string }>;
}

export function sendProblem(res: Response, problem: Problem) {
  return res
    .status(problem.status)
    .set("Content-Type", "application/problem+json")
    .json(problem);
}

export function isProblem(value: unknown): value is Problem {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    "title" in value &&
    typeof value.title === "string" &&
    "status" in value &&
    typeof value.status === "number" &&
    "code" in value &&
    typeof value.code === "string" &&
    "detail" in value &&
    typeof value.detail === "string"
  );
}

export function sendServiceResponse(
  res: Response,
  result: { status: number; body?: unknown } | ServiceResponse,
) {
  const body = "body" in result ? result.body : result;
  if (isProblem(body)) return sendProblem(res, body);
  if (result.status >= 400) {
    return sendProblem(res, {
      type: "https://yardpulse.test/problems/internal-error",
      title: "Internal server error",
      status: 500,
      code: "internal_error",
      detail: "An unexpected error occurred. Please try again later.",
    });
  }
  return res.status(result.status).json(body);
}
