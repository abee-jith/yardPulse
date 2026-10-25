import "dotenv/config";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import type { Express } from "express";
import type { DataSource } from "typeorm";
import supertest from "supertest";
import { APPOINTMENT_STATUS, CONTAINER_STATUS } from "../src/common/enum";

const testSchema = process.env.TEST_DB_SCHEMA ?? `yardpulse_test_${process.pid}`;
if (!/^yardpulse_test_[a-z0-9_]+$/.test(testSchema)) {
  throw new Error("TEST_DB_SCHEMA must start with yardpulse_test_ and use lowercase letters, digits, and underscores.");
}

process.env.DB_SCHEMA = testSchema;
process.env.SLOT_CAPACITY = "1";
process.env.NODE_ENV = "development";
process.env.JWT_EXPIRES_IN = "1h";

let app: Express;
let request: typeof supertest;
let dataSource: DataSource | undefined;
let operatorToken: string;
let aliceToken: string;

function slotStart(daysAhead: number, hour: number, minute = 0): string {
  return DateTime.now()
    .setZone("Asia/Dubai")
    .plus({ days: daysAhead })
    .set({ hour, minute, second: 0, millisecond: 0 })
    .toISO({ includeOffset: true })!;
}

async function login(
  agent: typeof supertest,
  email: string,
  password: string,
): Promise<string> {
  const response = await agent(app).post("/api/v1/auth/login").send({
    email,
    password,
  });
  expect(response.status).toBe(200);
  return response.body.data.accessToken as string;
}

