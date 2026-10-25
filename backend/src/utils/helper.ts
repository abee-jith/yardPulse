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
    type: `https://yardpulse.test/problems/entity-not-found/${entity.toLowerCase()}`,
    title: "Entity not found",
    status: 404,
    code: "entity_not_found",
    detail: `${entity} not found`,
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

  // Handle database unique constraint violation errors
  // Unused for now, but can be used in future for more specific error handling
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
          `https://yardpulse.test/problems/duplicate-entry/${entity.toLowerCase()}`,
          "Duplicate entry",
          409,
          "duplicate_entry",
          `${entity} with ${formattedField.toLowerCase()} already exists`,
        );
      }
    }
  }

  env.nodeEnv === "development" && console.error(message, error);
  return createResponse(
    "https://yardpulse.test/problems/server-errors",
    "Internal server error",
    500,
    "internal_error",
    "An unexpected error occurred. Please try again later.",
  );
}
