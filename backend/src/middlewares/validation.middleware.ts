import { Request, Response, NextFunction } from "express";
import { z } from "zod";

type RequestSource = "body" | "params" | "query" | "headers" | "user";

export function validate(schema: z.ZodType, source: RequestSource) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        status: 400,
        message: "Validation failed",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    next();
  };
}
