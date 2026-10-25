import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendProblem } from "../utils/problem";

type RequestSource = "body" | "params" | "query" | "headers" | "user";

export function validate(schema: z.ZodType, source: RequestSource) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value =
      source === "headers" && schema instanceof z.ZodObject
        ? {
            ...req.headers,
            "Idempotency-Key": req.header("Idempotency-Key"),
          }
        : req[source];
    const result = schema.safeParse(value);

    if (!result.success) {
      return sendProblem(res, {
        type: "https://yardpulse.test/problems/validation-failed",
        title: "Validation failed",
        status: 400,
        code: "validation_failed",
        detail: "The request contains invalid fields.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    res.locals.validated ??= {};
    res.locals.validated[source] = result.data;
    next();
  };
}
