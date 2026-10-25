import { DateTime } from "luxon";

export const TERMINAL_ZONE = "Asia/Dubai";
export const SLOT_CAPACITY = 20;

export class AppointmentError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppointmentError";
  }
}

export function validateSlotStart(
  input: string,
  isPublicHoliday: boolean,
  now = DateTime.now().setZone(TERMINAL_ZONE),
): DateTime {
  // Require an explicit timezone, such as Z or +04:00.
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(input)) {
    throw new AppointmentError(
      422,
      "invalid_slot_start",
      "slot_start must include a timezone offset.",
    );
  }

  const parsed = DateTime.fromISO(input, { setZone: true });

  if (!parsed.isValid) {
    throw new AppointmentError(
      422,
      "invalid_slot_start",
      "slot_start must be a valid ISO 8601 timestamp.",
    );
  }

  const slot = parsed.setZone(TERMINAL_ZONE);
  const current = now.setZone(TERMINAL_ZONE);

  if (slot < current.plus({ hours: 2 })) {
    throw new AppointmentError(
      422,
      "booking_too_soon",
      "Appointments must be booked at least 2 hours ahead.",
    );
  }

  if (slot > current.plus({ days: 7 })) {
    throw new AppointmentError(
      422,
      "booking_too_far_ahead",
      "Appointments can only be booked up to 7 days ahead.",
    );
  }

  if (slot.minute !== 0 || slot.second !== 0 || slot.millisecond !== 0) {
    throw new AppointmentError(
      422,
      "invalid_slot_start",
      "Appointments must start on the hour.",
    );
  }

  if (slot.hour < 6 || slot.hour > 21) {
    throw new AppointmentError(
      422,
      "slot_outside_gate_hours",
      "Slots must start between 06:00 and 21:00 terminal time.",
    );
  }

  const fridaySchedule = slot.weekday === 5 || isPublicHoliday;

  if (fridaySchedule && slot.hour >= 12 && slot.hour < 14) {
    throw new AppointmentError(
      422,
      "slot_unavailable",
      "No appointment slots are offered between 12:00 and 14:00 on Fridays or public holidays.",
    );
  }

  return slot;
}
