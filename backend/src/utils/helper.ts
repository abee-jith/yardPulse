import { QueryFailedError } from "typeorm";
import { env } from "../config/env";

export const daysAgo = (days: number, hour: number): Date => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

export function entityNotFoundError(entity: String) {
  return {
    status: 404,
    message: `${entity} not found`,
    data: null,
  };
}

export function parseErrorRespose<T extends boolean = false>({
  error,
  message,
  count = false as T,
}: {
  error: unknown;
  message: string;
  count?: T;
}): T extends true ? ServiceResponseWithCount : ServiceResponse {
  const createResponse = (
    status: number,
    responseMessage: string,
  ): ServiceResponse | ServiceResponseWithCount => ({
    status,
    message: responseMessage,
    data: null,
    ...(count ? { count: null } : {}),
  });

  if (error instanceof QueryFailedError) {
    const driverError = error.driverError as DriveError;

    if (driverError.code === "23505" && driverError.detail) {
      const match = driverError.detail.match(
        /Key \(([^)]+)\)=\(([^)]+)\) already exists\./,
      );

      if (match) {
        const [, field] = match;

        const entity = driverError.table
          ? driverError.table
              .replace(/_/g, " ")
              .replace(/\b\w/g, (char) => char.toUpperCase())
          : "Record";

        const formattedField = field
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return createResponse(
          409,
          `${entity} with ${formattedField.toLowerCase()} already exists`,
        ) as T extends true ? ServiceResponseWithCount : ServiceResponse;
      }
    }
  }

  env.nodeEnv === "development" && console.error(message, error);
  return createResponse(500, "Internal server error") as T extends true
    ? ServiceResponseWithCount
    : ServiceResponse;
}
