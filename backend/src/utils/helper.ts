import { env } from "../config/env";
import { DateTime } from "luxon";

export const TERMINAL_TIME_ZONE = "Asia/Dubai";

export const daysAgo = (days: number, hour: number): Date => {
  return DateTime.now()
    .setZone(TERMINAL_TIME_ZONE)
    .minus({ days })
    .set({ hour, minute: 0, second: 0, millisecond: 0 })
    .toUTC()
    .toJSDate();
};

export function entityNotFoundError(entity: string) {
  return {
    type: "https://yardpulse.test/problems/not-found",
    title: `${entity} not found`,
    status: 404,
    code: "not_found",
    detail: `The requested ${entity.toLowerCase()} does not exist or is not available.`,
  };
}

export function parseErrorRespose({
  error,
  message,
}: {
  error: unknown;
  message: string;
}): ServiceResponse {
  const createResponse = (
    type: string,
    title: string,
    status: number,
    code: string,
    detail: string,
  ): ServiceResponse => ({
    type,
    title,
    status,
    code,
    detail,
  });

  if (env.nodeEnv === "development") console.error(message, error);
  return createResponse(
    "https://yardpulse.test/problems/internal-error",
    "Internal server error",
    500,
    "internal_error",
    "An unexpected error occurred. Please try again later.",
  );
}
