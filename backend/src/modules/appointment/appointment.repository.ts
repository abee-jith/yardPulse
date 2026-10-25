import { AppDataSource } from "../../config/database";
import { Appointment } from "./entities/appointment.entity";
import { Container } from "../container/entities/container.entity";
import { Hold } from "../container/entities/hold.entity";
import { IdempotencyRecord } from "./entities/idempotency-record.entity";
import {
  APPOINTMENT_STATUS,
  CONTAINER_EVENT_TYPE,
  CONTAINER_STATUS,
  USER_ROLE,
} from "../../common/enum";
import { EntityManager } from "typeorm";
import { User } from "../user/entities/user.entity";
import { ContainerEvent } from "../container/entities/event.entity";
import { env } from "../../config/env";
import { DateTime } from "luxon";

export async function createAppointmentTransaction({
  user,
  containerNo,
  slotStart,
  truckPlate,
  idempotencyKey,
  requestHash,
}: {
  user: User;
  containerNo: string;
  slotStart: Date;
  truckPlate: string;
  idempotencyKey: string;
  requestHash: string;
}) {
  return AppDataSource.transaction(async (manager) => {
    // Serialize simultaneous requests using the same user's idempotency key.
    await manager.query(
      `SELECT pg_advisory_xact_lock(
        hashtextextended($1, 0)
      )`,
      [`appointment-idempotency:${user.id}:${idempotencyKey}`],
    );

    const idempotencyRepository = manager.getRepository(IdempotencyRecord);

    const existing = await idempotencyRepository.findOne({
      where: { user: { id: user.id }, idempotencyKey },
    });

    if (existing) {
      if (existing.requestHash !== requestHash) {
        return {
          status: 422,
          body: {
            type: "https://yardpulse.test/problems/idempotency-key-reused",
            title: "Idempotency key reused",
            status: 422,
            code: "idempotency_key_reused",
            detail:
              "This idempotency key was already used with a different request.",
          },
        };
      }

      if (existing.responseStatus && existing.responseBody) {
        return {
          status: existing.responseStatus,
          body: existing.responseBody,
        };
      }
    }

    const record =
      existing ??
      idempotencyRepository.create({
        user,
        idempotencyKey,
        requestHash,
      });

    // Cache business responses as well as successful responses.
    // Returning normally commits the idempotency record.
    const finish = async (status: number, body: Record<string, unknown>) => {
      record.requestHash = requestHash;
      record.responseStatus = status;
      record.responseBody = body;
      await idempotencyRepository.save(record);
      return { status, body };
    };

    const containerQuery = manager
      .getRepository(Container)
      .createQueryBuilder("container")
      .where("container.containerNo = :containerNo", { containerNo });

    if (user.role !== USER_ROLE.OPERATOR) {
      containerQuery.andWhere("container.lineCode = :lineCode", {
        lineCode: user.lineCode,
      });
    }

    const container = await containerQuery
      .setLock("pessimistic_write")
      .getOne();

    // A different line's container must not be disclosed.
    if (!container) {
      return finish(404, {
        type: "https://yardpulse.test/problems/not-found",
        title: "Container not found",
        status: 404,
        code: "not_found",
        detail: "Container not found.",
      });
    }

    if (container.status !== CONTAINER_STATUS.IN_YARD) {
      return finish(409, {
        type: "https://yardpulse.test/problems/container-not-eligible",
        title: "Container not eligible",
        status: 409,
        code: "container_not_eligible",
        detail: "The container is not eligible for an appointment.",
      });
    }

    const hasActiveHold = await manager
      .getRepository(Hold)
      .createQueryBuilder("hold")
      .where("hold.container_id = :containerId", {
        containerId: container.id,
      })
      .andWhere("hold.released_at IS NULL")
      .getExists();

    if (hasActiveHold) {
      return finish(409, {
        type: "https://yardpulse.test/problems/container-not-eligible",
        title: "Container not eligible",
        status: 409,
        code: "container_not_eligible",
        detail: "The container has an active hold.",
      });
    }

    const existingAppointment = await manager
      .getRepository(Appointment)
      .findOne({
        where: {
          container: { id: container.id },
          status: APPOINTMENT_STATUS.BOOKED,
        },
      });

    if (existingAppointment) {
      return finish(409, {
        type: "https://yardpulse.test/problems/appointment-exists",
        title: "Appointment already exists",
        status: 409,
        code: "appointment_exists",
        detail: "The container already has an active appointment.",
      });
    }

    // Serialize capacity checks for the same slot.
    await manager.query(
      `SELECT pg_advisory_xact_lock(
        hashtextextended($1, 0)
      )`,
      [`appointment-slot:${slotStart.toISOString()}`],
    );

    const slotCount = await manager.getRepository(Appointment).count({
      where: {
        slotStart,
        status: APPOINTMENT_STATUS.BOOKED,
      },
    });

    const capacity = env.slotCapacity;

    if (slotCount >= capacity) {
      return finish(409, {
        type: "https://yardpulse.test/problems/slot-full",
        title: "Slot is full",
        status: 409,
        code: "slot_full",
        detail: `The ${DateTime.fromJSDate(slotStart)
          .setZone("Asia/Dubai")
          .toFormat("yyyy-MM-dd'T'HH:mmZZ")} slot has no remaining capacity.`,
      });
    }

    const appointment = manager.getRepository(Appointment).create({
      container: { id: container.id },
      user: { id: user.id },
      slotStart,
      truckPlate,
      status: APPOINTMENT_STATUS.BOOKED,
    });

    const savedAppointment = await manager
      .getRepository(Appointment)
      .save(appointment);

    await manager.getRepository(ContainerEvent).save(
      manager.getRepository(ContainerEvent).create({
        container: { id: container.id },
        eventType: CONTAINER_EVENT_TYPE.APPOINTMENT_BOOKED,
        occurredAt: new Date(),
        details: {
          appointment_id: savedAppointment.id,
          slot_start: savedAppointment.slotStart.toISOString(),
          truck_plate: savedAppointment.truckPlate,
        },
      }),
    );

    return finish(201, {
      status: 201,
      message: "Appointment booked successfully.",
      data: {
        id: savedAppointment.id,
        container_no: container.containerNo,
        slot_start: savedAppointment.slotStart,
        truck_plate: savedAppointment.truckPlate,
        status: savedAppointment.status,
      },
    });
  });
}