describe("YardPulse PostgreSQL API integration", () => {
  beforeAll(async () => {
    const [database, application, entities, initialMigration] = await Promise.all([
      import("../src/config/database"),
      import("../src/app"),
      Promise.all([
        import("../src/modules/user/entities/user.entity"),
        import("../src/modules/user/entities/refreshtoken.entity"),
        import("../src/modules/container/entities/container.entity"),
        import("../src/modules/container/entities/vessel-visit.entity"),
        import("../src/modules/container/entities/hold.entity"),
        import("../src/modules/container/entities/event.entity"),
        import("../src/modules/appointment/entities/appointment.entity"),
        import("../src/modules/appointment/entities/idempotency-record.entity"),
      ]),
      import("../src/migrations/InitialYardPulseSchema1761411600000"),
    ]);
    request = supertest;
    app = application.default;
    dataSource = database.AppDataSource;
    dataSource.setOptions({
      entities: entities.map((module) => Object.values(module)[0]),
      migrations: [initialMigration.InitialYardPulseSchema1761411600000],
    });
    await database.initializeDatabase();

    const [
      { seedUsers },
      { seedVesselVisits },
      { seedContainers },
      { seedHolds },
      { seedContainerEvents },
    ] = await Promise.all([
      import("../seeders/user.seeder"),
      import("../seeders/vessel-visit.seeder"),
      import("../seeders/container.seder"),
      import("../seeders/hold.seeder"),
      import("../seeders/constainer-event.seeder"),
    ]);
    await seedUsers(dataSource);
    await seedVesselVisits(dataSource);
    await seedContainers(dataSource);
    await seedHolds(dataSource);
    await seedContainerEvents(dataSource);

    operatorToken = await login(request, "ops@yardpulse.test", "Operator#2026");
    aliceToken = await login(request, "alice@atlasline.test", "Customer#2026");
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      const escapedSchema = testSchema.replace(/"/g, '""');
      await dataSource.query(`DROP SCHEMA IF EXISTS "${escapedSchema}" CASCADE`);
      await dataSource.destroy();
    }
  });

  it("replays an idempotent booking without creating a second appointment", async () => {
    const key = randomUUID();
    const body = {
      container_no: "ALNU1234567",
      slot_start: slotStart(1, 6),
      truck_plate: "DXB-12345",
    };

    const first = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send(body);
    const replay = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send(body);

    expect(first.status).toBe(201);
    expect(replay.status).toBe(first.status);
    expect(replay.body).toEqual(first.body);
    expect(await dataSource!.getRepository("appointments").count()).toBe(1);

    const detail = await request(app)
      .get("/api/v1/containers/ALNU1234567")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.appointments).toHaveLength(1);
    expect(detail.body.data.events[0].eventType).toBe("APPOINTMENT_BOOKED");

    const changedBody = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", key)
      .send({ ...body, truck_plate: "DXB-54321" });
    expect(changedBody.status).toBe(422);
    expect(changedBody.body.code).toBe("idempotency_key_reused");
    expect(changedBody.headers["content-type"]).toContain("application/problem+json");
    expect(changedBody.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      status: 422,
      detail: expect.any(String),
    });
  });

  it("allows exactly one of ten parallel bookings when a slot has one seat", async () => {
    const { Container } = await import("../src/modules/container/entities/container.entity");
    const containers = await dataSource!.getRepository(Container).find({
      where: { status: CONTAINER_STATUS.IN_YARD },
      relations: { holds: true, appointments: true },
      order: { id: "ASC" },
    });
    const eligible = containers.filter(
      (container) =>
        !container.holds.some((hold) => hold.releasedAt === null) &&
        !container.appointments.some(
          (appointment) => appointment.status === APPOINTMENT_STATUS.BOOKED,
        ),
    );
    expect(eligible.length).toBeGreaterThanOrEqual(10);

    const slot = slotStart(1, 7);
    const responses = await Promise.all(
      eligible.slice(0, 10).map((container) =>
        request(app)
          .post("/api/v1/appointments")
          .set("Authorization", `Bearer ${operatorToken}`)
          .set("Idempotency-Key", randomUUID())
          .send({
            container_no: container.containerNo,
            slot_start: slot,
            truck_plate: `T-${container.id}`,
          }),
      ),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    const fullSlotResponses = responses.filter((response) => response.status === 409);
    expect(fullSlotResponses).toHaveLength(9);
    expect(fullSlotResponses.every((response) => response.body.code === "slot_full")).toBe(true);
    expect(fullSlotResponses[0].headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(fullSlotResponses[0].body).toMatchObject({
      type: "https://yardpulse.test/problems/slot-full",
      title: "Slot is full",
      status: 409,
      code: "slot_full",
      detail: expect.any(String),
    });
  });

  it("returns 404 when a customer requests another line's container", async () => {
    const response: supertest.Response = await request(app)
      .get("/api/v1/containers/BRLU0000017")
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body.code).toBe("not_found");
    expect(response.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      status: 404,
      detail: expect.any(String),
    });
  });

  it("returns the same problem shape for unauthenticated requests", async () => {
    const response = await request(app).get("/api/v1/me");
    expect(response.status).toBe(401);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      status: 401,
      code: "unauthenticated",
      detail: expect.any(String),
    });
  });

  it("seeds fixed-container timestamps in Dubai local time", async () => {
    const { Container } = await import("../src/modules/container/entities/container.entity");
    const container = await dataSource!.getRepository(Container).findOneByOrFail({
      containerNo: "ALNU1234567",
    });
    const seededTime = DateTime.fromJSDate(container.dischargedAt!).setZone(
      "Asia/Dubai",
    );
    const expectedDate = DateTime.now()
      .setZone("Asia/Dubai")
      .minus({ days: 2 })
      .toISODate();

    expect(seededTime.toISODate()).toBe(expectedDate);
    expect(seededTime.hour).toBe(10);
    expect(seededTime.minute).toBe(0);
  });

  it("paginates a customer's scoped list without duplicates and filters active holds", async () => {
    const seen = new Set<number>();
    let cursor: string | null = null;
    do {
      const response: supertest.Response = await request(app)
        .get("/api/v1/containers")
        .query({ limit: 3, ...(cursor ? { cursor } : {}) })
        .set("Authorization", `Bearer ${aliceToken}`);
      expect(response.status).toBe(200);
      for (const container of response.body.data) {
        expect(container.line_code).toBe("ALN");
        seen.add(container.id);
      }
      cursor = response.body.page.next_cursor;
    } while (cursor);
    expect(seen.size).toBe(10);

    const operatorList = await request(app)
      .get("/api/v1/containers")
      .query({ limit: 100 })
      .set("Authorization", `Bearer ${operatorToken}`);
    expect(operatorList.status).toBe(200);
    expect(operatorList.body.data).toHaveLength(30);

    const withoutHolds = await request(app)
      .get("/api/v1/containers")
      .query({ has_active_hold: "false" })
      .set("Authorization", `Bearer ${aliceToken}`);
    expect(withoutHolds.status).toBe(200);
    expect(
      withoutHolds.body.data.some(
        (container: { container_no: string }) =>
          container.container_no === "ALNU7654321",
      ),
    ).toBe(false);
  });

  it("returns RFC 9457 validation problems for missing keys and off-hour slots", async () => {
    const missingKey = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        container_no: "ALNU1234567",
        slot_start: slotStart(1, 8),
        truck_plate: "DXB-12345",
      });
    expect(missingKey.status).toBe(400);
    expect(missingKey.headers["content-type"]).toContain("application/problem+json");
    expect(missingKey.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      status: 400,
      code: "validation_failed",
      detail: expect.any(String),
    });
    expect(missingKey.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "Idempotency-Key" }),
      ]),
    );

    const offHour = await request(app)
      .post("/api/v1/appointments")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", randomUUID())
      .send({
        container_no: "ALNU7654321",
        slot_start: slotStart(1, 9, 30),
        truck_plate: "DXB-12345",
      });
    expect(offHour.status).toBe(400);
    expect(offHour.body.code).toBe("validation_failed");
    expect(offHour.body.errors).toContainEqual(
      expect.objectContaining({ field: "slot_start", message: expect.any(String) }),
    );
  });

  it("serializes simultaneous bookings for the same container in different slots", async () => {
    const { Container } = await import("../src/modules/container/entities/container.entity");
    const candidates = await dataSource!.getRepository(Container).find({
      where: { status: CONTAINER_STATUS.IN_YARD },
      relations: { holds: true, appointments: true },
      order: { id: "ASC" },
    });
    const candidate = candidates.find(
      (container) =>
        !container.holds.some((hold) => hold.releasedAt === null) &&
        !container.appointments.some(
          (appointment) => appointment.status === APPOINTMENT_STATUS.BOOKED,
        ),
    );
    expect(candidate).toBeDefined();

    const firstSlot = slotStart(2, 10);
    const secondSlot = slotStart(2, 11);
    const responses = await Promise.all([
      request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${operatorToken}`)
        .set("Idempotency-Key", randomUUID())
        .send({
          container_no: candidate!.containerNo,
          slot_start: firstSlot,
          truck_plate: "DXB-10101",
        }),
      request(app)
        .post("/api/v1/appointments")
        .set("Authorization", `Bearer ${operatorToken}`)
        .set("Idempotency-Key", randomUUID())
        .send({
          container_no: candidate!.containerNo,
          slot_start: secondSlot,
          truck_plate: "DXB-20202",
        }),
    ]);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(
      responses.some((response) => response.body.code === "appointment_exists"),
    ).toBe(true);
  });
});
