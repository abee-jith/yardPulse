import { createHash } from "node:crypto";
import { CreateAppointmentInput } from "./appointment.schema";
import { createAppointmentTransaction } from "./appointment.repository";
import { findUserById } from "../user/user.repository";
import { entityNotFoundError, parseErrorRespose } from "../../utils/helper";

const DUBAI_TIME_ZONE = "Asia/Dubai";

function getDubaiHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DUBAI_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === "hour")?.value);
}

function isExactHour(date: Date): boolean {
  return (
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export async function createAppointment({
  input,
  idempotencyKey,
  user,
}: {
  input: CreateAppointmentInput;
  idempotencyKey: string;
  user: ReqUser;
}) {
  try {
    const slotStart = new Date(input.slot_start);
    const now = new Date();

    const fetchedUser = await findUserById(user.id);
    if (!fetchedUser) return entityNotFoundError("User");

    if (Number.isNaN(slotStart.getTime())) {
      return {
        type: "https://yardpulse.test/problems/validation-failed",
        title: "Invalid appointment slot",
        status: 400,
        code: "validation_failed",
        detail: "slot_start must be a valid ISO 8601 timestamp.",
      };
    }

    const dubaiHour = getDubaiHour(slotStart);

    // Assessment slot hours: 06:00 through 21:00 Dubai time.
    if (
      !isExactHour(slotStart) ||
      dubaiHour < 6 ||
      dubaiHour > 21 ||
      slotStart <= now
    ) {
      return {
        type: "https://yardpulse.test/problems/validation-failed",
        title: "Invalid appointment slot",
        status: 400,
        code: "validation_failed",
        detail:
          "slot_start must be a future, on-the-hour slot between 06:00 and 21:00 Dubai time.",
      };
    }

    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          container_no: input.container_no,
          slot_start: slotStart.toISOString(),
          truck_plate: input.truck_plate,
        }),
      )
      .digest("hex");

    return await createAppointmentTransaction({
      user: fetchedUser,
      containerNo: input.container_no,
      slotStart,
      truckPlate: input.truck_plate,
      idempotencyKey,
      requestHash,
    });
  } catch (error) {
    return parseErrorRespose({ error, message: "Create appointment error" });
  }
}
